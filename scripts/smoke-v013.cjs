const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
(async()=>{
 const root=path.resolve(__dirname,'..'),data=await fs.mkdtemp(path.join(os.tmpdir(),'fusion-v013-')),out=path.join(root,'test-output/v0.13');await fs.mkdir(out,{recursive:true});
 await fs.writeFile(path.join(data,'settings.json'),JSON.stringify({accent:'pink',selectedVersion:'1.20.1',autoCheckUpdates:false,discordPresence:false}));
 const env={...process.env,FUSION_TEST_DATA:data};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:require('electron'),args:[path.join(root,'scripts/headless-entry.cjs')],env});
 try{
  const page=await app.firstWindow();page.setDefaultTimeout(25000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function shot(name){await page.waitForTimeout(250);const bytes=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG().toString('base64'));await fs.writeFile(path.join(out,name+'.png'),Buffer.from(bytes,'base64'));}
  await expect(page.getByRole('button',{name:/^Launch 1.20.1/})).toBeEnabled({timeout:45000});await expect(page.locator('.news-card').first()).toBeVisible({timeout:45000});await shot('play');
  await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('radiogroup',{name:'Game loader'})).toHaveCount(0);
  const scale=page.getByLabel('Menu size',{exact:true});await scale.fill('65');
  await expect.poll(async()=>JSON.parse(await fs.readFile(path.join(data,'settings.json'),'utf8')).menuScale).toBe(65);
  await expect(scale).toHaveValue('65');await scale.press('ArrowRight');
  await expect.poll(async()=>JSON.parse(await fs.readFile(path.join(data,'settings.json'),'utf8')).menuScale).toBe(70);
  await shot('settings');await page.getByRole('tab',{name:'Appearance',exact:true}).click();await shot('appearance');
  await page.getByRole('tab',{name:'About',exact:true}).click();await expect(page.getByRole('article',{name:'Privacy notice'})).toContainText('does not automatically upload');await shot('privacy');
  await page.getByRole('button',{name:'Terms of use',exact:true}).click();await expect(page.getByRole('article',{name:'Terms of use'})).toContainText('proprietary');
  await page.getByRole('button',{name:'Mods',exact:true}).click();await page.getByRole('tab',{name:/^Installed/}).click();await expect(page.locator('.fusion-features .mod-card')).toHaveCount(7);
  await page.getByLabel('Enable Saturation',{exact:true}).click();await expect(page.getByLabel('Enable Saturation',{exact:true})).toBeChecked();await page.getByLabel('Enable Free look',{exact:true}).click();await expect(page.getByLabel('Enable Free look',{exact:true})).toBeChecked();await shot('mods');
  await page.reload();await page.getByRole('button',{name:'Mods',exact:true}).click();await page.getByRole('tab',{name:/^Installed/}).click();await expect(page.getByLabel('Enable Free look',{exact:true})).toBeChecked();await expect(page.getByLabel('Enable Saturation',{exact:true})).toBeChecked();
  await page.getByRole('button',{name:'Output',exact:true}).click();
  await app.evaluate(({BrowserWindow},root)=>{const base=process.env.FUSION_QA_ASAR||root;const parse=process.mainModule.require(process.mainModule.require('node:path').join(base,'electron/game-output.cjs')).gameOutput;const stream=parse((message,level)=>BrowserWindow.getAllWindows()[0].webContents.send('fusion:event',{type:'log',data:{message,level,time:new Date().toISOString()}}));stream.write('<log4j:Event level="WARN"><log4j:Message><![CDATA[A mod needs attention]]></log4j:Message></log4j:Event>\n[Client/ERROR] Example error\n');stream.end();},root);
  await expect(page.locator('.log-line.warn')).toContainText('A mod needs attention');await expect(page.locator('.log-line.error')).toContainText('Example error');await expect(page.locator('.logs-content')).not.toContainText('log4j:');await shot('output');
  await page.getByRole('button',{name:'Close output'}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByLabel('Menu size',{exact:true})).toHaveValue('70');
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(980,660));await shot('settings-small');expect(await page.locator('main').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
  expect(errors).toEqual([]);expect(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible())).toBe(false);
  console.log('PASS menu-size autosave/reload, seven module controls, new toggles persist, legal tabs, parsed colored output, compact settings.');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
