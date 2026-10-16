const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {version}=require('../package.json');fs.mkdirSync('build',{recursive:true});
fs.writeFileSync('build/Uninstall.cs',fs.readFileSync('installer/Uninstall.cs','utf8').replaceAll('__VERSION__',version));
const framework=path.join(process.env.WINDIR,'Microsoft.NET/Framework64/v4.0.30319');
const references=['System.dll','System.Core.dll','System.Xaml.dll','WPF/PresentationFramework.dll','WPF/PresentationCore.dll','WPF/WindowsBase.dll'].map(x=>`/reference:${path.join(framework,x)}`);
execFileSync(path.join(framework,'csc.exe'),['/nologo','/target:winexe','/platform:x64','/optimize+','/out:'+path.resolve('build/Fusion-Uninstall.exe'),'/win32icon:'+path.resolve('build/icon.ico'),'/win32manifest:'+path.resolve('installer/setup.manifest'),...references,'/resource:'+path.resolve('public/assets/branding/pink.png')+',brand.png',path.resolve('build/Uninstall.cs')],{stdio:'inherit',windowsHide:true});
console.log('Built Fusion custom uninstaller');
