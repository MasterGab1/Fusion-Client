(async () => {
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const { version } = require('../package.json');
const target = path.resolve(`release/Fusion-Setup-${version}.exe`);
const qa = process.argv.includes('--test-engine');
const engine = qa ? path.resolve(process.argv[process.argv.indexOf('--test-engine') + 1]) : path.resolve('build/installer-engine.exe');
const preview = qa || process.argv.includes('--preview');
fs.mkdirSync('build', { recursive:true });
if (!preview && !process.argv.includes('--reuse-engine')) {
  if (fs.readFileSync(target).includes(Buffer.from('FusionSetup'))) throw new Error('Installer is already wrapped. Rebuild NSIS first or pass --reuse-engine to reuse its saved payload.');
  fs.copyFileSync(target, engine);
}
if (!fs.existsSync(engine)) throw new Error('Build the NSIS installer first.');
const hash = crypto.createHash('sha256').update(fs.readFileSync(engine)).digest('hex');
fs.writeFileSync('build/Setup.cs', fs.readFileSync('installer/Setup.cs','utf8').replaceAll('__VERSION__',version).replaceAll('__HASH__',hash));
const framework = path.join(process.env.WINDIR, 'Microsoft.NET/Framework64/v4.0.30319');
const result = preview ? path.resolve('build/Fusion-Setup-Preview.exe') : target;
const references = ['System.dll','System.Core.dll','System.Xaml.dll','System.Windows.Forms.dll','System.Drawing.dll','WPF/PresentationFramework.dll','WPF/PresentationCore.dll','WPF/WindowsBase.dll'].map(x=>`/reference:${path.join(framework,x)}`);
execFileSync(path.join(framework,'csc.exe'),['/nologo',...(qa ? ['/define:QA'] : []),'/target:winexe','/platform:x64','/optimize+',`/out:${result}`,'/win32icon:' + path.resolve('build/icon.ico'),'/win32manifest:' + path.resolve('installer/setup.manifest'),...references,`/resource:${engine},engine.exe`,'/resource:' + path.resolve('public/assets/branding/pink.png') + ',brand.png',path.resolve('build/Setup.cs')],{stdio:'inherit',windowsHide:true});
if (!preview) {
  await require('app-builder-lib/out/targets/blockmap/blockmap').buildBlockMap(result,'gzip',result+'.blockmap');
  const sha512=crypto.createHash('sha512').update(fs.readFileSync(result)).digest('base64');
  const info={version,files:[{url:path.basename(result),sha512,size:fs.statSync(result).size}],path:path.basename(result),sha512,releaseDate:new Date().toISOString()};
  fs.writeFileSync('release/latest.yml',JSON.stringify(info,null,2)+'\n');
}
console.log(`Built custom installer: ${result}`);


})().catch(error => { console.error(error.message); process.exitCode=1; });
