const { _electron: electron, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs/promises');
(async () => {
  const root = path.resolve(__dirname, '..');
  const folder = await fs.mkdtemp(path.join(require('node:os').tmpdir(), 'fusion-smoke-'));
  const screenshots = path.join(root, 'test-output', 'v0.8');
  await fs.mkdir(screenshots, { recursive: true });
  // Exercise migration from a version selected in the previous release.
  await fs.writeFile(path.join(folder, 'settings.json'), JSON.stringify({ selectedVersion: '26.3', showSnapshots: true }));
  const env = { ...process.env, FUSION_TEST_DATA: folder };
  delete env.ELECTRON_RUN_AS_NODE;
  const executablePath = process.env.FUSION_TEST_EXE || require('electron');
  const args = process.env.FUSION_TEST_EXE ? [] : [root];
  let app;
  try {
    app = await electron.launch({ executablePath, args, env, timeout: 30000 });
    const page = await app.firstWindow();
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible())).toBe(true);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await expect(page.getByRole('heading', { name: '1.8.9', exact: true })).toBeVisible();
    await expect(page.locator('.stage-image')).toBeVisible();
    await expect.poll(() => page.locator('.stage-image').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: path.join(screenshots, 'home.png') });
    expect(await page.locator('body').innerText()).not.toMatch(/adventure|without limits|let.s play|secure account|account-only/i);
    const security = await app.evaluate(({ BrowserWindow }) => {
      const p = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
      return { sandbox: p.sandbox, contextIsolation: p.contextIsolation, nodeIntegration: p.nodeIntegration };
    });
    expect(security).toEqual({ sandbox: true, contextIsolation: true, nodeIntegration: false });
    expect((await page.evaluate(() => window.fusion.launch('1.8.9'))).error).toContain('Sign in');
    expect((await page.evaluate(() => window.fusion.launch('26.3'))).error).toContain('supported version families');
    expect((await page.evaluate(() => window.fusion.saveSettings({ selectedVersion: '1.17' }))).ok).toBe(false);

    await page.getByRole('button', { name: 'Choose Minecraft version' }).click();
    await expect(page.getByRole('button', { name: /^Open .* versions$/ })).toHaveCount(8);
    await expect(page.getByRole('button', { name: 'Refresh versions' })).toBeEnabled({ timeout: 30000 });
    await expect.poll(() => page.locator('.family-cover img').evaluateAll(imgs => imgs.filter(img => img.complete && img.naturalWidth > 0).length)).toBe(8);
    await page.screenshot({ path: path.join(screenshots, 'families.png') });
    const catalog = await page.evaluate(() => window.fusion.getVersions());
    expect(catalog.value.families.map(f => f.id)).toEqual(['1.8','1.12','1.16','1.18','1.19','1.20','1.21','26.1']);
    expect(catalog.value.versions.every(v => v.type === 'release')).toBe(true);
    await page.getByRole('button', { name: 'Open 1.8 versions', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Select 1.8.9', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: path.join(screenshots, 'releases.png') });
    await page.getByRole('button', { name: 'Back to version families' }).click();
    await page.getByRole('button', { name: 'Open 1.12 versions', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Select 1.12.2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /^Select / })).toHaveCount(3);

    // Stand in for the native file chooser only; use the real importer and image protocol.
    await app.evaluate(({ dialog }, file) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] }); }, path.join(root, 'public/assets/versions/1.8-original.png'));
    await page.getByRole('button', { name: 'Change background', exact: true }).click();
    await expect(page.locator('.family-preview > img')).toBeVisible();
    await expect.poll(() => page.locator('.family-preview > img').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Select 1.12.1', exact: true }).click();
    await page.getByRole('button', { name: 'Use 1.12.1', exact: true }).click();
    await expect(page.getByRole('heading', { name: '1.12.1', exact: true })).toBeVisible();
    await expect(page.locator('.stage-image')).toHaveAttribute('src', /fusion-art:\/\/background\/1.12/);
    await expect.poll(() => page.locator('.stage-image').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    expect((await page.evaluate(() => window.fusion.pickBackground('../escape'))).ok).toBe(false);

    await page.getByRole('button', { name: 'Sign in to play', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Microsoft sign-in');
    await page.screenshot({ path: path.join(screenshots, 'signin.png') });
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByLabel('Client ID', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Sign-in method', { exact: true })).toHaveCount(0);
    await page.getByLabel('Memory', { exact: true }).fill('3');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(screenshots, 'settings.png') });
    await app.close();
    app = await electron.launch({ executablePath, args, env, timeout: 30000 });
    const reopened = await app.firstWindow();
    await expect(reopened.getByRole('heading', { name: '1.12.1', exact: true })).toBeVisible();
    await expect.poll(() => reopened.locator('.stage-image').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    const state = await reopened.evaluate(() => window.fusion.getState());
    expect(state.value.settings.memory).toBe(3);
    expect(state.value.settings.showSnapshots).toBeUndefined();
    expect(state.value.profile).toBe(null);
    expect(state.value.testBuild).toBeUndefined();
    expect(errors).toEqual([]);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(980, 660));
    await reopened.screenshot({ path: path.join(screenshots, 'home-small.png') });
    await reopened.getByRole('button', { name: 'Versions', exact: true }).click();
    await expect(reopened.getByRole('button', { name: 'Open 26.1 versions', exact: true })).toBeVisible();
    const overflows = await reopened.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflows).toBe(false);
    console.log('PASS: family catalog, subversions, account gate, background import/loading/persistence, settings migration, saved selection, and minimum window layout.');
    console.log('Screenshots: test-output/v0.8/');
  } finally { if (app) await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
