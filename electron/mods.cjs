const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { familyOf } = require('./catalog.cjs');
const runtime = require('./runtime/manifest.json');
const PROJECTS = [
  { id: 'watermark', name: 'Fusion HUD', description: 'White Fusion logo in the mods overlay. Hidden during gameplay.' },
  { id: 'focus', name: 'Fusion Focus', description: 'Caps FPS while Minecraft is unfocused and restores the game limit on return.' },
  { id: 'particles', name: 'Fusion Particles', description: 'Expires distant particles early to reduce ticking and drawing work.' },
];
function loaderFor(version) {
  if (!familyOf(version)) throw new Error('Unsupported Minecraft version.');
  return runtime.versions.includes(version) ? 'fusion' : null;
}
class ModService {
  constructor(root, bundledRoot = path.join(__dirname, 'runtime')) { this.root = root; this.bundledRoot = bundledRoot; }
  profileFile(version) { loaderFor(version); return path.join(this.root, 'profiles', `${version}.json`); }
  configFile(version) { loaderFor(version); return path.join(this.root, 'instances', `${version}-performance`, 'fusion.properties'); }
  async runtimePreferences(version, file = this.configFile(version)) {
    const source = await fs.readFile(file, 'utf8').catch(error => { if (error.code !== 'ENOENT') throw error; return ''; });
    const values = {};
    for (const line of source.split(/\r?\n/)) {
      const accent = /^accent=(pink|blue|violet)$/.exec(line.trim());
      if (accent) { values.accent = accent[1]; continue; }
      const match = /^\s*(watermark|focus|particles|backgroundFps|particleDistance)\s*=\s*(true|false|\d+)\s*$/.exec(line);
      if (!match) continue;
      const [, key, value] = match;
      if (PROJECTS.some(p => p.id === key) && /^(true|false)$/.test(value)) values[key] = value === 'true';
      else if (key === 'backgroundFps' && +value >= 5 && +value <= 60) values[key] = +value;
      else if (key === 'particleDistance' && +value >= 8 && +value <= 64) values[key] = +value;
    }
    return values;
  }
  async writeConfig(file, values) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(`${file}.tmp`, Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n');
    await fs.rename(`${file}.tmp`, file);
  }
  async updateLimits(patch) {
    for (const version of runtime.versions) {
      const values = await this.runtimePreferences(version);
      if (Object.keys(values).length) await this.writeConfig(this.configFile(version), { ...values, ...patch });
    }
  }
  async preferences(version) {
    const saved = await fs.readFile(this.profileFile(version), 'utf8').then(JSON.parse).catch(() => ({}));
    const enabled = saved.schema === 2 && Array.isArray(saved.enabled) ? saved.enabled : PROJECTS.map(p => p.id);
    const values = await this.runtimePreferences(version);
    return { schema: 2, enabled: PROJECTS.filter(p => values[p.id] ?? enabled.includes(p.id)).map(p => p.id) };
  }
  async catalog(version) {
    const loader = loaderFor(version), preferences = await this.preferences(version);
    return { version, loader, mods: PROJECTS.map(p => ({ ...p, available: !!loader, release: `Fusion ${runtime.version}`, enabled: !!loader && preferences.enabled.includes(p.id) })) };
  }
  async configure(version, enabled) {
    if (!loaderFor(version)) throw new Error('Fusion mods are available on the eight default releases. Choose Vanilla for other subversions.');
    if (!Array.isArray(enabled) || enabled.length > PROJECTS.length || enabled.some(id => !PROJECTS.some(p => p.id === id))) throw new Error('Invalid Fusion mod selection.');
    const file = this.profileFile(version); await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(`${file}.tmp`, JSON.stringify({ schema: 2, enabled: [...new Set(enabled)] })); await fs.rename(`${file}.tmp`, file);
    await this.writeConfig(this.configFile(version), { ...await this.runtimePreferences(version), ...Object.fromEntries(PROJECTS.map(p => [p.id, enabled.includes(p.id)])) });
    return this.catalog(version);
  }
  async install(version, _resourcePath, gamePath, launcher, settings = {}) {
    if (!loaderFor(version)) throw new Error('Fusion mods support 1.8.9, 1.12.2, 1.16.5, 1.18.2, 1.19.2, 1.20.1, 1.21, and 26.1.2. Use Vanilla for other subversions.');
    launcher.checkCancelled(); launcher.status('Preparing Fusion mods');
    const source = await fs.readFile(path.join(this.bundledRoot, 'fusion-runtime.jar'));
    if (createHash('sha512').update(source).digest('hex') !== runtime.sha512) throw new Error('Fusion runtime integrity check failed. Reinstall the launcher.');
    const folder = path.join(this.root, 'fusion-runtime', runtime.version); await fs.mkdir(folder, { recursive: true });
    const jar = path.join(folder, 'fusion-runtime.jar');
    const current = await fs.readFile(jar).catch(() => null);
    if (!current || createHash('sha512').update(current).digest('hex') !== runtime.sha512) { await fs.writeFile(`${jar}.tmp`, source); await fs.rename(`${jar}.tmp`, jar); }
    const { enabled } = await this.preferences(version);
    const config = path.join(gamePath, 'fusion.properties'); await fs.mkdir(gamePath, { recursive: true });
    const previousConfig = await this.runtimePreferences(version, config);
    await this.writeConfig(config, { ...Object.fromEntries(PROJECTS.map(p => [p.id, enabled.includes(p.id)])), backgroundFps: previousConfig.backgroundFps ?? settings.backgroundFps ?? 30, particleDistance: previousConfig.particleDistance ?? settings.particleDistance ?? 24, accent: ['pink', 'blue', 'violet'].includes(settings.accent) ? settings.accent : 'pink' });
    const lockFile = path.join(gamePath, 'fusion-mods.json');
    const previous = await fs.readFile(lockFile, 'utf8').then(JSON.parse).catch(() => null);
    // Retire only JARs tracked by the previous third-party preset. Keep user files.
    for (const file of previous?.files || []) if (/^[!\w.+()-]+\.jar$/.test(file.filename)) await fs.rename(path.join(gamePath, 'mods', file.filename), path.join(gamePath, 'mods', `${file.filename}.disabled`)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await fs.writeFile(`${lockFile}.tmp`, JSON.stringify({ schema: 2, loader: 'fusion', runtimeVersion: runtime.version, enabled, sha512: runtime.sha512 }, null, 2)); await fs.rename(`${lockFile}.tmp`, lockFile);
    launcher.checkCancelled();
    return { jar, config };
  }
}
module.exports = { ModService, PROJECTS, loaderFor };
