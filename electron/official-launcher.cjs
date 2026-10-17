const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const runtime = require('./runtime/manifest.json');

// Writes an ordinary installation. Authentication remains entirely inside the
// official launcher; account/token files are never opened or imported by Fusion.
async function saveInstallation(directory, version, settings, gamePath, javaPath, fusionRuntime, parentId = version) {
  if (!runtime.versions.includes(version) || !/^[\w.+-]+$/.test(parentId)) throw new Error('Unsupported installation version.');
  const mode = ['fabric','forge','vanilla','performance'].includes(settings.launchMode) ? settings.launchMode : 'performance';
  const id = `fusion-${version}-${mode}`;
  const files = [];
  for (const name of ['launcher_profiles.json','launcher_profiles_microsoft_store.json']) {
    const file=path.join(directory,name);
    try { const source=await fs.readFile(file,'utf8'); const data=JSON.parse(source); if(!data.profiles || typeof data.profiles!=='object' || Array.isArray(data.profiles))throw new Error('Invalid profiles'); files.push({file,source,data}); }
    catch(e) { if(e.code!=='ENOENT')throw new Error('The Minecraft Launcher installations could not be read. Close it and try again.'); }
  }
  if(!files.length)throw new Error('Open the official Minecraft Launcher once, then return here to prepare Fusion.');
  const folder=path.join(directory,'versions',id); await fs.mkdir(folder,{recursive:true});
  await fs.writeFile(path.join(folder,id+'.json'),JSON.stringify({id,inheritsFrom:parentId,type:'release',time:new Date().toISOString(),releaseTime:new Date().toISOString()},null,2));
  const args=[`-Xmx${settings.memory}G`,'-XX:+UseG1GC'];
  const quoted=value=>{ if(/["\r\n]/.test(value))throw new Error('Installation path contains an unsupported character.');return `"${value}"`; };
  if(fusionRuntime)args.push(quoted(`-javaagent:${fusionRuntime.jar}=${version}`),quoted(`-Dfusion.config=${fusionRuntime.config}`),...(fusionRuntime.library?[quoted(`-Dfusion.library=${fusionRuntime.library}`)]:[]),`-Dfusion.loader=${['fabric','forge'].includes(mode)?mode:'vanilla'}`);
  const name=`Fusion ${version}${['fabric','forge'].includes(mode)?' · '+mode:''}`;
  for(const {file,source,data} of files) {
    // Do not select an account, change the user's current selection, or overwrite
    // any other installation. A concurrent launcher save aborts this operation.
    if(await fs.readFile(file,'utf8')!==source)throw new Error('Minecraft Launcher changed its installations. Close it and retry.');
    await fs.copyFile(file,file+`.fusion-backup-${randomUUID()}`);
    data.profiles[id]={...(data.profiles[id]||{}),name,type:'custom',lastVersionId:id,gameDir:gamePath,javaDir:javaPath,javaArgs:args.join(' '),resolution:{width:settings.width||1280,height:settings.height||720},icon:'Furnace'};
    const temporary=file+'.fusion-'+randomUUID()+'.tmp';
    await fs.writeFile(temporary,JSON.stringify(data,null,2)); await fs.rename(temporary,file);
  }
  return {name,id};
}
async function prepareOfficial({directory,launcher,version,settings,mods}) {
  if(!runtime.versions.includes(version))throw new Error('Choose a supported Minecraft version.');
  // Check before downloading hundreds of MB if the official launcher is absent.
  const exists=await Promise.all(['launcher_profiles.json','launcher_profiles_microsoft_store.json'].map(n=>fs.access(path.join(directory,n)).then(()=>true,()=>false)));
  if(!exists.some(Boolean))throw new Error('Install and open the official Minecraft Launcher once, then return here.');
  if(launcher.busy || launcher.running)throw new Error('Wait for the current game operation to finish.');
  launcher.busy=true;launcher.cancelled=false;
  try {
    const {getManifest}=require('./launcher.cjs'); const {Version}=require('@xmcl/core'); const {installTask}=require('@xmcl/installer');
    const manifest=await getManifest(launcher.root),metadata=manifest.versions.find(v=>v.id===version && v.type==='release');
    if(!metadata)throw new Error('Minecraft version metadata is unavailable.');
    launcher.status('Preparing official launcher installation');
    await launcher.runTask(installTask(metadata,directory,launcher.installerOptions(settings)),'Preparing Minecraft files');
    let resolved=await Version.parse(directory,version); const javaPath=await launcher.javaFor(resolved,settings);
    const community=['fabric','forge'].includes(settings.launchMode);
    if(community)resolved=await require('./loaders.cjs').prepareLoader({version,loader:settings.launchMode,resourcePath:directory,javaPath,settings,launcher});
    const suffix=settings.launchMode==='performance'?'performance':community?settings.launchMode:'';
    const gamePath=path.join(launcher.root,'instances',version+(suffix?'-'+suffix:''));await fs.mkdir(gamePath,{recursive:true});
    const fusionRuntime=await mods.install(version,directory,gamePath,launcher,settings);
    launcher.checkCancelled();
    const result=await saveInstallation(directory,version,settings,gamePath,javaPath,fusionRuntime,resolved.id);
    launcher.status('Installation ready'); return result;
  } finally {launcher.busy=false;if(launcher.downloadAgent){await launcher.downloadAgent.destroy();launcher.downloadAgent=null;}}
}
module.exports={saveInstallation,prepareOfficial};
