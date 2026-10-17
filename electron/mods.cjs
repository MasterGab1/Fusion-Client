const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { familyOf } = require('./catalog.cjs');
const runtime = require('./runtime/manifest.json');
const PROJECTS = [
  { id: 'watermark', name: 'Watermark', description: 'A small logo in menus.' },
  { id: 'focus', name: 'Background FPS', description: 'Save power when you switch apps.' },
  { id: 'particles', name: 'Particles', description: 'Keep nearby effects, skip distant ones.' },
  { id: 'saturation', name: 'Saturation', description: 'Hunger and a client saturation estimate.', defaultEnabled: false },
  { id: 'freelook', name: 'Free look', description: 'Hold Left Alt to look around.', defaultEnabled: false },
  { id: 'fps', name: 'FPS counter', description: 'Keep an eye on your frame rate.', defaultEnabled: false },
  { id: 'coordinates', name: 'Coordinates', description: 'Know where you are.', defaultEnabled: false },
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
      const accent = /^accent=(pink|blue|violet|orange|green)$/.exec(line.trim());
      if (accent) { values.accent = accent[1]; continue; }
      const match = /^\s*(watermark|focus|particles|saturation|freelook|fps|coordinates|backgroundFps|particleDistance|menuScale)\s*=\s*(true|false|\d+)\s*$/.exec(line);
      if (!match) continue;
      const [, key, value] = match;
      if (PROJECTS.some(p => p.id === key) && /^(true|false)$/.test(value)) values[key] = value === 'true';
      else if (key === 'backgroundFps' && +value >= 5 && +value <= 60) values[key] = +value;
      else if (key === 'menuScale' && +value >= 60 && +value <= 95) values[key] = +value;
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
    const enabled = saved.schema === 2 && Array.isArray(saved.enabled) ? saved.enabled : PROJECTS.filter(p => p.defaultEnabled !== false).map(p => p.id);
    const values = await this.runtimePreferences(version);
    return { schema: 2, enabled: PROJECTS.filter(p => values[p.id] ?? enabled.includes(p.id)).map(p => p.id) };
  }
  async catalog(version) {
    const loader = loaderFor(version), preferences = await this.preferences(version);
    return { version, loader, mods: PROJECTS.map(p => ({ ...p, available: !!loader, release: `Fusion ${runtime.version}`, enabled: !!loader && preferences.enabled.includes(p.id) })) };
  }
  async configure(version, enabled) {
    if (!loaderFor(version)) throw new Error('Update Fusion to use its mods on this release.');
    if (!Array.isArray(enabled) || enabled.length > PROJECTS.length || enabled.some(id => !PROJECTS.some(p => p.id === id))) throw new Error('Invalid Fusion mod selection.');
    const file = this.profileFile(version); await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(`${file}.tmp`, JSON.stringify({ schema: 2, enabled: [...new Set(enabled)] })); await fs.rename(`${file}.tmp`, file);
    await this.writeConfig(this.configFile(version), { ...await this.runtimePreferences(version), ...Object.fromEntries(PROJECTS.map(p => [p.id, enabled.includes(p.id)])) });
    return this.catalog(version);
  }
  async install(version, _resourcePath, gamePath, launcher, settings = {}) {
    if (!loaderFor(version)) throw new Error('Update Fusion to use its mods on this release.');
    if (['fabric', 'forge'].includes(settings.launchMode) && !runtime.loaders?.[settings.launchMode]?.includes(version)) throw new Error(`Fusion has no verified ${settings.launchMode} bindings for ${version}. Choose an available loader or update Fusion.`);
    launcher.checkCancelled(); launcher.status('Preparing Fusion mods');
    const source = await fs.readFile(path.join(this.bundledRoot, 'fusion-runtime.jar'));
    if (createHash('sha512').update(source).digest('hex') !== runtime.sha512) throw new Error('Fusion runtime integrity check failed. Reinstall the launcher.');
    const folder = path.join(this.root, 'fusion-runtime', runtime.version); await fs.mkdir(folder, { recursive: true });
    const jar = path.join(folder, 'fusion-runtime.jar');
    const current = await fs.readFile(jar).catch(() => null);
    if (!current || createHash('sha512').update(current).digest('hex') !== runtime.sha512) { await fs.writeFile(`${jar}.tmp`, source); await fs.rename(`${jar}.tmp`, jar); }
    const { enabled } = await this.preferences(version);
    // One per-version configuration across Fusion, Fabric and Forge. Keep the old
    // location so existing in-game preferences migrate without losing any toggles.
    const config = this.configFile(version); await fs.mkdir(gamePath, { recursive: true });
    const previousConfig = await this.runtimePreferences(version, config);
    await this.writeConfig(config, { ...Object.fromEntries(PROJECTS.map(p => [p.id, enabled.includes(p.id)])), backgroundFps: previousConfig.backgroundFps ?? settings.backgroundFps ?? 30, menuScale: previousConfig.menuScale ?? settings.menuScale ?? 75, particleDistance: previousConfig.particleDistance ?? settings.particleDistance ?? 24, accent: ['pink', 'blue', 'violet', 'orange', 'green'].includes(settings.accent) ? settings.accent : 'pink' });
    const lockFile = path.join(gamePath, 'fusion-mods.json');
    const previous = await fs.readFile(lockFile, 'utf8').then(JSON.parse).catch(() => null);
    // Retire only JARs tracked by the previous third-party preset. Keep user files.
    for (const file of previous?.files || []) if (/^[!\w.+()-]+\.jar$/.test(file.filename)) await fs.rename(path.join(gamePath, 'mods', file.filename), path.join(gamePath, 'mods', `${file.filename}.disabled`)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await fs.writeFile(`${lockFile}.tmp`, JSON.stringify({ schema: 2, loader: 'fusion', runtimeVersion: runtime.version, enabled, sha512: runtime.sha512 }, null, 2)); await fs.rename(`${lockFile}.tmp`, lockFile);
    launcher.checkCancelled();
    const library = path.join(gamePath, 'fusion-library.properties');
    const inventory = await fs.readFile(path.join(gamePath, 'mods', '.fusion-mods.json'), 'utf8').then(JSON.parse).catch(() => ({mods:[]}));
    const names = (inventory.mods || []).map(mod => `${mod.name} · ${mod.versionName}`);
    const tracked = new Set((inventory.mods || []).map(mod => mod.filename));
    for (const name of await fs.readdir(path.join(gamePath, 'mods')).catch(() => [])) if (name.endsWith('.jar') && !tracked.has(name)) names.push(name.slice(0,-4));
    const escape = value => String(value).slice(0,150).replace(/[\r\n]/g,' ').replace(/\\/g,'\\\\').replace(/[^\x20-\x7e]/g, char => '\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
    await fs.writeFile(library, names.slice(0,200).map((name,i)=>`${i}=${escape(name)}`).join('\n'));
    return { jar, config, library };
  }
}
module.exports = { ModService, PROJECTS, loaderFor };
