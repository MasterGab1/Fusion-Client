// Report paths/categories only. Never print a possible credential.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(process.argv[2]||'build/publish/Fusion-Client');
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const patterns={
  privateKey:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  credential:/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9]{30,})\b/,
  personalWindowsPath:/[A-Z]:[\\/]+Users[\\/]+(?!Public\b|Default\b|<|%)[A-Za-z0-9._ -]+/i,
};
const problems=[];
for(const file of new Set(files)){
 if(/(^|\/)(?:\.env(?:\.|$)|accounts?\.json$|settings\.json$|logs\/|config\/|test-output\/)|\.(?:log|pfx|pem|key|bin)$/i.test(file)){problems.push({file,kind:'local-only file'});continue;}
 const full=path.join(root,file);if(!fs.existsSync(full)||fs.statSync(full).size>3*1024*1024||!/\.(?:md|cjs|js|jsx|json|properties|txt|cs|java|ps1|yml)$/.test(file))continue;
 const text=fs.readFileSync(full,'utf8');for(const [kind,re] of Object.entries(patterns))if(re.test(text))problems.push({file,kind});
}
if(problems.length){console.error(JSON.stringify(problems,null,2));process.exitCode=1;}
else console.log(`PASS publish scan: ${new Set(files).size} files; no detected credentials, private user paths or local data. Pattern scan only, not a guarantee.`);
