const { _electron: electron } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const data = await fs.mkdtemp(path.join(require('node:os').tmpdir(), 'fusion-live-update-'));
  await fs.writeFile(path.join(data, 'settings.json'), JSON.stringify({ autoCheckUpdates: false }));
  const env = { ...process.env, FUSION_TEST_DATA: data }; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath: path.resolve('release/win-unpacked/Fusion Launcher.exe'), args: [], env });
  try {
    const page = await app.firstWindow();
    await page.getByRole('button', { name: 'Updates', exact: true }).click();
    const result = await page.evaluate(() => window.fusion.checkUpdates());
    await page.screenshot({ path: path.resolve('test-output/v0.8/live-update-check.png') });
    await fs.writeFile('test-output/v0.8/live-update-check.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
