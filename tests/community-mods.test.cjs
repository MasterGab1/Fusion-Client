const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { CommunityMods, safeFile, safeDownload } = require('../electron/community-mods.cjs');
const game = { version: '1.20.1', loader: 'fabric' };
test('batch selection merges shared dependencies and keeps explicitly selected roots', async t => {
  const {service}=await fixture(t);
  const plan=await service.plan({...game,projectIds:['root','other','dep']});
  assert.equal(plan.mods.length,3);
  assert.ok(plan.mods.every(m=>m.root));
  const installed=await service.install(plan.token);
  assert.equal(installed.length,3);
  await assert.rejects(service.plan({...game,projectIds:[]}),/Select between/);
});
test('a conflict anywhere in a batch rejects the whole preview', async t => {
  const {service,versions}=await fixture(t);
  versions.root.dependencies.push({project_id:'other',dependency_type:'incompatible'});
  await assert.rejects(service.plan({...game,projectIds:['root','other']}),/conflicts/);
  assert.deepEqual(await service.list(game.version,game.loader),[]);
});
async function fixture(t, overrides = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fusion-mods-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const bytes = name => Buffer.from(`PK\x03\x04fixture-${name}`);
  const make = (name, dependencies = []) => ({ id: `${name}1`, project_id: name, game_versions: ['1.20.1'], loaders: ['fabric'], version_type: 'release', version_number: '1.0', dependencies, files: [{ primary: true, filename: `${name}.jar`, url: `https://cdn.modrinth.com/${name}.jar`, size: bytes(name).length, hashes: { sha512: createHash('sha512').update(bytes(name)).digest('hex') } }] });
  const required = (name, pin = null) => ({ project_id: name, version_id: pin, dependency_type: 'required' });
  const versions = { root: make('root', [required('dep', 'dep1'), { project_id: 'optional', dependency_type: 'optional' }]), dep: make('dep'), other: make('other', [required('dep')]), ...overrides };
  const requests = [];
  const service = new CommunityMods(root, { fetcher: async value => {
    const url = new URL(value); requests.push(url.href);
    if (url.hostname === 'cdn.modrinth.com') return new Response(bytes(path.basename(url.pathname, '.jar')));
    const pieces = url.pathname.split('/').slice(2);
    if (pieces[0] === 'version') return Response.json(Object.values(versions).find(v => v.id === pieces[1]));
    if (pieces[0] === 'project') return Response.json(pieces[2] === 'version' ? [versions[pieces[1]]] : { title: pieces[1], slug: pieces[1], project_type: 'mod', client_side: 'optional' });
    throw new Error('Unexpected request');
  } });
  return { root, service, versions, make, required, bytes, requests };
}
test('Modrinth resolves required pinned dependencies, verifies and installs atomically, preserves user files', async t => {
  const { service, requests } = await fixture(t);
  const directory = service.directory(game.version, game.loader);
  await fs.mkdir(directory, { recursive: true }); await fs.writeFile(path.join(directory, 'user.jar'), 'user file');
  const plan = await service.plan({ ...game, projectId: 'root' });
  assert.deepEqual(plan.mods.map(m => [m.projectId, m.root]), [['root', true], ['dep', false]]);
  assert.ok(!requests.some(url => url.includes('optional')));
  assert.equal((await service.install(plan.token)).length, 2);
  assert.equal(await fs.readFile(path.join(directory, 'user.jar'), 'utf8'), 'user file');
  assert.equal((await service.list(game.version, game.loader)).length, 2);
  await assert.rejects(service.remove(game.version, game.loader, 'dep'), /Required by root/);
  const next = await service.plan({ ...game, projectId: 'other' });
  assert.equal(next.mods.length, 1);
  await service.install(next.token);
  await service.remove(game.version, game.loader, 'root');
  await assert.rejects(service.remove(game.version, game.loader, 'dep'), /Required by other/);
  await service.remove(game.version, game.loader, 'other');
  await service.remove(game.version, game.loader, 'dep');
  assert.deepEqual(await fs.readdir(directory), ['.fusion-mods.json', 'user.jar']);
});
test('a bad dependency download commits neither root nor dependency', async t => {
  const { service, versions } = await fixture(t);
  versions.dep.files[0].hashes.sha512 = '0'.repeat(128);
  const plan = await service.plan({ ...game, projectId: 'root' });
  await assert.rejects(service.install(plan.token), /Integrity check/);
  assert.deepEqual(await service.list(game.version, game.loader), []);
  assert.equal(service.busy, false);
});
test('conflicting pins and incompatible loaders are rejected before downloading', async t => {
  const { service, versions, required } = await fixture(t);
  versions.dep.loaders = ['forge'];
  await assert.rejects(service.plan({ ...game, projectId: 'root' }), /No compatible/);
  versions.dep.loaders = ['fabric'];
  await service.install((await service.plan({ ...game, projectId: 'root' })).token);
  versions.dep2 = { ...versions.dep, id: 'dep2' };
  versions.other.dependencies = [required('dep', 'dep2')];
  await assert.rejects(service.plan({ ...game, projectId: 'other' }), /different version/);
});
test('incompatibilities in already-installed mods block a new install', async t => {
  const { service, versions } = await fixture(t);
  versions.root.dependencies.push({ project_id: 'other', dependency_type: 'incompatible' });
  await service.install((await service.plan({ ...game, projectId: 'root' })).token);
  await assert.rejects(service.plan({ ...game, projectId: 'other' }), /conflicts/);
});
test('stale install plans cannot overwrite newer inventory and interrupted commits recover', async t => {
  const { service } = await fixture(t);
  const first = await service.plan({ ...game, projectId: 'root' });
  const second = await service.plan({ ...game, projectId: 'other' });
  await service.install(first.token);
  await assert.rejects(service.install(second.token), /Installed mods changed/);
  const directory = service.directory(game.version, game.loader);
  await fs.rename(directory, `${directory}.backup`);
  assert.equal((await service.list(game.version, game.loader)).length, 2);
});
test('cycles terminate, unknown files are not overwritten and invalid input does not lock service', async t => {
  const { service, versions, required } = await fixture(t);
  versions.dep.dependencies = [required('root')];
  const plan = await service.plan({ ...game, projectId: 'root' });
  assert.equal(plan.mods.length, 2);
  const dir = service.directory(game.version, game.loader);
  await fs.mkdir(dir, { recursive: true }); await fs.writeFile(path.join(dir, 'root.jar'), 'manual');
  await assert.rejects(service.install(plan.token), /already exists/);
  assert.equal(await fs.readFile(path.join(dir, 'root.jar'), 'utf8'), 'manual');
  await assert.rejects(service.remove('../escape', 'fabric', 'root'), /supported/);
  assert.equal(service.busy, false);
});
test('download destinations and source hosts are strictly constrained', () => {
  for (const name of ['../evil.jar', 'C:\\evil.jar', 'evil.jar:stream', 'con.jar', 'evil.exe']) assert.throws(() => safeFile(name));
  for (const url of ['http://cdn.modrinth.com/a.jar', 'https://evil.test/a.jar', 'https://cdn.modrinth.com.evil.test/a.jar', 'https://user@cdn.modrinth.com/a.jar']) assert.throws(() => safeDownload(url));
  assert.equal(safeFile('fabric-api-0.1+1.20.1.jar'), 'fabric-api-0.1+1.20.1.jar');
});
