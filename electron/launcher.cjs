const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { createHash } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const execute = promisify(execFile);
const { familyOf } = require('./catalog.cjs');
const MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

async function fetchResource(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (attempt < 2 && (response.status === 429 || response.status >= 500)) { await response.body?.cancel(); await delay(500 * (attempt + 1)); continue; }
      return response;
    } catch {
      if (attempt === 2) throw new Error('Cannot reach the Minecraft download service. Check your connection and retry.');
      await delay(500 * (attempt + 1));
    }
  }
}

async function getManifest(cacheRoot, force = false) {
  if (cacheRoot && !force) {
    try { const file = path.join(cacheRoot, 'versions.json'); const stat = await fs.stat(file); if (Date.now() - stat.mtimeMs < 3600000) return JSON.parse(await fs.readFile(file, 'utf8')); } catch {}
  }
  const response = await fetchResource(MANIFEST);
  if (!response.ok) throw new Error('Minecraft’s version service is unavailable. Please retry.');
  const data = await response.json();
  if (!data.latest?.release || !Array.isArray(data.versions)) throw new Error('Minecraft returned an invalid version list.');
  if (cacheRoot) { await fs.mkdir(cacheRoot, { recursive: true }); await fs.writeFile(path.join(cacheRoot, 'versions.json'), JSON.stringify(data)); }
  return data;
}

async function getJavaManifest(component) {
  const { DEFAULT_RUNTIME_ALL_URL } = require('@xmcl/installer');
  const response = await fetchResource(DEFAULT_RUNTIME_ALL_URL);
  if (!response.ok) throw new Error('Could not load the official Java runtime list. Please retry.');
  const runtimes = await response.json();
  const target = runtimes['windows-x64']?.[component]?.[0];
  if (!target) throw new Error('Mojang does not provide this Java runtime for Windows x64. Select a compatible custom Java in Settings.');
  const runtime = await fetchResource(target.manifest.url);
  if (!runtime.ok) throw new Error('Could not download the Java runtime manifest. Please retry.');
  const bytes = Buffer.from(await runtime.arrayBuffer());
  if (createHash('sha1').update(bytes).digest('hex') !== target.manifest.sha1) throw new Error('Java runtime manifest integrity check failed. Please retry.');
  return { ...JSON.parse(bytes.toString()), target: component, version: target.version };
}

class GameLauncher {
  constructor({ root, auth, emit, log, mods, community }) {
    Object.assign(this, { root, auth, emit, log, mods, community });
    this.busy = false;
    this.running = false;
    this.task = null;
    this.cancelled = false;
  }
  status(label, progress = null) { this.emit('launch-status', { label, progress, busy: this.busy, running: this.running }); }
  checkCancelled() { if (this.cancelled) throw new Error('Installation cancelled. Downloaded files are kept for next time.'); }
  async cancel() { this.cancelled = true; if (this.task) await this.task.cancel(); }

  installerOptions(settings = {}) {
    if (!this.downloadAgent) {
      const { Agent, interceptors } = require('undici');
      // One shared connection pool is essential: the installer otherwise creates a
      // separate agent for every asset, ignoring its documented concurrency option.
      this.downloadAgent = new Agent({ connections: settings.downloadThreads || 8, connect: { timeout: 30000 }, headersTimeout: 60000, bodyTimeout: 60000 })
        .compose(interceptors.retry({ maxRetries: 2, minTimeout: 500, maxTimeout: 2000 }), interceptors.redirect({ maxRedirections: 5 }));
    }
    return { dispatcher: this.downloadAgent };
  }

  async runTask(task, label) {
    this.checkCancelled();
    this.task = task;
    let last = 0;
    try {
      return await task.startAndWait({ onUpdate: active => {
        if (Date.now() - last < 150) return;
        last = Date.now();
        const progress = active.total > 0 ? Math.min(99, Math.round(active.progress / active.total * 100)) : null;
        this.status(label, progress);
      } });
    } finally { this.task = null; }
  }

  async javaFor(version, settings) {
    const { installJavaRuntimeTask } = require('@xmcl/installer');
    const requirement = version.javaVersion || { majorVersion: 8, component: 'jre-legacy' };
    const component = requirement.component;
    if (!/^[a-z0-9-]+$/i.test(component)) throw new Error('Invalid Java runtime component.');
    let javaPath = settings.javaPath;
    if (!javaPath) {
      const destination = path.join(this.root, 'runtimes', component);
      javaPath = path.join(destination, 'bin', 'java.exe');
      this.status(`Preparing Java ${requirement.majorVersion}`);
      const stamp = path.join(destination, '.fusion-complete');
      const ready = await Promise.all([fs.access(javaPath), fs.access(stamp)]).then(() => true, () => false);
      if (!ready || settings.verifyFiles) {
        const manifest = await getJavaManifest(component);
        await this.runTask(installJavaRuntimeTask({ destination, manifest, lzma: false, ...this.installerOptions(settings) }), `Installing Java ${requirement.majorVersion}`);
        await fs.writeFile(stamp, String(Date.now()));
      }
    }
    const result = await execute(javaPath, ['-version'], { windowsHide: true, timeout: 15000 }).catch(() => {
      throw new Error('Could not run Java. Use Automatic Java in Settings or select a working java.exe.');
    });
    const match = `${result.stderr} ${result.stdout}`.match(/version\s+"(?:1\.)?(\d+)/);
    if (!match || Number(match[1]) !== requirement.majorVersion) throw new Error(`This version needs Java ${requirement.majorVersion}. Choose Automatic Java in Settings.`);
    return javaPath;
  }

  async start(versionId, settings) {
    if (this.busy || this.running) throw new Error('Minecraft is already launching or running.');
    if (typeof versionId !== 'string' || !/^[a-z0-9_.+-]+$/i.test(versionId)) throw new Error('Choose a valid Minecraft version.');
    if (!familyOf(versionId)) throw new Error('Choose a release from one of the supported version families.');
    this.busy = true;
    this.cancelled = false;
    let token = '';
    try {
      this.status('Verifying Microsoft account');
      // Authentication happens in the main process; renderer-provided identities are never accepted.
      const initialSession = await this.auth.verifyForLaunch(settings.clientId);
      const verifiedAt = Date.now();
      if (initialSession?.local) throw new Error('A Microsoft account is required. Local profiles are not supported.');
      this.checkCancelled();
      const { Version, launch } = require('@xmcl/core');
      const { installTask } = require('@xmcl/installer');
      this.installerOptions(settings);
      const manifest = await getManifest(this.root);
      const metadata = manifest.versions.find(item => item.id === versionId && item.type === 'release');
      if (!metadata) throw new Error('This version is not in the official Minecraft version list.');
      const resourcePath = path.join(this.root, 'minecraft');
      const performance = settings.launchMode === 'performance';
      const community = ['fabric', 'forge'].includes(settings.launchMode);
      if (community) await this.community?.list(versionId, settings.launchMode);
      const gamePath = path.join(this.root, 'instances', performance ? `${versionId}-performance` : community ? `${versionId}-${settings.launchMode}` : versionId);
      await fs.mkdir(gamePath, { recursive: true });
      this.log(`Preparing Minecraft ${versionId}. The first launch downloads game files.`);
      this.status('Downloading & verifying game files');
      const installedStamp = path.join(resourcePath, 'versions', versionId, '.fusion-complete');
      const installed = await fs.access(installedStamp).then(() => true, () => false);
      if (!installed || settings.verifyFiles) {
        await this.runTask(installTask(metadata, resourcePath, this.installerOptions(settings)), 'Downloading & verifying game files');
        await fs.writeFile(installedStamp, String(Date.now()));
      }
      let version = await Version.parse(resourcePath, versionId);
      let fusionRuntime;
      this.checkCancelled();
      const javaPath = await this.javaFor(version, settings);
      if (community) {
        const { prepareLoader } = require('./loaders.cjs');
        version = await prepareLoader({ version: versionId, loader: settings.launchMode, resourcePath, javaPath, settings, launcher: this });
      }
      if (performance || community) {
        if (!this.mods) throw new Error('The mod manager is unavailable.');
        fusionRuntime = await this.mods.install(versionId, resourcePath, gamePath, this, settings);
      }
      // javaw avoids a console window; the game's own native window must remain visible.
      const windowedJava = javaPath.replace(/java\.exe$/i, 'javaw.exe');
      const gameJava = await fs.access(windowedJava).then(() => windowedJava, () => javaPath);
      this.checkCancelled();
      this.status('Confirming online session');
      // A long download cannot turn a stale or disconnected session into an offline launch.
      const session = Date.now() - verifiedAt > 120000 ? await this.auth.verifyForLaunch(settings.clientId) : initialSession;
      if (session.local) throw new Error('A Microsoft account is required. Local profiles are not supported.');
      this.checkCancelled();
      token = session.accessToken;
      this.status('Starting Minecraft');
      const child = await launch({
        gamePath, resourcePath, version, javaPath: gameJava,
        accessToken: session.accessToken, gameProfile: session.profile, userType: 'msa',
        launcherName: 'Fusion', launcherBrand: 'Fusion',
        minMemory: 1024, maxMemory: settings.memory * 1024,
        resolution: { width: settings.width || 1280, height: settings.height || 720, ...(settings.fullscreen ? { fullscreen: true } : {}) },
        extraExecOption: { windowsHide: false, detached: true },
        // Older core versions leave these modern account placeholders unresolved.
        spawn: (command, args, options) => {
          const gameArgs = args.map(arg => String(arg).replaceAll('${auth_xuid}', session.xuid).replaceAll('${clientid}', session.clientId));
          if (fusionRuntime) {
            gameArgs.unshift(`-javaagent:${fusionRuntime.jar}=${versionId}`, `-Dfusion.config=${fusionRuntime.config}`, `-Dfusion.library=${fusionRuntime.library}`, `-Dfusion.loader=${community ? settings.launchMode : 'vanilla'}`);
          }
          return spawn(command, gameArgs, options);
        },
      });
      this.busy = false;
      this.running = true;
      this.status('Minecraft is running', 100);
      this.emit('game-started', { version: versionId });
      this.log(`Launched ${versionId} as ${session.profile.name}.`);
      const output = data => this.log(String(data).replaceAll(token, '[redacted]').slice(0, 12000), 'game');
      child.stdout?.on('data', output);
      child.stderr?.on('data', output);
      child.on('error', () => { this.emit('game-closed', {}); this.running = false; this.status('Could not start Minecraft'); this.log('Minecraft could not start. Check the Java setting and game output.', 'error'); });
      child.on('close', code => { this.running = false; this.status('Ready to play'); this.emit('game-closed', {}); this.log(`Minecraft closed (exit code ${code ?? 'unknown'}).`, code ? 'error' : 'info'); });
      return { profile: session.profile };
    } catch (error) {
      this.busy = false;
      const message = this.cancelled ? 'Installation cancelled. Downloaded files are kept for next time.' : (error.message || (error.errors ? 'Some game files could not download or verify. Check your connection and launch again to resume.' : 'Minecraft could not launch. See game output.'));
      const safeMessage = token ? message.replaceAll(token, '[redacted]') : message;
      this.status(this.cancelled ? 'Installation cancelled' : 'Launch failed');
      this.log(safeMessage.slice(0, 1800), 'error');
      throw new Error(safeMessage.slice(0, 1800));
    } finally {
      if (this.downloadAgent) { await this.downloadAgent.destroy(); this.downloadAgent = null; }
    }
  }
}
module.exports = { GameLauncher, getManifest };
