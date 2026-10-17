const fs=require('fs'),path=require('path');const source=process.cwd(),target=path.join(source,'build/publish/Fusion-Client');
if(!fs.existsSync(path.join(target,'.git')))throw new Error('Publish checkout missing');
const roots=['.gitattributes','.github','assets','docs','electron','installer','public','runtime','scripts','src','tests','updates','.gitignore','index.html','package-lock.json','package.json','README.md','vite.config.mjs','LICENSE'];
for(const name of roots)fs.cpSync(path.join(source,name),path.join(target,name),{recursive:true,filter:(file)=>!fs.lstatSync(file).isSymbolicLink()&&!file.endsWith('change-ui.cjs')});
fs.mkdirSync(path.join(target,'build'),{recursive:true});fs.copyFileSync('build/icon.ico',path.join(target,'build/icon.ico'));
console.log('Prepared isolated publishing checkout.');
