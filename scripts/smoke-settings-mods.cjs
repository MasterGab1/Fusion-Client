const { _electron: electron, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs/promises');
(async () => {
  const root = path.resolve(__dirname, '..'), data = await fs.mkdtemp(path.join(require('node:os').tmpdir(), 'fusion-settings-'));
  const shots = path.join(root, 'test-output/v0.8'); await fs.mkdir(shots, { recursive: true });
  const env = { ...process.env, FUSION_TEST_DATA: data }; delete env.ELECTRON_RUN_AS_NODE;
  const executablePath = process.env.FUSION_TEST_EXE || require('electron'), args = process.env.FUSION_TEST_EXE ? [] : [root];
  let app = await electron.launch({ executablePath, args, env });
  try {
    const page = await app.firstWindow(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByLabel('Game width', { exact: true }).fill('1600');
    await page.getByLabel('Game height', { exact: true }).fill('900');
    await page.getByLabel('Reduce motion', { exact: true }).check();
    await page.getByLabel('Accent color', { exact: true }).selectOption('blue');
    await page.getByLabel('Parallel downloads', { exact: true }).fill('4');
    await page.getByLabel('Full file verification', { exact: true }).check();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.locator('.app-shell')).toHaveAttribute('data-accent', 'blue');
    await expect(page.locator('.app-shell')).toHaveClass(/reduced-motion/);
    await page.getByLabel('Game width').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(shots, 'expanded-settings.png') });
    await page.getByRole('button', { name: 'Mods', exact: true }).click();
    await expect(page.getByLabel('Enable Fusion HUD')).toBeChecked({ timeout: 30000 });

    await expect(page.getByRole('button', { name: 'Enabled', exact: true })).toBeEnabled();
    await page.getByLabel('Enable Fusion Particles').click();
    await expect(page.getByLabel('Enable Fusion Particles')).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Refresh mods', exact: true })).toBeEnabled();
    await page.screenshot({ path: path.join(shots, 'mods-legacy.png') });
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.locator('.hero-tag')).toHaveText('FUSION');
    await page.screenshot({ path: path.join(shots, 'home-performance.png') });
    // Save exact modern release through the real main process, then reload the UI.
    expect((await page.evaluate(() => window.fusion.saveSettings({ selectedVersion: '26.1.2' }))).ok).toBe(true);
    await page.reload();
    await page.getByRole('button', { name: 'Mods', exact: true }).click();
    await expect(page.getByLabel('Enable Fusion HUD')).toBeChecked({ timeout: 30000 });
    await expect(page.getByLabel('Enable Fusion Focus')).toBeChecked();
    await expect(page.getByLabel('Enable Fusion Particles')).toBeChecked();
    await page.screenshot({ path: path.join(shots, 'mods-modern.png') });
    const state = (await page.evaluate(() => window.fusion.getState())).value;
    if (!state.testBuild) {
      // Opening the browser is stubbed; real PKCE listener and cancellation still run.

      await app.evaluate(({ shell }) => { shell.openExternal = async url => { global.fusionAuthUrl = url; }; });
      await page.reload();
      await page.getByRole('button', { name: /Sign in Microsoft account/ }).click();
      await page.getByRole('button', { name: 'Continue with Microsoft' }).click();
      await expect(page.getByRole('dialog')).toContainText('Complete sign-in in your browser');
      await expect.poll(() => app.evaluate(() => global.fusionAuthUrl || '')).toContain('code_challenge_method=S256');
      await expect.poll(() => app.evaluate(() => global.fusionAuthUrl || '')).toContain('client_id=7d62351c-268c-4fbe-95d5-89611193ab12');
      await expect(page.locator('.device-code')).toHaveCount(0);
      await page.screenshot({ path: path.join(shots, 'browser-signin.png') });
      await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    await app.close(); app = await electron.launch({ executablePath, args, env });
    const reopened = await app.firstWindow();
    await expect(reopened.getByRole('heading', { name: '26.1.2', exact: true })).toBeVisible();
    const settings = (await reopened.evaluate(() => window.fusion.getState())).value.settings;
    expect(settings).toMatchObject({ width: 1600, height: 900, reducedMotion: true, accent: 'blue', downloadThreads: 4, verifyFiles: true, launchMode: 'performance' });
    expect((await reopened.evaluate(() => window.fusion.modCatalog('1.8.9'))).value.mods.find(m => m.name === 'Fusion Particles').enabled).toBe(false);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(980, 660));
    for (const tab of ['Settings', 'Mods']) { await reopened.getByRole('button', { name: tab, exact: true }).click(); expect(await reopened.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false); }
    expect(errors).toEqual([]);
    console.log('PASS: settings and mod selection persist, legacy/modern catalogs, performance home state, browser PKCE UI/cancellation, small-window layout.');
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
