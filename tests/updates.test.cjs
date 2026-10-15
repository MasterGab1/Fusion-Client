const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { UpdateService, validateRelease } = require('../electron/updates.cjs');
const checksum = Buffer.alloc(64, 1).toString('base64');
function info(testBuild = false) { return { version: '0.8.0', files: [{ url: `Fusion-${testBuild ? 'Test-' : ''}Setup-0.8.0.exe`, sha512: checksum }] }; }
function fixture(options = {}) {
  const engine = new EventEmitter(); const events = []; let blocked = false, installs = 0, checks = 0;
  engine.checkForUpdates = async () => { checks++; engine.emit('update-available', info(options.testBuild)); return { updateInfo: info(options.testBuild) }; };
  engine.downloadUpdate = async () => { engine.emit('download-progress', { percent: 42 }); engine.emit('update-downloaded', info(options.testBuild)); };
  engine.quitAndInstall = () => installs++;
  const service = new UpdateService({ createUpdater: () => engine, version: '0.7.0', installed: true, testBuild: false, blocked: () => blocked, emit: e => events.push(e), ...options });
  return { service, engine, events, block: () => { blocked = true; }, installs: () => installs, checks: () => checks };
}
test('updates are lazy, explicit downloads, progress, verified install and no auto-quit install', async () => {
  const f = fixture(); assert.equal(f.service.updater, undefined);
  await f.service.check(); assert.equal(f.service.state.status, 'available');
  assert.equal(f.engine.autoDownload, false); assert.equal(f.engine.autoInstallOnAppQuit, false);
  assert.equal(f.engine.allowDowngrade, false); assert.equal(f.engine.allowPrerelease, false);
  await f.service.download(); assert.equal(f.service.state.status, 'ready');
  assert.ok(f.events.some(e => e.percent === 42));
  await f.service.check(); assert.equal(f.checks(), 1);
  f.service.install(); assert.equal(f.installs(), 1);
});
test('only official update artifacts are accepted; test builds and remote URLs are rejected', async () => {
  assert.throws(() => validateRelease(info(true), false), /edition/);
  validateRelease(info(false));
  for (const url of ['https://evil.example/Fusion-Setup-0.8.0.exe', '../Fusion-Setup-0.8.0.exe']) assert.throws(() => validateRelease({ ...info(), files: [{ url, sha512: checksum }] }, false));
  const f = fixture(); await f.service.check(); assert.equal(f.engine.channel, 'latest');
  f.engine.emit('update-available', info(true)); assert.equal(f.service.state.status, 'error');
  await assert.rejects(f.service.download());
});
test('install is refused during gameplay or account operations, and before verified download', async () => {
  const f = fixture(); assert.throws(() => f.service.install(), /Download/);
  await f.service.check(); await f.service.download(); f.block(); assert.throws(() => f.service.install(), /Close Minecraft/); assert.equal(f.installs(), 0);
});
test('network and verification failures recover on recheck without installing', async () => {
  const f = fixture(); await f.service.check();
  f.engine.downloadUpdate = async () => { throw new Error('sha512 checksum mismatch'); };
  await f.service.download(); assert.equal(f.service.state.status, 'error'); assert.match(f.service.state.error, /verification failed/);
  assert.throws(() => f.service.install()); await f.service.check(); assert.equal(f.service.state.status, 'available');
  f.engine.checkForUpdates = async () => { throw new Error('404'); }; await f.service.check(); assert.match(f.service.state.error, /published update/);
});
test('duplicate checks do not overlap and unpacked apps cannot install updates', async () => {
  const f = fixture({ installed: false }); let finish;
  f.engine.checkForUpdates = () => new Promise(resolve => { finish = resolve; });
  const pending = f.service.check(); await f.service.check(); assert.equal(f.service.state.status, 'checking');
  f.engine.emit('update-available', info()); finish({}); await pending;
  await assert.rejects(f.service.download(), /setup executable/); assert.equal(f.installs(), 0);
});

test('private update credentials stay in the provider and never enter observable state', async () => {
  const token = 'private-fixture'; let feed;
  const f = fixture({ getToken: async () => token }); f.engine.setFeedURL = value => { feed=value; };
  await f.service.check(); assert.equal(feed.private,true); assert.equal(feed.token,token);
  assert.equal(JSON.stringify(f.events).includes(token),false); assert.equal(f.engine.logger,null);
  f.service.getToken=async()=>null; await f.service.check(); assert.match(f.service.state.error,/Private updates need GitHub/);
});
