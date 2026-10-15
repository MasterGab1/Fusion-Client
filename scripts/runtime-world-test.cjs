// Developer-only render harness, excluded from the packaged launcher.
// Uses cached QA files. Production authentication remains mandatory.
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { Version, launch } = require('@xmcl/core');
const { GameLauncher } = require('../electron/launcher.cjs');
const { ModService } = require('../electron/mods.cjs');
const { defaults } = require('../electron/settings.cjs');
(async () => {
  const root = path.resolve('test-output/downloads'), versionId = process.argv[2] || '1.8.9';
  const resourcePath = path.join(root, 'minecraft'), gamePath = path.join(root, 'instances', `${versionId}-performance`);
  const version = await Version.parse(resourcePath, versionId);
  const game = new GameLauncher({ root, log() {}, emit() {} });
  const javaPath = await game.javaFor(version, defaults);
  const runtime = await new ModService(root).install(versionId, resourcePath, gamePath, { checkCancelled() {}, status() {} }, defaults);
  await fs.mkdir('test-output/v0.8', { recursive: true });
  const log = path.resolve(`test-output/v0.8/world-${versionId}.log`); await fs.writeFile(log, '');
  const child = await launch({ gamePath, resourcePath, version, javaPath, accessToken: '0', gameProfile: { id: '00000000000030008000000000000001', name: 'FusionQA' },
    userType: 'legacy', minMemory: 512, maxMemory: 2048, resolution: { width: 1280, height: 720 },
    extraExecOption: { windowsHide: false },
    spawn: (command, args, options) => spawn(command, [`-javaagent:${runtime.jar}=${versionId}`, `-Dfusion.config=${runtime.config}`, ...args.map(v => String(v).replaceAll('${auth_xuid}', '0').replaceAll('${clientid}', '0'))], options),
  });
  const output = data => fs.appendFile(log, String(data)); child.stdout?.on('data', output); child.stderr?.on('data', output);
  console.log(`QA Minecraft ${versionId}: PID ${child.pid}. Log: ${log}`);
  child.on('close', code => { console.log('QA game closed:', code); process.exitCode = code ? 1 : 0; });
})().catch(error => { console.error(error); process.exitCode = 1; });
