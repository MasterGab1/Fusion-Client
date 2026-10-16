const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { familyOf } = require('./catalog.cjs');
const API = 'https://api.modrinth.com/v2';
const USER_AGENT = 'MasterGab1/Fusion-Client/0.9.0 (https://github.com/MasterGab1/Fusion-Client)';
const keyOf = entry => entry.projectId;
function context(version, loader) {
  if (!familyOf(version) || !['fabric', 'forge'].includes(loader)) throw new Error('Choose a supported Minecraft version and Fabric or Forge.');
  if (loader === 'fabric' && ['1.8', '1.12'].includes(familyOf(version).id)) throw new Error('Use Forge for this Minecraft version.');
  return `${version}-${loader}`;
}
function safeFile(name) {
  if (typeof name !== 'string' || name.length > 180 || !/^[a-zA-Z0-9_()[\] .+\-]+\.jar$/.test(name) || /[. ]$/.test(name) || /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(name)) throw new Error('The mod has an unsafe filename.');
  return name;
}
function safeDownload(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'cdn.modrinth.com' || url.port || url.username || url.password) throw new Error('The mod download is not on the official Modrinth CDN.');
  return url.href;
}
function id(value) { if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new Error('Invalid mod identifier.'); return value; }
async function jsonRequest(route, fetcher = fetch, timeout = 25000) {
  const response = await fetcher(`${API}${route}`, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(response.status === 429 ? 'Modrinth is busy. Wait a moment and retry.' : `Modrinth request failed (${response.status}). Please retry.`);
  return response.json();
}
class CommunityMods {
  constructor(root, { fetcher = fetch, emit = () => {} } = {}) { Object.assign(this, { root, fetcher, emit }); this.plans = new Map(); this.busy = false; this.icons = new Map(); }
  directory(version, loader) { return path.join(this.root, 'instances', context(version, loader), 'mods'); }
  async read(version, loader) {
    const directory = this.directory(version, loader);
    // Recover a swap interrupted between moving the old directory and committing the new one.
    if (!await fs.stat(directory).catch(() => null) && await fs.stat(`${directory}.backup`).catch(() => null)) await fs.rename(`${directory}.backup`, directory);
    try { const lock = JSON.parse(await fs.readFile(path.join(directory, '.fusion-mods.json'), 'utf8')); if (!Array.isArray(lock.mods)) throw new Error(); return lock; }
    catch (error) { if (error.code !== 'ENOENT') throw new Error('The mod inventory could not be read. Restore its backup before changing mods.'); return { mods: [] }; }
  }
  async list(version, loader) {
    if (this.busy) throw new Error('Wait for the mod installation to finish.');
    const mods = (await this.read(version, loader)).mods;
    const missing = mods.filter(m => !m.icon && !this.icons.has(m.projectId)).slice(0, 100).map(m => id(m.projectId));
    if (missing.length) {
      try {
        const projects = await jsonRequest(`/projects?${new URLSearchParams({ids:JSON.stringify(missing)})}`,this.fetcher,4000);
        for(const project of projects) this.icons.set(project.id,project.icon_url?.startsWith('https://cdn.modrinth.com/')?project.icon_url:null);
      } catch {} // Artwork failure must not block the installed mod inventory.
      for(const projectId of missing) if(!this.icons.has(projectId))this.icons.set(projectId,null);
    }
    return mods.map(mod => ({...mod,icon:mod.icon||this.icons.get(mod.projectId)||null}));
  }
  async search({ version, loader, query = '', offset = 0 }) {
    context(version, loader);
    if (typeof query !== 'string' || query.length > 100 || !Number.isInteger(offset) || offset < 0 || offset > 5000) throw new Error('Invalid search.');
    const facets = [['project_type:mod'], [`versions:${version}`], [`categories:${loader}`], ['client_side:required', 'client_side:optional']];
    const data = await jsonRequest(`/search?${new URLSearchParams({ query, facets: JSON.stringify(facets), limit: '20', offset: String(offset), index: 'downloads' })}`, this.fetcher);
    return { total: data.total_hits, hits: data.hits.map(p => ({ id: p.project_id, name: p.title, description: p.description, author: p.author, icon: p.icon_url?.startsWith('https://cdn.modrinth.com/') ? p.icon_url : null, downloads: p.downloads, slug: p.slug })) };
  }
  async plan({ version, loader, projectId, projectIds }) {
    if (this.busy) throw new Error('Wait for the mod installation to finish.');
    context(version, loader);
    const roots = projectIds === undefined ? [projectId] : projectIds;
    if (!Array.isArray(roots) || !roots.length || roots.length > 40) throw new Error('Select between 1 and 40 mods.');
    const rootIds = new Set(roots.map(id));
    const lock = await this.read(version, loader), installed = new Map(lock.mods.map(m => [keyOf(m), m]));
    if ([...rootIds].some(id => installed.has(id))) throw new Error('A selected mod is already installed. Refresh your library.');
    const chosen = new Map(), projectCache = new Map();
    const project = async projectId => {
      id(projectId);
      if (!projectCache.has(projectId)) projectCache.set(projectId, await jsonRequest(`/project/${projectId}`, this.fetcher));
      const p = projectCache.get(projectId);
      if (p.project_type !== 'mod' || p.client_side === 'unsupported') throw new Error(`${p.title || projectId} is not a client mod.`);
      return p;
    };
    const visit = async (projectId, pinned) => {
      if (chosen.size > 80) throw new Error('This dependency tree is too large to install automatically.');
      let v;
      if (pinned) { id(pinned); v = await jsonRequest(`/version/${pinned}`, this.fetcher); if (projectId && v.project_id !== projectId) throw new Error('Modrinth returned a mismatched dependency.'); projectId = v.project_id; }
      id(projectId);
      const prior = chosen.get(projectId) || installed.get(projectId);
      if (prior) { if (pinned && prior.versionId !== pinned) throw new Error(`${prior.name} needs a different version. Remove the conflicting mod first.`); return prior; }
      const p = await project(projectId);
      if (!v) {
        const versions = await jsonRequest(`/project/${projectId}/version?${new URLSearchParams({ game_versions: JSON.stringify([version]), loaders: JSON.stringify([loader]) })}`, this.fetcher);
        v = versions.find(v => v.version_type === 'release') || versions[0];
      }
      if (!v || !v.game_versions.includes(version) || !v.loaders.includes(loader)) throw new Error(`No compatible ${loader} release of ${p.title} exists for ${version}.`);
      const file = v.files.find(f => f.primary) || v.files[0];
      if (!file || !/^[a-f0-9]{128}$/i.test(file.hashes?.sha512 || '') || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > 512 * 1024 * 1024) throw new Error(`${p.title} has no verifiable JAR download.`);
      const entry = { projectId, versionId: v.id, name: p.title, author: p.slug, icon: p.icon_url?.startsWith('https://cdn.modrinth.com/') ? p.icon_url : null, versionName: v.version_number, filename: safeFile(file.filename), url: safeDownload(file.url), sha512: file.hashes.sha512.toLowerCase(), size: file.size, required: [], incompatible: [], root: rootIds.has(projectId) };
      chosen.set(projectId, entry);
      for (const dep of v.dependencies || []) {
        if (dep.dependency_type === 'required') {
          if (!dep.project_id && !dep.version_id) throw new Error(`${p.title} has an unresolved file dependency. Install it manually in a separate profile.`);
          const resolved = await visit(dep.project_id, dep.version_id);
          entry.required.push(resolved.projectId);
        } else if (dep.dependency_type === 'incompatible') {
          let depProject = dep.project_id;
          if (!depProject && dep.version_id) depProject = (await jsonRequest(`/version/${id(dep.version_id)}`, this.fetcher)).project_id;
          if (depProject) entry.incompatible.push({ projectId: depProject, versionId: dep.version_id || null });
        }
      }
      return entry;
    };
    for (const rootId of rootIds) await visit(rootId);
    const all = [...installed.values(), ...chosen.values()];
    for (const entry of all) {
      for (const conflict of entry.incompatible || []) if (all.some(m => m.projectId === conflict.projectId && (!conflict.versionId || conflict.versionId === m.versionId))) throw new Error(`${entry.name} conflicts with another selected or installed mod.`);
      if (all.some(m => m.projectId !== entry.projectId && (m.filename.toLowerCase() === entry.filename.toLowerCase() || m.sha512 === entry.sha512))) throw new Error(`Duplicate mod file: ${entry.filename}.`);
    }
    const token = randomUUID(), mods = [...chosen.values()];
    for (const [key, plan] of this.plans) if (Date.now() > plan.expires) this.plans.delete(key);
    if (this.plans.size > 30) this.plans.clear();
    this.plans.set(token, { version, loader, mods, base: JSON.stringify(lock), expires: Date.now() + 600000 });
    return { token, mods: mods.map(({ url, ...m }) => m), totalBytes: mods.reduce((sum, m) => sum + m.size, 0) };
  }
  async transaction(version, loader, mutate) {
    if (this.busy) throw new Error('A mod installation is already in progress.');
    const directory = this.directory(version, loader), staging = `${directory}.staging`, backup = `${directory}.backup`;
    this.busy = true;
    try {
      const lock = await this.read(version, loader);
      await fs.rm(staging, { recursive: true, force: true });
      await fs.mkdir(staging, { recursive: true });
      if (await fs.stat(directory).catch(() => null)) await fs.cp(directory, staging, { recursive: true, dereference: false, filter: async source => {
        if ((await fs.lstat(source)).isSymbolicLink()) throw new Error('Move linked files out of the mods directory before using the installer.');
        return true;
      } });
      const next = await mutate(staging, lock);
      await fs.writeFile(path.join(staging, '.fusion-mods.json'), JSON.stringify(next, null, 2));
      await fs.rm(backup, { recursive: true, force: true });
      if (await fs.stat(directory).catch(() => null)) await fs.rename(directory, backup);
      try { await fs.rename(staging, directory); }
      catch (error) { if (await fs.stat(backup).catch(() => null)) await fs.rename(backup, directory); throw error; }
      await fs.rm(backup, { recursive: true, force: true }).catch(() => {});
      return next.mods;
    } finally { await fs.rm(staging, { recursive: true, force: true }).catch(() => {}); this.busy = false; }
  }
  async install(token) {
    const plan = this.plans.get(token);
    if (!plan || Date.now() > plan.expires) throw new Error('This install preview expired. Select the mod again.');
    this.plans.delete(token);
    return this.transaction(plan.version, plan.loader, async (directory, lock) => {
      if (JSON.stringify(lock) !== plan.base) throw new Error('Installed mods changed. Preview the installation again.');
      let complete = 0;
      for (const mod of plan.mods) {
        this.emit('mod-progress', { name: mod.name, complete, total: plan.mods.length });
        const file = path.join(directory, safeFile(mod.filename));
        if (await fs.lstat(file).catch(() => null)) throw new Error(`${mod.filename} already exists in the mods folder.`);
        const response = await this.fetcher(safeDownload(mod.url), { redirect: 'error', headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(180000) });
        if (!response.ok || !response.body) throw new Error(`Download failed for ${mod.name}. Nothing was installed.`);
        const hash = createHash('sha512'); let bytes = 0, signature = Buffer.alloc(0);
        const handle = await fs.open(file, 'wx');
        try {
          for await (const chunk of response.body) {
            bytes += chunk.length;
            if (bytes > mod.size) throw new Error(`Unexpected file size for ${mod.name}.`);
            if (signature.length < 4) signature = Buffer.concat([signature, Buffer.from(chunk)]).subarray(0, 4);
            hash.update(chunk); await handle.writeFile(chunk);
          }
        } finally { await handle.close(); }
        if (bytes !== mod.size || hash.digest('hex') !== mod.sha512 || signature.length < 4 || signature.readUInt32LE(0) !== 0x04034b50) throw new Error(`Integrity check failed for ${mod.name}. Nothing was installed.`);
        complete++;
      }
      this.emit('mod-progress', { complete, total: plan.mods.length });
      return { mods: [...lock.mods, ...plan.mods.map(({ url, ...entry }) => entry)] };
    });
  }
  async remove(version, loader, projectId) {
    id(projectId);
    return this.transaction(version, loader, async (directory, lock) => {
      const entry = lock.mods.find(m => m.projectId === projectId);
      if (!entry) throw new Error('This mod is not installed.');
      const users = lock.mods.filter(m => m.projectId !== projectId && m.required.includes(projectId));
      if (users.length) throw new Error(`Required by ${users.map(m => m.name).join(', ')}. Remove those mods first.`);
      const file = path.join(directory, safeFile(entry.filename));
      const bytes = await fs.readFile(file).catch(() => null);
      if (bytes && createHash('sha512').update(bytes).digest('hex') !== entry.sha512) throw new Error('This file was changed outside Fusion. Move it manually before removing its entry.');
      await fs.rm(file, { force: true });
      return { mods: lock.mods.filter(m => m.projectId !== projectId) };
    });
  }
}
module.exports = { CommunityMods, context, safeFile, safeDownload, jsonRequest };
