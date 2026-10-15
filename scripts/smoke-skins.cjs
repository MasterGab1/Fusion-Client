const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
(async () => {
  const root = path.resolve(__dirname, '..');
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'fusion-skin-ui-'));
  const shots = path.join(root, 'test-output/v0.8');
  await fs.mkdir(shots, { recursive: true });
  const env = { ...process.env, FUSION_TEST_DATA: data }; delete env.ELECTRON_RUN_AS_NODE;
  const executablePath = process.env.FUSION_TEST_EXE || require('electron');
  const args = process.env.FUSION_TEST_EXE ? [] : [root];
  let app;
  try {
    app = await electron.launch({ executablePath, args, env });
    const page = await app.firstWindow();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.evaluate(() => {
      const schedule = window.requestAnimationFrame.bind(window);
      window.skinFrameCount = 0;
      window.requestAnimationFrame = callback => { window.skinFrameCount++; return schedule(callback); };
    });
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('button')).toHaveCount(5);
    const bounds = await nav.boundingBox(); expect(bounds.width).toBeLessThan(80);
    const skinsButton = nav.getByRole('button', { name: 'Skins', exact: true });
    await skinsButton.hover(); await expect(skinsButton.getByRole('tooltip')).toBeVisible();
    await skinsButton.click();
    await expect(page.locator('.skin-viewport')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    await expect(page.locator('.preview-error')).toHaveCount(0);
    const idleFrames = await page.evaluate(() => window.skinFrameCount);
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => window.skinFrameCount)).toBe(idleFrames);
    await page.screenshot({ path: path.join(shots, 'skins.png') });
    const canvas = page.locator('.skin-viewport canvas');
    const before = createHash('sha256').update(await canvas.screenshot()).digest('hex');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 10 }); await page.mouse.up();
    const after = createHash('sha256').update(await canvas.screenshot()).digest('hex'); expect(before).not.toBe(after);
    await page.getByRole('button', { name: 'Reset view', exact: true }).click();
    await page.getByRole('button', { name: 'Walking animation', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Walking animation', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.evaluate(() => window.skinFrameCount)).toBeGreaterThan(idleFrames + 2);
    await page.getByRole('button', { name: 'Walking animation', exact: true }).click();
    await page.getByRole('button', { name: /Slim 3 px arms/ }).click();
    await expect(page.locator('.skin-preview > header')).toContainText('Slim');
    await expect(page.locator('.skin-viewport')).toHaveAttribute('data-ready', 'true');
    const state = (await page.evaluate(() => window.fusion.getState())).value;
    if (state.testBuild) {
      await expect(page.getByRole('button', { name: 'Apply skin', exact: true })).toBeDisabled();
      expect((await page.evaluate(() => window.fusion.applySkin('default', 'classic'))).ok).toBe(false);
    } else {
      await page.getByRole('button', { name: 'Sign in to apply', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Close dialog' }).click();
      expect((await page.evaluate(() => window.fusion.applySkin('default', 'classic'))).error).toContain('Sign in');
    }
    await app.evaluate(({ dialog }, file) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] }); }, path.join(root, 'public/assets/skins/steve.png'));
    await page.getByRole('button', { name: 'Import PNG', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Preview steve', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Slim 3 px arms/ }).click();
    await expect(page.getByRole('button', { name: /Slim 3 px arms/ })).toHaveAttribute('aria-pressed', 'true');
    await app.evaluate(({ dialog }, file) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: file }); }, path.join(data, 'saved-skin.png'));
    await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('PNG downloaded.');
    const png = await fs.readFile(path.join(data, 'saved-skin.png'));
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.readUInt32BE(16)).toBe(64);
    await page.getByLabel('Minecraft username', { exact: true }).fill('../invalid');
    await page.getByRole('button', { name: 'Load skin', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Java username');
    expect((await page.evaluate(() => window.fusion.selectSkin('../account.bin', 'classic'))).ok).toBe(false);
    await page.getByRole('button', { name: 'Versions', exact: true }).click();
    await page.getByRole('button', { name: 'Skins', exact: true }).click();
    await expect(page.locator('.skin-viewport')).toHaveAttribute('data-ready', 'true');
    await expect(page.getByRole('button', { name: /Slim 3 px arms/ })).toHaveAttribute('aria-pressed', 'true');
    // Exercise real public skin lookup once; no Microsoft account is used.
    await page.getByLabel('Minecraft username', { exact: true }).fill('Notch');
    await page.getByRole('button', { name: 'Load skin', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Preview Notch', exact: true })).toBeVisible({ timeout: 65000 });
    await expect(page.locator('.skin-viewport')).toHaveAttribute('data-ready', 'true');
    await page.screenshot({ path: path.join(shots, 'skins-downloaded.png') });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(980, 660));
    await page.screenshot({ path: path.join(shots, 'skins-small.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
    await app.close();
    app = await electron.launch({ executablePath, args, env });
    const restarted = await app.firstWindow();
    await restarted.getByRole('button', { name: 'Skins', exact: true }).click();
    await expect(restarted.getByRole('button', { name: 'Preview Notch', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(restarted.locator('.skin-viewport')).toHaveAttribute('data-ready', 'true');
    await restarted.getByRole('button', { name: 'Remove saved skin', exact: true }).click();
    await expect(restarted.getByRole('button', { name: 'Preview Notch', exact: true })).toHaveCount(0);
    await expect(restarted.getByRole('button', { name: 'Preview Steve', exact: true })).toHaveAttribute('aria-pressed', 'true');
    if (state.testBuild) {
      // An IPC refusal before the launch service starts must not leave the UI busy.
      await app.evaluate(({ ipcMain }) => {
        ipcMain.removeHandler('fusion:launch');
        ipcMain.handle('fusion:launch', () => ({ ok: false, error: 'Wait for the account operation to finish before launching.' }));
      });
      await restarted.getByRole('button', { name: 'Play', exact: true }).click();
      await restarted.getByRole('button', { name: 'Launch', exact: true }).click();
      await expect(restarted.locator('.error-toast')).toContainText('account operation');
      await expect(restarted.getByRole('button', { name: 'Launch', exact: true })).toBeEnabled();
    }
    console.log('PASS: left icon rail/tooltips, actual WebGL preview/rotation, model controls, PNG import/export, real public username download, account gating, invalid input, restart persistence, minimum window layout.');
  } finally { if (app) await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
