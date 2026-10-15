const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AuthService } = require('../electron/auth.cjs');
const { GameLauncher } = require('../electron/launcher.cjs');
const clientId = '01234567-89ab-cdef-0123-456789abcdef';
const player = { id: '0123456789abcdef0123456789abcdef', name: 'TestPlayer' };

function harness(responses = [], initial = null) {
  let saved = initial;
  const calls = [], events = [];
  const auth = new AuthService({
    vault: { read: async () => saved, write: async value => { saved = value; } },
    fetcher: async (url, options) => {
      calls.push({ url, options });
      const next = responses.shift();
      if (next instanceof Error) throw next;
      assert.ok(next, `Unexpected request: ${url}`);
      return { ok: next.status < 400, status: next.status, json: async () => next.body };
    },
    emit: (type, data) => events.push({ type, data }), sleep: async () => {},
  });
  return { auth, calls, events, saved: () => saved };
}
const ok = body => ({ status: 200, body });
const mcSteps = (items = [{ name: 'game_minecraft' }]) => [
  ok({ Token: 'xbox-token' }),
  ok({ Token: 'xsts-token', DisplayClaims: { xui: [{ uhs: 'user-hash', xid: '123' }] } }),
  ok({ access_token: 'mc-secret' }), ok({ items }), ok(player),
];

test('no saved account is rejected before any network call', async () => {
  const h = harness();
  await assert.rejects(h.auth.verifyForLaunch(clientId), /Sign in with a Microsoft account/);
  assert.equal(h.calls.length, 0);
});
test('saved account is bound to its own application client ID', async () => {
  const h = harness([], { clientId: 'another-id', refreshToken: 'secret' });
  await assert.rejects(h.auth.verifyForLaunch(clientId), /Sign in/);
  assert.equal(h.calls.length, 0);
});
test('network loss cannot fall back to a cached profile', async () => {
  const h = harness([new Error('offline')], { clientId, refreshToken: 'old', profile: player });
  await assert.rejects(h.auth.verifyForLaunch(clientId), /Online verification is required/);
});
test('no Minecraft license is rejected even with a valid profile', async () => {
  const h = harness(mcSteps([]));
  await assert.rejects(h.auth.minecraftSession('ms-token', clientId), /does not have a verified/);
});
test('API approval rejection has an actionable error', async () => {
  const h = harness([...mcSteps().slice(0, 2), { status: 403, body: { error: 'Invalid app registration' } }]);
  await assert.rejects(h.auth.minecraftSession('ms-token', clientId), /API approval/);
});
test('every launch refreshes and checks live entitlements and profile', async () => {
  const h = harness([ok({ access_token: 'new-ms', refresh_token: 'rotated' }), ...mcSteps()], { clientId, refreshToken: 'old', profile: player });
  const session = await h.auth.verifyForLaunch(clientId);
  assert.equal(session.accessToken, 'mc-secret');
  assert.deepEqual(session.profile, player);
  assert.equal(h.saved().refreshToken, 'rotated');
  assert.equal(h.calls.length, 6);
  assert.ok(h.calls.some(c => c.url.endsWith('/entitlements/mcstore')));
  assert.ok(h.calls.some(c => c.url.endsWith('/minecraft/profile')));
  assert.equal(h.saved().accessToken, undefined);
});
test('rotated refresh token survives a downstream outage', async () => {
  const h = harness([ok({ access_token: 'new-ms', refresh_token: 'rotated' }), new Error('unavailable')], { clientId, refreshToken: 'old', profile: player });
  await assert.rejects(h.auth.verifyForLaunch(clientId));
  assert.equal(h.saved().refreshToken, 'rotated');
});
test('browser flow exchanges PKCE code and verifies ownership without emitting secrets', async () => {
  const h = harness([ok({ access_token: 'ms-secret', refresh_token: 'refresh-secret' }), ...mcSteps()]);
  const profile = await h.auth.signInBrowser(clientId, async address => {
    const url = new URL(address), callback = new URL(url.searchParams.get('redirect_uri'));
    callback.hostname = '127.0.0.1'; callback.search = new URLSearchParams({ state: url.searchParams.get('state'), code: 'private-code' });
    await fetch(callback);
  });
  assert.deepEqual(profile, player);
  const body = new URLSearchParams(h.calls[0].options.body);
  assert.equal(body.get('grant_type'), 'authorization_code');
  assert.equal(body.get('code'), 'private-code');
  assert.ok(body.get('code_verifier').length >= 43);
  assert.equal(h.saved().refreshToken, 'refresh-secret');
  assert.equal(h.saved().accessToken, undefined);
  assert.ok(!/private-code|refresh-secret|ms-secret/.test(JSON.stringify(h.events)));
});
test('launcher never downloads or spawns without successful authentication', async () => {
  const logs = [];
  const game = new GameLauncher({ root: 'unused', auth: { verifyForLaunch: async () => { throw new Error('Authentication required'); } }, emit: () => {}, log: text => logs.push(text) });
  await assert.rejects(game.start('1.8.9', { clientId }), /Authentication required/);
  assert.equal(game.busy, false);
  assert.equal(game.running, false);
  assert.equal(game.task, null);
});
test('launcher refuses traversal and concurrent launches', async () => {
  const game = new GameLauncher({});
  await assert.rejects(game.start('../escape', {}), /valid Minecraft version/);
  game.busy = true;
  await assert.rejects(game.start('1.8.9', {}), /already launching/);
});
