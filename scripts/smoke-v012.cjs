const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
(async()=>{
 const root=path.resolve(__dirname,'..'),data=await fs.mkdtemp(path.join(os.tmpdir(),'fusion-v012-')),output=path.join(root,'test-output/v0.12');await fs.mkdir(output,{recursive:true});
 await fs.writeFile(path.join(data,'settings.json'),JSON.stringify({accent:'green',selectedVersion:'1.20.1',autoCheckUpdates:false,discordPresence:false}));
 const env={...process.env,FUSION_TEST_DATA:data};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:require('electron'),args:[path.join(root,'scripts/headless-entry.cjs')],env});
 try{
  const page=await app.firstWindow();page.setDefaultTimeout(25000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function shot(name){await page.waitForTimeout(200);const bytes=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG().toString('base64'));await fs.writeFile(path.join(output,name+'.png'),Buffer.from(bytes,'base64'));}
  expect(await page.evaluate(()=>window.fusion.appearance.accent)).toBe('green');
  await page.addInitScript(()=>{window.__firstThemes=[];const observer=new MutationObserver(()=>{const shell=document.querySelector('.app-shell');if(shell){window.__firstThemes.push({accent:shell.dataset.accent,logos:[...shell.querySelectorAll('.logo')].map(i=>i.getAttribute('src'))});if(window.__firstThemes.length>100)observer.disconnect();}});observer.observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['data-accent','src']});});
  await page.reload();await expect(page.getByRole('button',{name:/^Launch 1.20.1/})).toBeEnabled({timeout:45000});
  const frames=await page.evaluate(()=>window.__firstThemes);expect(frames.length).toBeGreaterThan(0);expect(frames.every(f=>f.accent==='green'&&f.logos.every(s=>s.includes('green')))).toBe(true);
  await page.locator('.account-button').click();await page.getByRole('tab',{name:'Local testing',exact:true}).click();await page.getByLabel('Player name').fill('FusionQA');await shot('local-profile');await page.getByRole('button',{name:'Use local profile',exact:true}).click();
  await expect(page.locator('.account-button')).toContainText('Local testing');await expect(page.locator('.main-launch')).toContainText('FusionQA');
  // Intercept only the final game operation; no game window or desktop focus.
  await app.evaluate(({app},root)=>{const require=process.mainModule.require.bind(process.mainModule);const path=require('node:path');const base=process.env.FUSION_QA_ASAR||root;require(path.join(base,'electron/launcher.cjs')).GameLauncher.prototype.start=async function(version,settings,instance){global.__qaLaunch={version,settings,instance};return {profile:{name:settings.localName}};};},root);
  await page.getByRole('button',{name:/^Launch 1.20.1/}).click();expect((await app.evaluate(()=>global.__qaLaunch)).settings.accountMode).toBe('local');
  // Reset the renderer busy state after the stub (a real launch emits events).
  await page.reload();await expect(page.locator('.account-button')).toContainText('FusionQA');
  await page.getByRole('button',{name:'Mods',exact:true}).click();await expect(page.locator('.mod-result:not(.skeleton)').first()).toBeVisible({timeout:45000});
  await page.getByRole('textbox',{name:'Search mods'}).fill('sodium extra');await page.getByRole('checkbox',{name:'Select Sodium Extra',exact:true}).check();
  await page.locator('main').evaluate(el=>el.scrollTop=el.scrollHeight);await page.getByRole('button',{name:'Download selected'}).click();
  const dialog=page.getByRole('dialog',{name:'Install mods'});await expect(dialog).toBeVisible();
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(980,660));await shot('install-dialog-small');
  const box=await dialog.boundingBox();expect(box.y).toBeGreaterThanOrEqual(48);expect(box.y+box.height).toBeLessThanOrEqual(633);expect(box.width).toBeGreaterThan(550);
  expect(await dialog.evaluate(el=>el.parentElement.parentElement.classList.contains('app-shell'))).toBe(true);await page.getByRole('button',{name:'Cancel install'}).click();
  await page.getByRole('tab',{name:'Modpacks',exact:true}).click();await page.getByRole('textbox',{name:'Search modpacks'}).fill('Fabulously Optimized');
  const card=page.locator('.pack-card').filter({has:page.getByRole('heading',{name:'Fabulously Optimized',exact:true})});await expect(card).toBeVisible({timeout:45000});await shot('modpacks');await card.getByRole('button',{name:'Install pack'}).click();
  await expect(page.getByRole('dialog',{name:'Install modpack'})).toBeVisible({timeout:60000});await shot('pack-preview');
  await page.getByRole('button',{name:'Create instance & install'}).click();await expect(page.getByRole('dialog',{name:'Install modpack'})).toHaveCount(0,{timeout:180000});
  await expect(page.locator('.installed-packs article')).toHaveCount(1);await shot('installed-pack');
  const packs=(await page.evaluate(()=>window.fusion.installedPacks())).value;expect(packs[0].name).toContain('Fabulously Optimized');expect(packs[0].loader).toBe('fabric');expect(packs[0].fileCount).toBeGreaterThan(10);
  await page.locator('.installed-packs').getByRole('button',{name:'Play',exact:true}).click();const launched=await app.evaluate(()=>global.__qaLaunch);expect(launched.instance.id).toBe(packs[0].id);expect(launched.instance.loaderVersion).toBe(packs[0].loaderVersion);expect(launched.settings.accountMode).toBe('local');
  await page.reload();await page.getByRole('button',{name:'Mods',exact:true}).click();await page.getByRole('tab',{name:'Modpacks',exact:true}).click();await page.getByRole('button',{name:/My packs/}).click();await expect(page.locator('.installed-packs article')).toHaveCount(1);
  expect(errors).toEqual([]);expect(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible())).toBe(false);
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify({data,pack:packs[0],themeFrames:frames.length},null,2));
  console.log('PASS saved theme from first render; local profile persistence and launch routing; portaled dialog at minimum size; real modpack download/configuration/instance persistence and pinned-loader launch routing. Game spawn was intercepted.');console.log(output);
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
