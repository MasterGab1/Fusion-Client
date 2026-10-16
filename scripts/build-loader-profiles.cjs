const fs = require('node:fs/promises');
const path = require('node:path');
const { mappings, remap, mappingArchive } = require('./loader-mappings.cjs');
const { index } = require('./audit-runtime.cjs');
async function main() {
  const versions=require('../electron/runtime/manifest.json').versions;
  const promos=await fetch('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json').then(r=>r.json());
  let failed=0, count=0;
  for(const version of versions) {
    if(process.argv[2] && version!==process.argv[2])continue;
    let classes;
    const p=Object.fromEntries((await fs.readFile(`runtime/profiles/${version}.properties`,'utf8')).trim().split(/\r?\n/).map(l=>l.split(/=(.*)/s).slice(0,2)));
    for(const loader of ['fabric','forge']) {
      if(loader==='fabric' && /^(1\.8|1\.12)(\.|$)/.test(version))continue;
      if(loader==='forge' && !promos.promos[`${version}-recommended`] && !promos.promos[`${version}-latest`])continue;
      try {
        let result;
        if(version.startsWith('26.'))result={profile:p,bindings:[]};
        else {
          let source;
          if(loader==='fabric') source=await mappingArchive(`https://maven.fabricmc.net/net/fabricmc/intermediary/${version}/intermediary-${version}-v2.jar`,`build/runtime-cache/${version}-intermediary.jar`,/^mappings\/mappings.tiny$/);
          else if(/^(1\.8|1\.12)(\.|$)/.test(version)) source=await fs.readFile(`build/runtime-cache/${version}.srg`,'utf8');
          else source=await mappingArchive(`https://maven.minecraftforge.net/de/oceanlabs/mcp/mcp_config/${version}/mcp_config-${version}.zip`,`build/runtime-cache/${version}-mcp-config.zip`,/^config\/joined.tsrg$/);
          classes ||= index(version);
          result=remap(p,classes,mappings(source));
        }
        const folder=`runtime/loader-profiles/${loader}`; await fs.mkdir(folder,{recursive:true});
        await fs.writeFile(`${folder}/${version}.properties`,Object.entries(result.profile).map(([k,v])=>`${k}=${v}`).join('\n')+'\n');
        await fs.writeFile(`build/runtime-cache/${version}-${loader}-bindings.json`,JSON.stringify(result.bindings));
        console.log(`PASS ${version} ${loader}: ${result.bindings.length} remapped bindings`);count++;
      } catch(e) { failed++;console.error(`FAIL ${version} ${loader}: ${e.message}`); }
    }
  }
  console.log(`${count} loader profiles, ${failed} failures`);process.exitCode=failed?1:0;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
