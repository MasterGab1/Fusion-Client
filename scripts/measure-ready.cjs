const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const executablePath = path.resolve(process.argv[2] || 'release/win-unpacked/Fusion Launcher.exe');
  const samples = [];
  for (let run = 0; run < 3; run++) {
    const data = await fs.mkdtemp(path.join(require('node:os').tmpdir(), 'fusion-ready-'));
    await fs.writeFile(path.join(data, 'settings.json'), JSON.stringify({ autoCheckUpdates: false }));
    const env = { ...process.env, FUSION_TEST_DATA: data }; delete env.ELECTRON_RUN_AS_NODE;
    const start = performance.now();
    const app = await electron.launch({ executablePath, args: [], env });
    try {
      const page = await app.firstWindow();
      await expect(page.getByRole('heading', { name: '1.8.9', exact: true })).toBeVisible();
      await expect.poll(() => page.locator('.stage-image').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      samples.push(Math.round(performance.now() - start));
    } finally { await app.close(); }
  }
  const result = { executablePath, metric: 'process start to visible launcher UI with loaded hero artwork (includes test instrumentation)', milliseconds: samples };
  await fs.mkdir('test-output/v0.8', { recursive: true });
  await fs.writeFile('test-output/v0.8/startup.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
})().catch(error => { console.error(error); process.exitCode = 1; });
