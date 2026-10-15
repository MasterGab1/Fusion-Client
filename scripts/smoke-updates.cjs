const { _electron: electron, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs/promises');
(async () => {
  const root = path.resolve(__dirname, '..'), data = await fs.mkdtemp(path.join(require('node:os').tmpdir(), 'fusion-updates-'));
  await fs.writeFile(path.join(data, 'settings.json'), JSON.stringify({ autoCheckUpdates: false }));
  const output = path.join(root, 'test-output/v0.8'); await fs.mkdir(output, { recursive: true });
  const env = { ...process.env, FUSION_TEST_DATA: data }; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath: process.env.FUSION_TEST_EXE || require('electron'), args: process.env.FUSION_TEST_EXE ? [] : [root], env });
  try {
    const page = await app.firstWindow(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.getByRole('button', { name: 'Versions', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Use 1.20.1', exact: true })).toBeEnabled({ timeout: 30000 });
    await page.getByRole('button', { name: 'Use 1.20.1', exact: true }).click();
    await expect(page.getByRole('heading', { name: '1.20.1', exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(output, 'home.png') });
    await page.getByRole('button', { name: 'Versions', exact: true }).click();
    await page.getByLabel('Search versions').fill('1.12.1');
    await expect(page.locator('.search-release')).toHaveCount(1);
    await page.locator('.search-release').click();
    await expect(page.getByRole('heading', { name: '1.12.1', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Versions', exact: true }).click();
    await page.screenshot({ path: path.join(output, 'versions.png') });
    await page.getByRole('button', { name: 'Open 1.12 versions', exact: true }).click();
    await page.getByRole('button', { name: 'Browse 1.20 family', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Select 1.20.1', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: path.join(output, 'subversions.png') });
    await page.getByRole('button', { name: 'Updates', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('MasterGab1 / Fusion-Client');
    await expect(page.getByRole('dialog')).toContainText('Run the Fusion setup once');
    // Exercise the renderer with a simulated release transport. Service invariants have separate unit tests.
    await app.evaluate(({ ipcMain, BrowserWindow }) => {
      for (const name of ['updates-check', 'updates-download', 'updates-install']) ipcMain.removeHandler('fusion:' + name);
      const state = { status: 'available', installed: true, currentVersion: '0.7.0', version: '0.8.0', channel: 'Regular', percent: 0, error: '' };
      const send = patch => { Object.assign(state, patch); BrowserWindow.getAllWindows()[0].webContents.send('fusion:event', { type: 'update', data: state }); return { ok: true, value: { ...state } }; };
      ipcMain.handle('fusion:updates-check', () => send({ status: 'available' }));
      ipcMain.handle('fusion:updates-download', async () => { send({ status: 'downloading', percent: 46 }); await new Promise(r => setTimeout(r, 600)); return send({ status: 'ready', percent: 100 }); });
      ipcMain.handle('fusion:updates-install', () => send({ status: 'installing' }));
    });
    await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Fusion 0.8.0', exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(output, 'update-available-fixture.png') });
    await page.getByRole('button', { name: 'Download update', exact: true }).click();
    await expect(page.getByLabel('Update download progress')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restart to install', exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(output, 'update-ready-fixture.png') });
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await page.getByRole('button', { name: 'Restart to update', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ready to install', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(980, 660));
    await page.getByRole('button', { name: 'Versions', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Use 26.1.2', exact: true })).toBeInViewport();
    await page.screenshot({ path: path.join(output, 'versions-small.png') });
    expect(errors).toEqual([]);
    console.log('PASS: quick select, search, family switching, updater available/progress/ready states with fixture transport, Escape/focus, compact layout.');
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
