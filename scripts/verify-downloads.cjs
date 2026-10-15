const assert = require('node:assert/strict');
const path = require('node:path');
const { Version, MinecraftFolder, LaunchPrecheck, generateArguments } = require('@xmcl/core');
const { installVersionTask, installLibrariesTask, installTask } = require('@xmcl/installer');
const { GameLauncher, getManifest } = require('../electron/launcher.cjs');
(async () => {
  const root = path.resolve('test-output/downloads');
  const resourcePath = path.join(root, 'minecraft');
  const game = new GameLauncher({ root, emit: () => {}, log: console.log });
  const manifest = await getManifest();
  for (const versionId of ['1.8.9', '26.1.2']) {
    const metadata = manifest.versions.find(v => v.id === versionId);
    console.log(`Checking official downloads for ${versionId}…`);
    if (versionId === '1.8.9') await game.runTask(installTask(metadata, resourcePath), 'Installing classic test files');
    else {
      await game.runTask(installVersionTask(metadata, resourcePath), 'Installing current jar');
      await game.runTask(installLibrariesTask(await Version.parse(resourcePath, versionId)), 'Installing current libraries');
    }
    const version = await Version.parse(resourcePath, versionId);
    console.log(`Checking automatic Java ${version.javaVersion?.majorVersion || 8} for ${versionId}…`);
    const javaPath = await game.javaFor(version, { javaPath: '' });
    console.log('Java executable verified. Checking jar and libraries…');
    const options = { version, javaPath, gamePath: path.join(root, 'instances', versionId), resourcePath, gameProfile: { name: 'ArgumentTest', id: '0123456789abcdef0123456789abcdef' }, accessToken: 'test-not-a-real-token', userType: 'msa' };
    const folder = MinecraftFolder.from(resourcePath);
    await LaunchPrecheck.checkVersion(folder, version, options);
    await LaunchPrecheck.checkLibraries(folder, version, options);
    console.log('Jar and libraries verified. Extracting natives…');
    await LaunchPrecheck.checkNatives(folder, version, options);
    console.log('Natives verified. Checking launch arguments…');
    const args = (await generateArguments(options)).map(arg => arg.replaceAll('${auth_xuid}', '123').replaceAll('${clientid}', 'test-client'));
    assert.ok(!args.some(a => a.includes('${')), 'Unresolved launch placeholders');
    assert.ok(args.includes('test-not-a-real-token'));
    assert.ok(args.includes('ArgumentTest'));
    console.log(`PASS ${versionId}: official jar, libraries, native extraction, Java, and launch arguments. No game process was started.`);
  }
})().catch(error => { console.dir(error, { depth: 8 }); process.exitCode = 1; });
