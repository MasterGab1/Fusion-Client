const fs=require('node:fs/promises'),path=require('node:path'),{execFileSync,spawnSync}=require('node:child_process');
const {Version,generateArguments}=require('@xmcl/core');const {GameLauncher}=require('../electron/launcher.cjs');const {prepareLoader}=require('../electron/loaders.cjs');
(async()=>{
 const version=process.argv[2]||'1.8.9',resourcePath=path.resolve('test-output/downloads/minecraft'),gamePath=path.resolve(`test-output/loader-qa/forge-${version}`);
 const launcher=new GameLauncher({root:path.resolve('test-output/downloads'),emit:()=>{},log:()=>{}});const settings={downloadThreads:8,verifyFiles:false,memory:2};
 try{
 const vanilla=await Version.parse(resourcePath,version),javaPath=await launcher.javaFor(vanilla,settings);
 const resolved=await prepareLoader({version,loader:'forge',resourcePath,javaPath,settings,launcher});
 const lib=resolved.libraries.find(l=>l.name.startsWith('net.minecraft:launchwrapper:'));if(!lib)throw new Error('This probe targets legacy Forge');
 const output=path.join(gamePath,'probe-classes');await fs.mkdir(output,{recursive:true});
 execFileSync('javac',['--release','8','-cp',path.join(resourcePath,'libraries',lib.path),'-d',output,path.resolve('scripts/java/ForgeProbe.java')],{windowsHide:true});
 const args=await generateArguments({version:resolved,resourcePath,gamePath,javaPath,minMemory:512,maxMemory:2048,accessToken:'unused-prelaunch-probe',gameProfile:{id:'00000000000000000000000000000000',name:'PrelaunchProbe'},userType:'msa'});if(args[0]===javaPath)args.shift();
 const cp=args.findIndex(a=>a==='-cp'||a==='-classpath');args[cp+1]+=path.delimiter+output;
 args.unshift(`-javaagent:${path.resolve('electron/runtime/fusion-runtime.jar')}=${version}`,'-Dfusion.loader=forge','-Djava.awt.headless=true',`-Dfusion.qa.profile=${path.resolve('runtime/loader-profiles/forge',version+'.properties')}`);
 args.push('--tweakClass','fusion.qa.ForgeProbe');
 const result=spawnSync(javaPath,args,{windowsHide:true,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});await fs.writeFile(path.join(gamePath,'probe.log'),result.stdout+'\n'+result.stderr);
 if(result.status!==0||!result.stdout.includes('FUSION_FORGE_PROBE_PASS')||/Could not install|Runtime adapter disabled/.test(result.stdout+result.stderr))throw new Error('Forge probe failed: '+(result.stderr||result.stdout).slice(-3500));
 console.log(`PASS ${version}: real Forge + Fusion hooks + menu (no game window)`);
 }finally{if(launcher.downloadAgent)await launcher.downloadAgent.destroy();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
