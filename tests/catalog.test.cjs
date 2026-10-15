const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FAMILIES, familyOf, filterCatalog } = require('../electron/catalog.cjs');
const { GameLauncher } = require('../electron/launcher.cjs');
test('catalog contains only the eight requested families', () => {
  assert.deepEqual(FAMILIES.map(f => f.id), ['1.8', '1.12', '1.16', '1.18', '1.19', '1.20', '1.21', '26.1']);
  assert.deepEqual(FAMILIES.map(f => f.preferred), ['1.8.9', '1.12.2', '1.16.5', '1.18.2', '1.19.2', '1.20.1', '1.21', '26.1.2']);
});
test('family filtering includes point releases but excludes prefix collisions and snapshots', () => {
  const ids = ['1.8', '1.8.9', '1.12', '1.12.1', '1.12.2', '1.16.5', '1.18.2', '1.19.2', '1.20.1', '1.21', '1.21.11', '26.1', '26.1.2', '26.10', '26.2', '26.3', '1.17', '1.120.1', '1.12-pre1', '26.1-snapshot-1'];
  const result = filterCatalog({ versions: ids.map(id => ({ id, type: id.includes('-') ? 'snapshot' : 'release' })) });
  assert.deepEqual(result.families.find(f => f.id === '1.12').versions.map(v => v.id), ['1.12', '1.12.1', '1.12.2']);
  assert.ok(result.versions.some(v => v.id === '1.21.11'));
  for (const id of ['26.10', '26.2', '26.3', '1.17', '1.120.1', '1.12-pre1', '26.1-snapshot-1', '../1.12']) assert.equal(familyOf(id), undefined);
});
test('unsupported versions are blocked before authentication or download', async () => {
  let authCalled = false;
  const game = new GameLauncher({ auth: { verifyForLaunch: async () => { authCalled = true; } } });
  await assert.rejects(game.start('26.3', {}), /supported version families/);
  assert.equal(authCalled, false);
});
