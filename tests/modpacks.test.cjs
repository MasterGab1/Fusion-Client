const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{createHash}=require('node:crypto');
const {Modpacks,parseIndex,safePath,safeUrl}=require('../electron/modpacks.cjs');
const data=Buffer.from('fixture mod contents'),hash=createHash('sha512').update(data).digest('hex');
const manifest=()=>({formatVersion:1,game:'minecraft',name:'Fixture pack',versionId:'1.0',dependencies:{minecraft:'1.20.1','fabric-loader':'0.16.10'},files:[{path:'mods/example.jar',hashes:{sha512:hash},fileSize:data.length,downloads:['https://cdn.modrinth.com/fixture.jar']}]});
async function zip(entries){const z=new(require('yazl').ZipFile)();for(const [name,value]of Object.entries(entries))z.addBuffer(Buffer.from(value),name);z.end();const chunks=[];for await(const chunk of z.outputStream)chunks.push(chunk);return Buffer.concat(chunks);}
test('pack paths, hosts, version bounds and client requirements are enforced',()=>{
  for(const p of ['../escape','/absolute','C:/file','mods\\bad.jar','mods/NUL.jar','mods/file.','mods/a/../../escape','mods/a:b','./file'])assert.throws(()=>safePath(p));
  for(const url of ['http://cdn.modrinth.com/a','https://localhost/a','https://cdn.modrinth.com.evil.test/a','https://cdn.modrinth.com:123/a'])assert.throws(()=>safeUrl(url));
  let m=manifest();m.files.push({...m.files[0],path:'mods/optional.jar',env:{client:'optional'}},{...m.files[0],path:'mods/server.jar',env:{client:'unsupported'}});assert.equal(parseIndex(m).files.length,1);assert.equal(parseIndex(m).optional,1);
  m=manifest();m.dependencies.minecraft='1.17.1';assert.throws(()=>parseIndex(m),/current version list/);
  m=manifest();m.dependencies.neoforge='21.1.1';assert.throws(()=>parseIndex(m),/unsupported loader/);
  m=manifest();m.files.push({...m.files[0],path:'MODS/EXAMPLE.JAR'});assert.throws(()=>parseIndex(m),/duplicate/);
});
test('pack install preserves exact files, layers client overrides and isolates instances',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'fusion-pack-'));
  try{
    const service=new Modpacks(root,{fetcher:async()=>new Response(data)}),bytes=await zip({'modrinth.index.json':JSON.stringify(manifest()),'overrides/config/example.json':'base','client-overrides/config/example.json':'client','server-overrides/secret.txt':'server'});
    const plan=await service.preview(bytes);assert.equal(plan.loaderVersion,'0.16.10');assert.equal(plan.overrideCount,2);
    const installed=await service.install(plan.token);assert.equal(await fs.readFile(path.join(installed.gamePath,'config/example.json'),'utf8'),'client');assert.deepEqual(await fs.readFile(path.join(installed.gamePath,'mods/example.jar')),data);await assert.rejects(fs.access(path.join(installed.gamePath,'secret.txt')));
    const again=await service.install((await service.preview(bytes)).token);assert.notEqual(again.gamePath,installed.gamePath);assert.equal((await service.list()).length,2);await assert.rejects(service.read('../escape'));
    const reloaded=await new Modpacks(root).read(installed.id);assert.equal(reloaded.loaderVersion,'0.16.10');
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('bad pack download commits nothing and leaves existing instance untouched',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'fusion-pack-fail-'));
  try{
    const service=new Modpacks(root,{fetcher:async()=>new Response(data)}),bytes=await zip({'modrinth.index.json':JSON.stringify(manifest())});
    const installed=await service.install((await service.preview(bytes)).token);service.fetcher=async()=>new Response(Buffer.alloc(data.length));
    await assert.rejects(service.install((await service.preview(bytes)).token),/checksum/);assert.equal(service.busy,false);assert.equal((await service.list()).length,1);assert.deepEqual(await fs.readFile(path.join(installed.gamePath,'mods/example.jar')),data);assert.equal((await fs.readdir(service.directory)).some(n=>n.startsWith('.stage-')),false);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('archive traversal, duplicate names and untrusted redirects are rejected',async()=>{
  const service=new Modpacks('unused',{fetcher:async()=>new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}})});
  await assert.rejects(service.bytes('https://cdn.modrinth.com/file',100),/unsupported download host/);
  const m=manifest();m.files[0].path='../outside';await assert.rejects(service.preview(await zip({'modrinth.index.json':JSON.stringify(m)})),/unsafe/);
  await assert.rejects(service.preview(await zip({'modrinth.index.json':JSON.stringify(manifest()),'overrides/CON.txt':'bad'})),/unsafe/);
  await assert.rejects(service.preview(await zip({'modrinth.index.json':JSON.stringify(manifest()),'overrides/a':'a','overrides/A':'b'})),/Duplicate/);
});
