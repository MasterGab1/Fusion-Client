const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const yauzl = require('yauzl');
const runtime = require('./runtime/manifest.json');
const API = 'https://api.modrinth.com/v2';
const MB = 1024 * 1024;
const HEADERS = { 'User-Agent': 'MasterGab1/Fusion-Client (modpack installer)' };
const hosts = new Set(['cdn.modrinth.com','github.com','raw.githubusercontent.com','gitlab.com','release-assets.githubusercontent.com','objects.githubusercontent.com']);
function safeUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !hosts.has(url.hostname) || url.port || url.username || url.password) throw new Error('This pack uses an unsupported download host.');
  return url.href;
}
function safePath(value) {
  if (typeof value !== 'string' || value.length > 220 || /[\\:\x00-\x1f<>"|?*]/.test(value) || value.split('/').some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p) || /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(p))) throw new Error('The pack contains an unsafe file path.');
  return value;
}
function identifier(value) { if(typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value))throw new Error('Invalid pack identifier.');return value; }
function parseIndex(index) {
  if (index?.formatVersion !== 1 || index.game !== 'minecraft' || typeof index.name !== 'string' || !index.name.trim() || !Array.isArray(index.files) || index.files.length > 4000) throw new Error('Unsupported or invalid .mrpack manifest.');
  const deps = index.dependencies || {}, version = deps.minecraft;
  if (!runtime.versions.includes(version)) throw new Error(`Minecraft ${version || 'version'} is outside Fusion’s current version list.`);
  if (Object.keys(deps).some(k => !['minecraft','fabric-loader','forge'].includes(k))) throw new Error('This pack requires an unsupported loader. Fabric and Forge packs are supported.');
  const loader = deps['fabric-loader'] ? 'fabric' : deps.forge ? 'forge' : null;
  if (!loader || (deps['fabric-loader'] && deps.forge) || !runtime.loaders[loader].includes(version)) throw new Error('This pack has no compatible Fusion loader profile.');
  const loaderVersion = deps['fabric-loader'] || deps.forge;
  if (typeof loaderVersion !== 'string' || !/^\d+(?:\.\d+){1,3}$/.test(loaderVersion)) throw new Error('The pack has an unsupported loader version.');
  let total = 0, optional = 0; const seen = new Set(), files = [];
  for(const file of index.files) {
    safePath(file.path);
    const key = file.path.toLowerCase();if(seen.has(key))throw new Error('The pack contains duplicate file destinations.');seen.add(key);
    if(file.env?.client && !['required','optional','unsupported'].includes(file.env.client))throw new Error('Invalid client requirement in pack.');
    if(file.env?.client === 'unsupported')continue;
    if(file.env?.client === 'optional'){optional++;continue;}
    if(!Number.isSafeInteger(file.fileSize) || file.fileSize < 0 || file.fileSize > 512*MB || !/^[a-f0-9]{128}$/i.test(file.hashes?.sha512 || '') || !Array.isArray(file.downloads) || !file.downloads.length)throw new Error('The pack contains an unverifiable download.');
    const downloads=file.downloads.slice(0,5).map(safeUrl);total+=file.fileSize;
    if(total>4*1024*MB)throw new Error('This pack exceeds the 4 GB download limit.');
    files.push({path:file.path,size:file.fileSize,sha512:file.hashes.sha512.toLowerCase(),downloads});
  }
  return {name:index.name.trim().slice(0,100),release:String(index.versionId||'').slice(0,100),summary:String(index.summary||'').slice(0,400),version,loader,loaderVersion,files,optional,totalBytes:total};
}
function archiveEntries(bytes) {
  if(bytes.length>64*MB)throw new Error('Choose a .mrpack archive smaller than 64 MB.');
  return new Promise((resolve,reject)=>yauzl.fromBuffer(bytes,{lazyEntries:true,strictFileNames:true},(error,zip)=>{
    if(error)return reject(new Error('The .mrpack archive could not be opened.'));
    const entries=new Map();let total=0,count=0,finished=false;
    const fail=e=>{if(finished)return;finished=true;zip.close();reject(e);};zip.on('error',fail);
    zip.on('entry',entry=>{
      try {
        if(++count>8000)throw new Error('Too many files in modpack archive.');
        const directory=entry.fileName.endsWith('/');safePath(directory?entry.fileName.slice(0,-1):entry.fileName);
        if(((entry.externalFileAttributes>>>16)&0xf000)===0xa000)throw new Error('Links are not allowed in modpacks.');
        if(directory){zip.readEntry();return;}
        total+=entry.uncompressedSize;
        if(entry.uncompressedSize>64*MB || total>256*MB)throw new Error('Modpack archive expands beyond supported limits.');
        const key=entry.fileName.toLowerCase();if(entries.has(key))throw new Error('Duplicate archive paths.');
        // Only the manifest and client configuration layers are needed.
        if(entry.fileName!=='modrinth.index.json'&&!/^(overrides|client-overrides)\//.test(entry.fileName)){entries.set(key,null);zip.readEntry();return;}
        zip.openReadStream(entry,(err,stream)=>{
          if(err)return fail(err);const chunks=[];let length=0;
          stream.on('data',chunk=>{length+=chunk.length;if(length>entry.uncompressedSize){stream.destroy();fail(new Error('Invalid archive size.'));}else chunks.push(chunk);});
          stream.on('error',fail);stream.on('end',()=>{if(finished)return;entries.set(key,{name:entry.fileName,bytes:Buffer.concat(chunks)});zip.readEntry();});
        });
      }catch(e){fail(e);}
    });zip.on('end',()=>{if(!finished){finished=true;resolve([...entries.values()].filter(Boolean));}});zip.readEntry();
  }));
}
class Modpacks {
  constructor(root,{fetcher=fetch,emit=()=>{}}={}){this.directory=path.join(root,'packs');this.fetcher=fetcher;this.emit=emit;this.plans=new Map();this.busy=false;}
  async json(route){const response=await this.fetcher(API+route,{headers:HEADERS,signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error(`Modpack service returned ${response.status}. Retry shortly.`);return response.json();}
  async bytes(url,limit,sha512,expectedSize,destination){
    let response;
    for(let i=0;i<6;i++) {
      url=safeUrl(url);response=await this.fetcher(url,{headers:HEADERS,redirect:'manual',signal:AbortSignal.timeout(120000)});
      if([301,302,303,307,308].includes(response.status)){const next=response.headers.get('location');await response.body?.cancel();if(!next)throw new Error('Invalid pack redirect.');url=new URL(next,url).href;continue;}break;
    }
    if(!response?.ok)throw new Error('A pack file could not be downloaded.');
    const chunks=[],hash=createHash('sha512');let length=0,handle;
    try {
      if(destination)handle=await fs.open(destination,'w');
      for await(const chunk of response.body){length+=chunk.length;if(length>limit)throw new Error('A pack file exceeded its declared size.');hash.update(chunk);if(handle)await handle.writeFile(chunk);else chunks.push(chunk);}
      if(expectedSize!==undefined&&length!==expectedSize)throw new Error('Modpack file size does not match.');
      if(sha512&&hash.digest('hex')!==sha512.toLowerCase())throw new Error('Modpack file checksum does not match.');
      return destination ? true : Buffer.concat(chunks);
    }finally{await handle?.close();}
  }
  async search({version,query='',offset=0}){
    if(!runtime.versions.includes(version)||typeof query!=='string'||query.length>100||!Number.isSafeInteger(offset)||offset<0||offset>10000)throw new Error('Invalid pack search.');
    const data=await this.json('/search?'+new URLSearchParams({query,index:'downloads',limit:'12',offset:String(offset),facets:JSON.stringify([['project_type:modpack'],['versions:'+version],['categories:fabric','categories:forge']])}));
    return {total:data.total_hits,hits:data.hits.map(p=>({id:p.project_id,name:p.title,description:p.description,author:p.author,icon:p.icon_url?.startsWith('https://cdn.modrinth.com/')?p.icon_url:null,downloads:p.downloads}))};
  }
  async preview(bytes,source={}){
    const entries=await archiveEntries(bytes),manifest=entries.find(e=>e.name==='modrinth.index.json');if(!manifest)throw new Error('No modrinth.index.json was found in this archive.');
    if(manifest.bytes.length>4*MB)throw new Error('Pack manifest is too large.');
    let index;try{index=JSON.parse(manifest.bytes.toString('utf8'));}catch{throw new Error('Invalid modpack manifest JSON.');}
    const info=parseIndex(index),token=randomUUID();
    const overrides=entries.filter(e=>/^(overrides|client-overrides)\//.test(e.name));
    for(const entry of overrides)safePath(entry.name.slice(entry.name.indexOf('/')+1));
    for(const [key,value]of this.plans)if(Date.now()-value.created>600000)this.plans.delete(key);
    // One pending archive limits retained compressed/expanded data.
    this.plans.clear();this.plans.set(token,{...info,overrides,source,created:Date.now()});
    return {...info,files:info.files.map(f=>({path:f.path,size:f.size})),token,overrideCount:overrides.length};
  }
  async plan({projectId,version}){
    identifier(projectId);if(!runtime.versions.includes(version))throw new Error('Unsupported Minecraft release.');
    if(this.busy)throw new Error('Wait for the pack installation to finish.');
    const [project,versions]=await Promise.all([this.json('/project/'+projectId),this.json('/project/'+projectId+'/version?'+new URLSearchParams({game_versions:JSON.stringify([version]),loaders:JSON.stringify(['fabric','forge'])}))]);
    if(project.project_type!=='modpack')throw new Error('Choose a modpack.');
    const release=versions.filter(v=>v.game_versions.includes(version)&&v.loaders.some(l=>['fabric','forge'].includes(l))).sort((a,b)=>Date.parse(b.date_published)-Date.parse(a.date_published))[0];
    const file=release?.files.find(f=>f.primary&&f.filename.endsWith('.mrpack'))||release?.files.find(f=>f.filename.endsWith('.mrpack'));
    if(!file||!Number.isSafeInteger(file.size)||file.size<1||file.size>64*MB||!/^[a-f0-9]{128}$/i.test(file.hashes?.sha512||''))throw new Error('No compatible, verifiable pack archive was found.');
    const plan=await this.preview(await this.bytes(file.url,64*MB,file.hashes.sha512,file.size),{projectId,versionId:release.id,icon:project.icon_url?.startsWith('https://cdn.modrinth.com/')?project.icon_url:null});
    if(plan.version!==version){this.plans.delete(plan.token);throw new Error('The pack manifest does not match the selected Minecraft release.');}return plan;
  }
  async list(){
    const items=[];for(const name of await fs.readdir(this.directory).catch(e=>{if(e.code==='ENOENT')return [];throw e;})){if(!/^[a-f0-9-]{36}$/.test(name))continue;try{items.push(await this.read(name));}catch{}}
    return items.sort((a,b)=>b.created.localeCompare(a.created));
  }
  async read(id){
    if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw new Error('Invalid installed pack.');
    const info=JSON.parse(await fs.readFile(path.join(this.directory,id,'fusion-pack.json'),'utf8'));
    if(info.id!==id||!runtime.versions.includes(info.version)||!runtime.loaders[info.loader]?.includes(info.version)||!/^\d+(?:\.\d+){1,3}$/.test(info.loaderVersion))throw new Error('Invalid installed pack metadata.');
    return {...info,gamePath:path.join(this.directory,id,'game')};
  }
  async install(token){
    if(this.busy)throw new Error('Another pack is being installed.');const plan=this.plans.get(token);
    if(!plan||Date.now()-plan.created>600000)throw new Error('Pack preview expired. Open it again.');
    this.busy=true;const id=randomUUID(),stage=path.join(this.directory,'.stage-'+id),destination=path.join(this.directory,id),game=path.join(stage,'game');
    try {
      await fs.mkdir(game,{recursive:true});let cursor=0,complete=0,failure;
      const worker=async()=>{while(!failure&&cursor<plan.files.length){const file=plan.files[cursor++];try{
        const out=path.join(game,...file.path.split('/'));await fs.mkdir(path.dirname(out),{recursive:true});
        let downloaded=false,error;for(const url of file.downloads){try{await this.bytes(url,file.size,file.sha512,file.size,out);downloaded=true;break;}catch(e){error=e;}}if(!downloaded)throw error;
        this.emit('pack-progress',{name:path.basename(file.path),complete:++complete,total:plan.files.length});
      }catch(e){failure=e;}}};
      await Promise.all(Array.from({length:4},worker));if(failure)throw failure;
      for(const prefix of ['overrides/','client-overrides/'])for(const entry of plan.overrides.filter(e=>e.name.startsWith(prefix))){const out=path.join(game,...safePath(entry.name.slice(prefix.length)).split('/'));await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,entry.bytes);}
      const info={id,name:plan.name,release:plan.release,version:plan.version,loader:plan.loader,loaderVersion:plan.loaderVersion,fileCount:plan.files.length,created:new Date().toISOString(),...plan.source};
      await fs.writeFile(path.join(stage,'fusion-pack.json'),JSON.stringify(info,null,2));await fs.rename(stage,destination);this.plans.delete(token);return this.read(id);
    }finally{
      // Only remove the staging directory constructed from this operation's UUID.
      if(path.dirname(path.resolve(stage))!==path.resolve(this.directory))throw new Error('Invalid staging directory.');
      try{await fs.rm(stage,{recursive:true,force:true});}finally{this.busy=false;}
    }
  }
}
module.exports={Modpacks,parseIndex,safePath,safeUrl,archiveEntries};
