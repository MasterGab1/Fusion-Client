const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { GameLauncher } = require('../electron/launcher.cjs');
test('download pool limits simultaneous requests across separate files', async () => {
  let active = 0, peak = 0;
  const server = http.createServer((_req, res) => { active++; peak = Math.max(peak, active); setTimeout(() => { active--; res.end('file'); }, 30); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const game = new GameLauncher({});
  const options = game.installerOptions({ downloadThreads: 2 });
  try {
    const { request } = require('undici');
    const contents = await Promise.all(Array.from({ length: 12 }, async (_, i) => (await request(`http://127.0.0.1:${server.address().port}/${i}`, options)).body.text()));
    assert.equal(peak, 2);
    assert.ok(contents.every(c => c === 'file'));
  } finally { await game.downloadAgent.destroy(); server.close(); }
});
