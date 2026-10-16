const {app}=require('electron');const fs=require('fs/promises'),path=require('path'),os=require('os'),assert=require('assert/strict'),crypto=require('crypto');
const {UpdateService}=require('../electron/updates.cjs');const {githubCredential}=require('../electron/github-credential.cjs');
app.getVersion=()=> '0.10.0';
app.whenReady().then(async()=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'fusion-private-update-'));app.setPath('userData',root);const config=path.join(root,'dev-update.yml');await fs.writeFile(config,JSON.stringify({provider:'github',owner:'MasterGab1',repo:'Fusion-Client',private:true,updaterCacheDirName:path.basename(root)}));
const updater=require('electron-updater').autoUpdater;updater.forceDevUpdateConfig=true;updater.updateConfigPath=config;updater.disableDifferentialDownload=true;
const service=new UpdateService({installed:true,version:'0.10.0',createUpdater:()=>updater,getToken:githubCredential,blocked:()=>true,emit:()=>{}});
const checked=await service.check();assert.equal(checked.status,'available',checked.error);assert.equal(checked.version,'0.11.0');console.log('Private update feed authenticated; Fusion 0.11.0 available.');
const result=await service.download();assert.equal(result.status,'ready',result.error);const file=updater.downloadedUpdateHelper.file;const bytes=await fs.readFile(file);const metadata=JSON.parse(await fs.readFile('release-bundle/0.11.0/latest.yml','utf8'));assert.equal(crypto.createHash('sha512').update(bytes).digest('base64'),metadata.sha512);console.log('PASS private updater downloaded '+bytes.length+' bytes and verified the published installer. Installation intentionally not invoked.');
}).then(()=>app.quit()).catch(error=>{console.error(error.message);app.exit(1);});
