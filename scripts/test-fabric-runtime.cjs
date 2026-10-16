const fs=require('node:fs/promises'),path=require('node:path'),{execFileSync,spawnSync}=require('node:child_process');
const {Version,generateArguments}=require('@xmcl/core');
const {GameLauncher}=require('../electron/launcher.cjs');
const {prepareLoader}=require('../electron/loaders.cjs');
(async()=>{
 const version=process.argv[2]||'1.20.1',resourcePath=path.resolve('test-output/downloads/minecraft'),gamePath=path.resolve(`test-output/loader-qa/fabric-${version}${process.argv.some(a=>a.startsWith('--pack='))?'-pack':''}`);
 const loaderVersion=process.argv.find(a=>a.startsWith('--loader='))?.slice(9),packPath=process.argv.find(a=>a.startsWith('--pack='))?.slice(7);
 const launcher=new GameLauncher({root:path.resolve('test-output/downloads'),emit:()=>{},log:()=>{}});
 const settings={downloadThreads:8,verifyFiles:false,memory:2};
 try{
 const vanilla=await Version.parse(resourcePath,version),javaPath=await launcher.javaFor(vanilla,settings);
 const resolved=await prepareLoader({version,loader:'fabric',resourcePath,javaPath,settings,launcher,loaderVersion});
 if(packPath){await fs.mkdir(gamePath,{recursive:true});await fs.cp(packPath,gamePath,{recursive:true});}
 if(process.argv.includes('--community')) {
   const {CommunityMods}=require('../electron/community-mods.cjs');const service=new CommunityMods(path.resolve('test-output/loader-qa/community'));
   if(!(await service.list(version,'fabric')).some(m=>m.projectId==='mOgUt4GM'))await service.install((await service.plan({version,loader:'fabric',projectId:'mOgUt4GM'})).token);
   await fs.mkdir(path.join(gamePath,'mods'),{recursive:true});await fs.cp(service.directory(version,'fabric'),path.join(gamePath,'mods'),{recursive:true});
 }
 const loaderJar=resolved.libraries.find(l=>l.name.startsWith('net.fabricmc:fabric-loader:'));
 const output=path.join(gamePath,'probe-classes');await fs.mkdir(output,{recursive:true});await fs.mkdir(path.join(gamePath,'mods'),{recursive:true});
 execFileSync('javac',['--release','8','-cp',path.join(resourcePath,'libraries',loaderJar.path),'-d',output,path.resolve('scripts/java/FabricProbe.java')],{windowsHide:true});
 await fs.copyFile(`runtime/loader-profiles/fabric/${version}.properties`,path.join(output,'fusion-profile.properties'));
 const bindings=JSON.parse(await fs.readFile(`build/runtime-cache/${version}-fabric-bindings.json`,'utf8'));
 await fs.writeFile(path.join(output,'bindings.tsv'),bindings.map(b=>[b.kind,b.owner,b.name,b.desc].join('\t')).join('\n'));
 await fs.writeFile(path.join(output,'fabric.mod.json'),JSON.stringify({schemaVersion:1,id:'fusion_qa_probe',version:'1.0.0',environment:'client',entrypoints:{preLaunch:['fusion.qa.FabricProbe']}}));
 execFileSync('jar',['cf',path.join(gamePath,'mods','fusion-qa-probe.jar'),'-C',output,'.'],{windowsHide:true});
 const args=await generateArguments({version:resolved,resourcePath,gamePath,javaPath,minMemory:512,maxMemory:2048,accessToken:'unused-prelaunch-probe',gameProfile:{id:'00000000000000000000000000000000',name:'PrelaunchProbe'},userType:'msa'});
 if(args[0]===javaPath)args.shift();
 args.unshift(`-javaagent:${path.resolve('electron/runtime/fusion-runtime.jar')}=${version}`,'-Dfusion.loader=fabric','-Djava.awt.headless=true');
 const result=spawnSync(javaPath,args,{windowsHide:true,encoding:'utf8',timeout:150000,maxBuffer:8*1024*1024});
 await fs.writeFile(path.join(gamePath,'probe.log'),result.stdout+'\n'+result.stderr);
 if(result.status!==0 || !result.stdout.includes('FUSION_FABRIC_PROBE_PASS') || /Could not install|Runtime adapter disabled/.test(result.stdout+result.stderr))throw new Error('Fabric probe failed: '+(result.stderr||result.stdout).slice(-3000));
 console.log(`PASS ${version}: real Fabric loader + Fusion hooks + generated menu (no game window)`);
 }finally{if(launcher.downloadAgent)await launcher.downloadAgent.destroy();}
})().catch(e=>{console.error(e);process.exitCode=1;});
