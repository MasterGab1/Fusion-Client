const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');
const {saveInstallation}=require('../electron/official-launcher.cjs');
test('official-launcher installation preserves other profiles and does not import accounts',async t=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'fusion-official-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const source={profiles:{existing:{name:'My survival world',gameDir:'D:/Worlds'}},selectedProfile:'existing',clientToken:'untouched'};
 const file=path.join(directory,'launcher_profiles.json');await fs.writeFile(file,JSON.stringify(source));
 await fs.writeFile(path.join(directory,'launcher_accounts.json'),'do not touch');
 const result=await saveInstallation(directory,'1.20.1',{launchMode:'fabric',memory:4,width:1280,height:720},'D:/Fusion data/instances/1.20.1-fabric','D:/Java/bin/java.exe',{jar:'D:/Fusion data/runtime.jar',config:'D:/Fusion data/fusion.properties'},'fabric-loader-0.19.5-1.20.1');
 const saved=JSON.parse(await fs.readFile(file,'utf8'));
 assert.deepEqual(saved.profiles.existing,source.profiles.existing);assert.equal(saved.selectedProfile,'existing');assert.equal(saved.clientToken,'untouched');
 assert.equal(saved.profiles[result.id].gameDir,'D:/Fusion data/instances/1.20.1-fabric');assert.match(saved.profiles[result.id].javaArgs,/"-javaagent:D:\/Fusion data\/runtime.jar=1.20.1"/);assert.match(saved.profiles[result.id].javaArgs,/-Dfusion.loader=fabric/);
 assert.equal((JSON.parse(await fs.readFile(path.join(directory,'versions',result.id,result.id+'.json'),'utf8'))).inheritsFrom,'fabric-loader-0.19.5-1.20.1');
 assert.equal(await fs.readFile(path.join(directory,'launcher_accounts.json'),'utf8'),'do not touch');
 assert.ok((await fs.readdir(directory)).some(f=>f.startsWith('launcher_profiles.json.fusion-backup-')));
 await assert.rejects(saveInstallation(directory,'../escape',{},'',null,null),/Unsupported/);
});
