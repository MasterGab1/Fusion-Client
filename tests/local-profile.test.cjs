const {test}=require('node:test');const assert=require('node:assert/strict');
const {localSession}=require('../electron/local-profile.cjs');const {defaults,validateSettings}=require('../electron/settings.cjs');
test('local testing identity is explicit, stable and validated',()=>{
  assert.equal(defaults.accountMode,'microsoft');const session=localSession('FusionTester');assert.deepEqual(session,localSession('FusionTester'));assert.match(session.profile.id,/^[a-f0-9]{12}3[a-f0-9]{3}[89ab][a-f0-9]{15}$/);assert.notEqual(session.profile.id,localSession('OtherTester').profile.id);
  for(const name of ['', 'ab','bad name','a'.repeat(17),'../player'])assert.throws(()=>localSession(name));
  assert.equal(validateSettings(defaults,{accountMode:'local'},16).accountMode,'local');assert.throws(()=>validateSettings(defaults,{accountMode:'bad'},16));assert.throws(()=>validateSettings(defaults,{localName:'bad name'},16));
});
test('local launch prepares the real launch options without contacting Microsoft',async()=>{
  const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),Module=require('node:module'),{EventEmitter}=require('node:events');
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'fusion-local-'));const original=Module._load;let launchOptions,verifications=0;
  try{
    await fs.mkdir(path.join(root,'minecraft/versions/1.8.9'),{recursive:true});await fs.writeFile(path.join(root,'minecraft/versions/1.8.9/.fusion-complete'),'yes');
    await fs.writeFile(path.join(root,'versions.json'),JSON.stringify({versions:[{id:'1.8.9',type:'release'}]}));
    Module._load=function(id,...args){if(id==='@xmcl/core')return {Version:{parse:async()=>({id:'1.8.9'})},launch:async options=>{launchOptions=options;return new EventEmitter();}};return original.call(this,id,...args);};
    const {GameLauncher}=require('../electron/launcher.cjs');const launcher=new GameLauncher({root,auth:{verifyForLaunch:async()=>{verifications++;throw Error('Unexpected Microsoft request');}},emit(){},log(){},mods:{install:async()=>({jar:'runtime.jar',config:'config.properties',library:'library.properties'})}});
    launcher.javaFor=async()=>path.join(root,'java.exe');launcher.installerOptions=()=>({});
    await launcher.start('1.8.9',{...defaults,accountMode:'local',localName:'FusionTester'});
    assert.equal(verifications,0);assert.equal(launchOptions.userType,'legacy');assert.equal(launchOptions.accessToken,'0');assert.equal(launchOptions.gameProfile.name,'FusionTester');assert.equal(launcher.running,true);assert.equal(launchOptions.gamePath,path.join(root,'instances/1.8.9-performance'));
  }finally{Module._load=original;await fs.rm(root,{recursive:true,force:true});}
});
