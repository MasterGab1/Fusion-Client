const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { browserAuthorization } = require('../electron/browser-auth.cjs');
const clientId = '01234567-89ab-cdef-0123-456789abcdef';
test('browser sign-in validates state and returns a matching PKCE verifier', async () => {
  let authorize, callback;
  const result = await browserAuthorization({ clientId, openBrowser: async address => {
    authorize = new URL(address); callback = new URL(authorize.searchParams.get('redirect_uri'));
    assert.equal(callback.hostname, 'localhost');
    assert.equal(callback.pathname, '/');
    assert.ok(authorize.searchParams.get('redirect_uri').endsWith('/'));
    callback.hostname = '127.0.0.1';
    callback.search = new URLSearchParams({ state: 'untrusted-state', code: 'wrong' });
    assert.equal((await fetch(callback)).status, 400);
    callback.search = new URLSearchParams({ state: authorize.searchParams.get('state'), code: 'authorization-secret' });
    const response = await fetch(callback);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.ok(!(await response.text()).includes('authorization-secret'));
  }});
  assert.equal(result.code, 'authorization-secret');
  assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(createHash('sha256').update(result.verifier).digest('base64url'), authorize.searchParams.get('code_challenge'));
  await assert.rejects(fetch(callback)); // Listener closes after completion.
});

test('redirect registration errors produce owner setup guidance without echoing server text', async () => {
  await assert.rejects(browserAuthorization({ clientId, openBrowser: async address => {
    const url = new URL(address), callback = new URL(url.searchParams.get('redirect_uri'));
    callback.hostname = '127.0.0.1';
    callback.search = new URLSearchParams({ state: url.searchParams.get('state'), error: 'invalid_request', error_description: 'AADSTS50011 redirect_uri invalid secret-server-text' });
    await fetch(callback);
  }}), error => error.message.includes('http://localhost') && !error.message.includes('secret-server-text'));
});
test('browser sign-in handles decline, timeout and cancellation', async () => {
  await assert.rejects(browserAuthorization({ clientId, openBrowser: async address => {
    const url = new URL(address), callback = new URL(url.searchParams.get('redirect_uri'));
    callback.hostname = '127.0.0.1'; callback.search = new URLSearchParams({ state: url.searchParams.get('state'), error: 'access_denied' });
    await fetch(callback);
  }}), /declined/);
  await assert.rejects(browserAuthorization({ clientId, timeoutMs: 20, openBrowser: async () => {} }), /timed out/);
  const controller = new AbortController();
  await assert.rejects(browserAuthorization({ clientId, signal: controller.signal, openBrowser: async () => controller.abort() }), /cancelled/);
});
