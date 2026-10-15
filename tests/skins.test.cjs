const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { SkinService, validatePng, textureUrl } = require('../electron/skins.cjs');
const defaultFile = path.resolve('public/assets/skins/steve.png');
const playerId = '0123456789abcdef0123456789abcdef';
async function harness(t, responses = []) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fusion-skins-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const calls = [];
  const service = new SkinService({ root, defaultFile, normalize: b => b, fetcher: async (url, options) => { calls.push({ url, options }); const next = responses.shift(); if (next instanceof Error) throw next; if (!next) throw new Error('Unexpected request'); return next; } });
  return { service, calls, root, png: await fs.readFile(defaultFile) };
}
const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
test('skin import validates type, dimensions and size before decoding', async t => {
  const { png } = await harness(t);
  assert.deepEqual(validatePng(png), { width: 64, height: 64 });
  assert.throws(() => validatePng(Buffer.from('<svg/>')), /valid PNG/);
  assert.throws(() => validatePng(Buffer.alloc(200000)), /valid PNG/);
  const wrong = Buffer.from(png); wrong.writeUInt32BE(2048, 16);
  assert.throws(() => validatePng(wrong), /64 × 64/);
});
test('library saves, deduplicates, selects, exports original pixels, and persists on restart', async t => {
  const { service, root, png } = await harness(t);
  const first = await service.add(png, 'Imported test');
  assert.equal(first.skins.length, 2);
  assert.notEqual(first.selected, 'default');
  assert.equal((await service.add(png, 'Imported twice')).skins.length, 2);
  await service.select(first.selected, 'slim');
  const second = new SkinService({ root, defaultFile, normalize: b => b });
  assert.equal((await second.list()).selected, first.selected);
  assert.equal((await second.list()).model, 'slim');
  assert.equal((await second.read(first.selected)).model, 'slim');
  assert.deepEqual((await second.read(first.selected)).bytes, png);
  await assert.rejects(service.select('../account.bin', 'classic'), /Unknown saved skin/);
  await assert.rejects(service.select('default', 'unknown'), /classic or slim/);
  assert.equal((await second.remove(first.selected)).selected, 'default');
  assert.equal((await second.list()).skins.length, 1);
  assert.deepEqual(await fs.readFile(defaultFile), png);
  await assert.rejects(second.remove('default'), /cannot be removed/);
});
test('texture downloader only fetches official textures and upgrades HTTP', () => {
  const suffix = '/texture/' + 'a'.repeat(64);
  assert.equal(textureUrl('http://textures.minecraft.net' + suffix), 'https://textures.minecraft.net' + suffix);
  for (const value of ['file:///account.bin', 'https://localhost' + suffix, 'https://textures.minecraft.net.evil.com' + suffix, 'https://textures.minecraft.net:444' + suffix, 'https://user@textures.minecraft.net' + suffix, 'https://textures.minecraft.net' + suffix + '?redirect=1']) assert.throws(() => textureUrl(value));
});
test('username lookup loads the official profile, texture, and correct slim model', async t => {
  const png = await fs.readFile(defaultFile);
  const texture = 'http://textures.minecraft.net/texture/' + 'a'.repeat(64);
  const encoded = Buffer.from(JSON.stringify({ textures: { SKIN: { url: texture, metadata: { model: 'slim' } } } })).toString('base64');
  const { service, calls } = await harness(t, [json({ id: playerId, name: 'SkinTester' }), json({ properties: [{ name: 'textures', value: encoded }] }), new Response(png)]);
  const result = await service.lookup('SkinTester');
  assert.equal(result.model, 'slim');
  assert.equal(result.skins.at(-1).name, 'SkinTester');
  assert.equal(calls.length, 3);
  assert.ok(calls.every(c => c.options.redirect === 'error'));
  assert.ok(calls[2].url.startsWith('https://textures.minecraft.net/'));
  await assert.rejects(service.lookup('../bad'), /Java username/);
  assert.equal(calls.length, 3);
});
test('download failures and oversized responses produce useful errors', async t => {
  const { service } = await harness(t, [new Response('', { status: 404 }), new Response('', { status: 429 }), new Response(Buffer.alloc(150000)), new Error('offline')]);
  await assert.rejects(service.lookup('unknown'), /No Java profile/);
  await assert.rejects(service.lookup('rate_limited'), /limiting/);
  await assert.rejects(service.lookup('large'), /oversized/);
  await assert.rejects(service.lookup('offline'), /connection/);
});
test('applying a skin sends authenticated PNG multipart data and confirms the profile', async t => {
  const { service, calls, png } = await harness(t, [json({ id: playerId, skins: [{ state: 'ACTIVE' }] })]);
  const session = { accessToken: 'private-test-token', profile: { id: playerId, name: 'Owner' } };
  assert.deepEqual(await service.apply('default', 'slim', session), { name: 'Owner' });
  const request = calls[0];
  assert.equal(request.url, 'https://api.minecraftservices.com/minecraft/profile/skins');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.Authorization, 'Bearer private-test-token');
  assert.equal(request.options.body.get('variant'), 'slim');
  assert.deepEqual(Buffer.from(await request.options.body.get('file').arrayBuffer()), png);
});
test('local profiles and missing sessions cannot upload skins', async t => {
  const { service, calls } = await harness(t);
  await assert.rejects(service.apply('default', 'classic', null), /Sign in/);
  await assert.rejects(service.apply('default', 'classic', { local: true, accessToken: '0' }), /Sign in/);
  assert.equal(calls.length, 0);
});
test('rejected or unconfirmed skin changes never report success', async t => {
  const { service } = await harness(t, [new Response('', { status: 403 }), json({ id: playerId, skins: [] })]);
  const session = { accessToken: 'private-test-token', profile: { id: playerId } };
  await assert.rejects(service.apply('default', 'classic', session), /rejected/);
  await assert.rejects(service.apply('default', 'classic', session), /did not confirm/);
});
