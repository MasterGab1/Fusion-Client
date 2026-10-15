const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const MAX_PNG = 128 * 1024;
const SKIN_ID = /^[a-f0-9]{64}$/;
function validatePng(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 33 || bytes.length > MAX_PNG || !bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Choose a valid PNG skin smaller than 128 KB.');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (width !== 64 || ![32, 64].includes(height)) throw new Error('Minecraft skins must be 64 × 64 or 64 × 32 pixels.');
  return { width, height };
}
function modelName(model) {
  if (!['classic', 'slim'].includes(model)) throw new Error('Choose classic or slim arms.');
  return model;
}
function textureUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('The profile has an invalid skin URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.hostname !== 'textures.minecraft.net' || url.port || url.username || url.password || !/^\/texture\/[a-f0-9]{32,64}$/.test(url.pathname) || url.search || url.hash) throw new Error('Only official Minecraft skin textures are supported.');
  url.protocol = 'https:';
  return url.href;
}
async function limitedBody(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) throw new Error('The skin service returned an oversized response.');
  let size = 0; const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > limit) throw new Error('The skin service returned an oversized response.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
class SkinService {
  constructor({ root, defaultFile, normalize, fetcher = fetch }) {
    this.directory = path.join(root, 'skins');
    Object.assign(this, { defaultFile, normalize, fetcher });
  }
  async write(file, data) {
    await fs.mkdir(this.directory, { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    await fs.writeFile(temporary, data);
    await fs.rename(temporary, file);
  }
  file(id, extension) {
    if (!SKIN_ID.test(id || '')) throw new Error('Unknown saved skin.');
    return path.join(this.directory, `${id}.${extension}`);
  }
  async read(id) {
    const bytes = await fs.readFile(id === 'default' ? this.defaultFile : this.file(id, 'png'));
    const dimensions = validatePng(bytes);
    const metadata = id === 'default' ? { name: 'Steve', model: 'classic', source: 'Default skin' } : JSON.parse(await fs.readFile(this.file(id, 'json'), 'utf8'));
    return { id, name: String(metadata.name).slice(0, 48), model: modelName(metadata.model), source: String(metadata.source).slice(0, 80), ...dimensions, bytes };
  }
  display(skin) {
    const { bytes, ...metadata } = skin;
    return { ...metadata, dataUrl: `data:image/png;base64,${bytes.toString('base64')}` };
  }
  async list() {
    const skins = [this.display(await this.read('default'))];
    const files = await fs.readdir(this.directory).catch(() => []);
    for (const name of files.filter(n => /^[a-f0-9]{64}\.json$/.test(n)).slice(0, 80)) {
      try { skins.push(this.display(await this.read(name.slice(0, -5)))); } catch { /* Ignore incomplete or corrupted library entries. */ }
    }
    const selection = await fs.readFile(path.join(this.directory, 'selection.json'), 'utf8').then(JSON.parse).catch(() => ({}));
    const selected = skins.find(s => s.id === selection.id) || skins[0];
    return { skins, selected: selected.id, model: ['classic', 'slim'].includes(selection.model) ? selection.model : selected.model };
  }
  async select(id, model) {
    const skin = await this.read(id);
    modelName(model);
    if (skin.height === 32 && model === 'slim') throw new Error('Legacy 64 × 32 skins use classic arms.');
    if (id !== 'default') await this.write(this.file(id, 'json'), JSON.stringify({ name: skin.name, model, source: skin.source }));
    await this.write(path.join(this.directory, 'selection.json'), JSON.stringify({ id, model }));
    return { id, model };
  }
  async remove(id) {
    if (id === 'default') throw new Error('The default skin cannot be removed.');
    await this.read(id);
    await fs.rm(this.file(id, 'json'));
    await fs.rm(this.file(id, 'png'), { force: true });
    return this.list();
  }
  async add(input, name, model = 'classic', source = 'Imported PNG') {
    validatePng(input);
    const bytes = this.normalize(input);
    validatePng(bytes);
    modelName(model);
    const id = createHash('sha256').update(bytes).digest('hex');
    const entries = await fs.readdir(this.directory).catch(() => []);
    if (!entries.includes(`${id}.json`) && entries.filter(n => SKIN_ID.test(n.slice(0, -5)) && n.endsWith('.json')).length >= 80) throw new Error('Your skin library is full (80 skins).');
    await this.write(this.file(id, 'png'), bytes);
    await this.write(this.file(id, 'json'), JSON.stringify({ name: name.slice(0, 48), model, source }));
    await this.select(id, model);
    return this.list();
  }
  async request(url, options = {}, limit = MAX_PNG) {
    let response;
    try { response = await this.fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(20000) }); }
    catch { throw new Error('Could not reach Minecraft. Check your connection and try again.'); }
    if (response.status === 404 || response.status === 204) throw new Error('No Java profile or custom skin was found.');
    if (response.status === 429) throw new Error('Minecraft is limiting skin requests. Try again in a moment.');
    if (response.status === 401 || response.status === 403) throw new Error('Minecraft rejected the skin request. Sign in again and check your application access.');
    if (!response.ok) throw new Error(`Minecraft could not complete the skin request (${response.status}).`);
    return limitedBody(response, limit);
  }
  async json(url, options) {
    try { return JSON.parse((await this.request(url, options)).toString('utf8')); }
    catch (error) { if (error instanceof SyntaxError) throw new Error('Minecraft returned an invalid profile.'); throw error; }
  }
  async lookup(username) {
    if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{1,16}$/.test(username)) throw new Error('Enter a Java username (1–16 letters, numbers, or underscores).');
    const profile = await this.json(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`);
    return this.fromProfile(profile.id, profile.name);
  }
  async fromProfile(id, name) {
    if (!/^[a-f0-9]{32}$/i.test(id || '')) throw new Error('Minecraft returned an invalid profile ID.');
    const profile = await this.json(`https://sessionserver.mojang.com/session/minecraft/profile/${id}`);
    let skin;
    try { skin = JSON.parse(Buffer.from(profile.properties.find(p => p.name === 'textures').value, 'base64').toString()).textures.SKIN; }
    catch { throw new Error('This profile does not have a downloadable skin.'); }
    if (!skin?.url) throw new Error('This profile uses a default skin. Import a PNG or choose Steve from the library.');
    const bytes = await this.request(textureUrl(skin.url));
    return this.add(bytes, String(name || profile.name || 'Player'), skin.metadata?.model === 'slim' ? 'slim' : 'classic', `Java profile · ${String(name || profile.name).slice(0, 16)}`);
  }
  async apply(id, model, session) {
    if (!session?.accessToken || session.local) throw new Error('Sign in with Microsoft in the regular build to apply an account skin.');
    const skin = await this.read(id);
    modelName(model);
    if (skin.height === 32 && model === 'slim') throw new Error('Legacy skins use classic arms.');
    const body = new FormData();
    body.append('variant', model);
    body.append('file', new Blob([skin.bytes], { type: 'image/png' }), 'skin.png');
    const result = await this.json('https://api.minecraftservices.com/minecraft/profile/skins', { method: 'POST', headers: { Authorization: `Bearer ${session.accessToken}` }, body });
    if (result.id !== session.profile.id || !result.skins?.some(s => s.state === 'ACTIVE')) throw new Error('Minecraft did not confirm the skin change. Refresh your account skin before retrying.');
    return { name: session.profile.name };
  }
}
module.exports = { SkinService, validatePng, textureUrl, MAX_PNG };
