const { test } = require('node:test');
const assert = require('node:assert/strict');
const { GameLauncher } = require('../electron/launcher.cjs');

test('local identities cannot bypass authentication, even with obsolete test options', async () => {
  for (const testBuild of [false, true]) {
    const launcher = new GameLauncher({ testBuild, auth: { verifyForLaunch: async () => ({ local: true, accessToken: '0', profile: { name: 'Local' } }) }, log() {}, emit() {} });
    await assert.rejects(launcher.start('1.8.9', {}), /Microsoft account is required/);
    assert.equal(launcher.busy, false);
    assert.equal(launcher.running, false);
  }
});
