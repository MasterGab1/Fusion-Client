const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { defaults, validateSettings } = require('../electron/settings.cjs');
const { ModService, loaderFor } = require('../electron/mods.cjs');
test('settings enforce resource bounds and supported module controls', () => {
  for (const patch of [{ memory: 1000 }, { width: -1 }, { downloadThreads: 17 }, { fullscreen: 'true' }, { discordPresence: 'true' }, { backgroundFps: 0 }, { particleDistance: 1000 }]) assert.throws(() => validateSettings(defaults, patch, 16));
  const migrated = validateSettings(defaults, { clientId: 'old', authMethod: 'device', discordPresence: false }, 16);
  assert.equal(migrated.clientId, undefined); assert.equal(migrated.authMethod, undefined); assert.equal(migrated.discordPresence, false);
  assert.equal(validateSettings(defaults, { memory: 6, backgroundFps: 15, particleDistance: 32 }, 16).backgroundFps, 15);
});
test('Fusion runtime covers every offered release without exposing unverified future releases', () => {
  for (const version of require('../electron/runtime/manifest.json').versions) assert.equal(loaderFor(version), 'fusion');
  assert.equal(loaderFor('1.12.1'), 'fusion'); assert.equal(loaderFor('1.21.11'), 'fusion'); assert.equal(loaderFor('1.21.999'), null); assert.throws(() => loaderFor('../escape'));
});
test('bundled modules work without network, persist toggles and retire only managed old mods', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fusion-runtime-'));
  const original = global.fetch; global.fetch = async () => { throw new Error('Fusion modules must not download third-party mods'); };
  try {
    const mods = new ModService(root), game = path.join(root, 'game');
    assert.deepEqual((await mods.catalog('1.8.9')).mods.map(m => m.id), ['watermark', 'focus', 'particles', 'saturation', 'freelook', 'fps', 'coordinates']);
    await mods.configure('1.8.9', ['watermark', 'focus']);
    await fs.mkdir(path.join(game, 'mods'), { recursive: true });
    await fs.writeFile(path.join(game, 'mods/old-managed.jar'), 'old');
    await fs.writeFile(path.join(game, 'mods/user-mod.jar'), 'user');
    await fs.writeFile(path.join(game, 'fusion-mods.json'), JSON.stringify({ files: [{ filename: 'old-managed.jar' }, { filename: '../escape.jar' }] }));
    const installed = await mods.install('1.8.9', '', game, { checkCancelled() {}, status() {} }, { backgroundFps: 15, particleDistance: 32 });
    await fs.access(installed.jar);
    assert.match(await fs.readFile(installed.config, 'utf8'), /particles=false[\s\S]*backgroundFps=15[\s\S]*particleDistance=32/);
    await fs.access(path.join(game, 'mods/old-managed.jar.disabled')); await fs.access(path.join(game, 'mods/user-mod.jar'));
    assert.equal((await new ModService(root).catalog('1.8.9')).mods.find(m => m.id === 'particles').enabled, false);
    await assert.rejects(mods.configure('1.8.9', ['sodium']), /Invalid Fusion/);
    await assert.rejects(mods.install('1.12.99', '', game, {}), /Update Fusion/);
  } finally { global.fetch = original; await fs.rm(root, { recursive: true, force: true }); }
});
test('tampered bundled runtime fails before installing or launching it', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fusion-integrity-'));
  try {
    await fs.writeFile(path.join(root, 'fusion-runtime.jar'), 'tampered');
    await assert.rejects(new ModService(root, root).install('1.8.9', '', root, { checkCancelled() {}, status() {} }), /integrity/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('in-game changes survive relaunch and sync with launcher mod controls', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fusion-sync-'));
  try {
    const mods = new ModService(root), game = path.join(root, 'instances', '1.8.9-performance');
    const launcher = { checkCancelled() {}, status() {} };
    const installed = await mods.install('1.8.9', '', game, launcher, {});
    await fs.writeFile(installed.config, '# Saved by game\nwatermark=false\nfocus=true\nparticles=false\nbackgroundFps=15\nparticleDistance=32\n');
    assert.deepEqual((await mods.catalog('1.8.9')).mods.map(m => m.enabled), [false, true, false, false, false, false, false]);
    await mods.install('1.8.9', '', game, launcher, { backgroundFps: 30 });
    assert.match(await fs.readFile(installed.config, 'utf8'), /backgroundFps=15/);
    await mods.configure('1.8.9', ['watermark', 'particles']);
    assert.match(await fs.readFile(installed.config, 'utf8'), /focus=false/);
    await mods.updateLimits({ backgroundFps: 20, menuScale: 65 });
    assert.match(await fs.readFile(installed.config, 'utf8'), /menuScale=65/);
    assert.match(await fs.readFile(installed.config, 'utf8'), /backgroundFps=20/);
    assert.match(await fs.readFile(installed.config, 'utf8'), /particleDistance=32/);
    assert.deepEqual((await new ModService(root).catalog('1.8.9')).mods.map(m => m.enabled), [true, false, true, false, false, false, false]);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
