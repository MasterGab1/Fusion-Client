const { app, BrowserWindow, ipcMain, shell, safeStorage, dialog, session, protocol, net, nativeImage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { AuthService } = require('./auth.cjs');
const { GameLauncher, getManifest } = require('./launcher.cjs');
const { FAMILIES, familyOf, filterCatalog } = require('./catalog.cjs');
const { SkinService, MAX_PNG } = require('./skins.cjs');
const { defaults, validateSettings } = require('./settings.cjs');
const { serial } = require('./serial.cjs');
const saveSettingsInOrder = serial();
const { ModService } = require('./mods.cjs');
const { UpdateService, REPOSITORY } = require('./updates.cjs');
const { microsoftClientId, discordApplicationId } = require('../package.json');
const { DiscordPresence } = require('./discord.cjs');
const { CommunityMods } = require('./community-mods.cjs');
const { NewsService, articleUrl } = require('./news.cjs');

protocol.registerSchemesAsPrivileged([{ scheme: 'fusion-art', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

app.setName('Fusion Launcher');
if (process.env.FUSION_TEST_DATA) app.setPath('userData', process.env.FUSION_TEST_DATA);
const root = app.getPath('userData');
const settingsPath = path.join(root, 'settings.json');
const accountPath = path.join(root, 'account.bin');
const maxMemory = Math.max(2, Math.min(32, Math.floor(os.totalmem() / 1024 ** 3) - 2));
let settings = { ...defaults, memory: Math.min(4, maxMemory) };
let window;
let manifest;
let signingIn = false;
let applyingSkin = false;
let auth;
let launcher;
let updates;
let presence;
const logs = [];
async function backgrounds() {
  const found = {};
  for (const family of FAMILIES) {
    try { const stat = await fs.stat(path.join(root, 'backgrounds', `${family.id}.jpg`)); found[family.id] = `fusion-art://background/${family.id}?v=${stat.mtimeMs}`; } catch {}
  }
  return found;
}
const links = {
  news: 'https://www.minecraft.net/en-us/articles',
  account: 'https://www.minecraft.net/en-us/msaprofile',
  releases: `${REPOSITORY}/releases`,
  contact: 'https://github.com/MasterGab1',
};
function emit(type, data) {
  if (type === 'game-started') presence?.setGame(data.version);
  if (type === 'game-closed') presence?.setGame(null);
  if (!window || window.isDestroyed()) return;
  if (type === 'game-started' && settings.minimizeOnLaunch) window.minimize();
  if (type === 'game-closed' && settings.restoreAfterGame) { window.restore(); window.show(); }
  window.webContents.send('fusion:event', { type, data });
}
function log(message, level = 'info') {
  const entry = { time: new Date().toISOString(), message, level };
  logs.push(entry); if (logs.length > 400) logs.shift();
  emit('log', entry);
}
async function atomicWrite(file, data) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(`${file}.tmp`, data); await fs.rename(`${file}.tmp`, file); }
const vault = {
  async read() {
    try { return JSON.parse(safeStorage.decryptString(await fs.readFile(accountPath))); }
    catch (error) { if (error.code !== 'ENOENT') log('Saved sign-in could not be unlocked. Please sign in again.', 'error'); return null; }
  },
  async write(value) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows secure storage is unavailable. Fusion cannot save this account securely.');
    if (!value.refreshToken) throw new Error('Microsoft did not grant a renewable session. Please sign in again.');
    await atomicWrite(accountPath, safeStorage.encryptString(JSON.stringify(value)));
  },
};
function register(name, handler) {
  ipcMain.handle(`fusion:${name}`, async (event, ...args) => {
    const validUrl = process.env.FUSION_DEV_URL || pathToFileURL(path.join(__dirname, '../dist/index.html')).href;
    if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame || !event.senderFrame.url.startsWith(validUrl)) throw new Error('Untrusted request.');
    try { return { ok: true, value: await handler(...args) }; }
    catch (error) { return { ok: false, error: error.message || 'Something went wrong. Please try again.' }; }
  });
}
async function loadVersions(refresh = false) {
  try {
    manifest = await getManifest(root, refresh === true);
    return { ...filterCatalog(manifest), cached: false };
  } catch {
    try {
      const cached = JSON.parse(await fs.readFile(path.join(root, 'versions.json'), 'utf8'));
      return { ...filterCatalog(cached), cached: true };
    } catch { throw new Error('Cannot load Minecraft versions. Connect to the internet and click Retry.'); }
  }
}
async function setup() {
  try { const saved = JSON.parse(await fs.readFile(settingsPath, 'utf8')); for (const [key, value] of Object.entries(saved)) { try { settings = validateSettings(settings, { [key]: value }, maxMemory); } catch {} } } catch {}
  if (!familyOf(settings.selectedVersion)) settings.selectedVersion = '1.8.9';
  delete settings.showSnapshots;
  auth = new AuthService({ vault, emit });
  const skins = new SkinService({ root, defaultFile: path.join(__dirname, '../dist/assets/skins/steve.png'), normalize: bytes => {
    const image = nativeImage.createFromBuffer(bytes);
    if (image.isEmpty()) throw new Error('This PNG could not be decoded. Choose another skin.');
    return image.toPNG();
  } });
  const mods = new ModService(root);
  const community = new CommunityMods(root, { emit });
  const news = new NewsService(root);
  const packs = new (require('./modpacks.cjs').Modpacks)(root,{emit});
  presence = new DiscordPresence({ clientId: discordApplicationId, emit: data => emit('discord', data) });
  launcher = new GameLauncher({ root, mods, community, auth, emit, log });
  const installed = app.isPackaged && require('node:fs').existsSync(path.join(path.dirname(process.execPath), 'Uninstall Fusion Launcher.exe'));
  updates = new UpdateService({ installed, version: app.getVersion(), emit: data => emit('update', data),
    createUpdater: () => require('electron-updater').autoUpdater,
    blocked: () => launcher.busy || launcher.running || signingIn || applyingSkin || community.busy || packs.busy,
  });
  register('updates-state', () => updates.snapshot());
  register('updates-check', () => updates.check());
  register('updates-download', () => updates.download());
  register('updates-install', () => updates.install());
  register('state', async () => ({ settings, profile: (await vault.read())?.profile || null, discord: presence.snapshot(), maxMemory, logs, appVersion: app.getVersion(), root, families: FAMILIES, backgrounds: await backgrounds() }));
  register('versions', loadVersions);
  register('settings', patch => saveSettingsInOrder(async () => {
    const uiOnly = patch && Object.keys(patch).every(key => ['outputHeight','outputFontSize','outputAutoOpen','showNews','reducedMotion','startupAnimation','skinAutoRotate'].includes(key));
    if (!uiOnly && (launcher.busy || launcher.running || signingIn || applyingSkin || community.busy || packs.busy)) throw new Error('Wait for the current account, download or game operation to finish before changing settings.');
    if (!patch || typeof patch !== 'object') throw new Error('Invalid settings.');
    const next = validateSettings(settings, patch, maxMemory);
    const limits = Object.fromEntries(['backgroundFps', 'particleDistance', 'menuScale'].filter(key => next[key] !== settings[key]).map(key => [key, next[key]]));
    if (Object.keys(limits).length) await mods.updateLimits(limits);
    await atomicWrite(settingsPath, JSON.stringify(next, null, 2));
    settings = next;
    presence.setEnabled(settings.discordPresence);
    window.setIcon(path.join(__dirname, `../dist/assets/branding/${settings.accent}.png`));
    return settings;
  }));
  register('sign-in', async () => {
    if (signingIn || launcher.busy || launcher.running || applyingSkin) throw new Error('Another session is already active.');
    signingIn = true;
    try { const profile = await auth.signInBrowser(microsoftClientId, url => shell.openExternal(url)); emit('account', profile); log(`Signed in as ${profile.name}. Java Edition ownership verified.`); return profile; }
    finally { signingIn = false; }
  });
  register('cancel-sign-in', () => { auth.cancel(); });
  register('prepare-official', async version => {
    if (signingIn || applyingSkin || community.busy || packs.busy) throw new Error('Wait for the current operation to finish.');
    const { prepareOfficial } = require('./official-launcher.cjs');
    return prepareOfficial({ directory: path.join(app.getPath('appData'), '.minecraft'), launcher, version, settings, mods });
  });
  register('sign-out', async () => {
    if (launcher.busy || launcher.running || applyingSkin) throw new Error('Wait for the game or skin change to finish before signing out.');
    auth.cancel(); await fs.rm(accountPath, { force: true }); emit('account', null); log('Signed out.');
  });
  register('launch', version => {
    if (applyingSkin || signingIn || community.busy || packs.busy) throw new Error('Wait for the current account operation or mod download to finish before launching.');
    return launcher.start(version, { ...settings, clientId: microsoftClientId });
  });
  register('mods-catalog', (version, refresh) => mods.catalog(version, refresh === true));
  register('community-search', query => community.search(query));
  register('community-list', (version, loader) => community.list(version, loader));
  register('community-plan', query => community.plan(query));
  register('community-install', token => {
    if (launcher.busy || launcher.running || packs.busy) throw new Error('Wait for Minecraft or the pack installation to finish.');
    return community.install(token);
  });
  register('community-remove', (version, loader, id) => {
    if (launcher.busy || launcher.running) throw new Error('Close Minecraft before removing mods.');
    return community.remove(version, loader, id);
  });
  register('packs-search', query => packs.search(query));
  register('packs-list', () => packs.list());
  register('packs-plan', query => packs.plan(query));
  register('packs-import', async () => {
    if (packs.busy || launcher.busy || launcher.running) throw new Error('Wait for the current operation to finish.');
    const result=await dialog.showOpenDialog(window,{title:'Import modpack',properties:['openFile'],filters:[{name:'Modrinth modpack',extensions:['mrpack']}]});
    if(result.canceled)return null;const file=result.filePaths[0];if((await fs.stat(file)).size>64*1024*1024)throw new Error('Choose a pack archive smaller than 64 MB.');
    return packs.preview(await fs.readFile(file));
  });
  register('packs-install', token => {
    if (launcher.busy || launcher.running || community.busy) throw new Error('Wait for Minecraft or the mod installation to finish.');
    return packs.install(token);
  });
  register('packs-launch', async id => {
    if (signingIn || applyingSkin || community.busy || packs.busy) throw new Error('Wait for the current operation to finish.');
    const pack=await packs.read(id);
    return launcher.start(pack.version,{...settings,launchMode:pack.loader,clientId:microsoftClientId},pack);
  });
  register('packs-folder', async id => {const pack=await packs.read(id);const error=await shell.openPath(pack.gamePath);if(error)throw new Error(error);});
  register('news', refresh => news.get(refresh === true));
  register('article', async value => {
    const url = articleUrl(value);
    if (!url) throw new Error('This article is not on Minecraft.net.');
    await shell.openExternal(url);
  });
  register('mods-configure', async (version, enabled) => {
    if (launcher.busy || launcher.running) throw new Error('Close Minecraft before changing mods.');
    return mods.configure(version, enabled);
  });
  register('skins-list', () => skins.list());
  register('skins-select', (id, model) => skins.select(id, model));
  register('skins-remove', id => skins.remove(id));
  register('skins-lookup', username => skins.lookup(username));
  register('skins-current', async () => {
    const profile = (await vault.read())?.profile;
    if (!profile) throw new Error('Sign in to load your account skin.');
    return skins.fromProfile(profile.id, profile.name);
  });
  register('skins-import', async () => {
    const result = await dialog.showOpenDialog(window, { title: 'Import Minecraft skin', properties: ['openFile'], filters: [{ name: 'Minecraft skin', extensions: ['png'] }] });
    if (result.canceled) return null;
    const source = result.filePaths[0];
    if ((await fs.stat(source)).size > MAX_PNG) throw new Error('Choose a PNG skin smaller than 128 KB.');
    return skins.add(await fs.readFile(source), path.basename(source, path.extname(source)));
  });
  register('skins-export', async id => {
    const skin = await skins.read(id);
    const result = await dialog.showSaveDialog(window, { title: 'Download skin PNG', defaultPath: `${skin.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`, filters: [{ name: 'PNG skin', extensions: ['png'] }] });
    if (result.canceled || !result.filePath) return null;
    await fs.writeFile(result.filePath, skin.bytes);
    return { saved: true };
  });
  register('skins-apply', async (id, model) => {
    if (applyingSkin || signingIn || launcher.busy || launcher.running) throw new Error('Wait for the current operation or game to finish before changing your skin.');
    applyingSkin = true;
    try {
      await skins.read(id);
      const session = await auth.verifyForLaunch(microsoftClientId);
      const result = await skins.apply(id, model, session);
      log(`Skin updated for ${result.name}.`);
      return result;
    } finally { applyingSkin = false; }
  });
  register('cancel-launch', () => launcher.cancel());
  register('open-folder', async () => { await fs.mkdir(root, { recursive: true }); const error = await shell.openPath(root); if (error) throw new Error(error); });
  register('open-link', async key => {
    if (key === 'signin-help') {
      const destination = path.join(root, 'MICROSOFT-SETUP.md');
      await fs.copyFile(path.join(app.getAppPath(), 'docs', 'MICROSOFT-SETUP.md'), destination);
      const error = await shell.openPath(destination); if (error) throw new Error(error); return;
    }
    if (key === 'updates-guide') {
      const name = 'UPDATES.md';
      const destination = path.join(root, name);
      await fs.copyFile(path.join(app.getAppPath(), 'docs', name), destination);
      const error = await shell.openPath(destination); if (error) throw new Error(error); return;
    }
    if (!links[key]) throw new Error('Unknown link.');
    await shell.openExternal(links[key]);
  });
  register('pick-java', async () => {
    const result = await dialog.showOpenDialog(window, { title: 'Select Java executable', properties: ['openFile'], filters: [{ name: 'Java executable', extensions: ['exe'] }] });
    return result.canceled ? null : result.filePaths[0];
  });
  register('background-reset', async familyId => {
    if (!FAMILIES.some(family => family.id === familyId)) throw new Error('Unknown version family.');
    await fs.unlink(path.join(root, 'backgrounds', `${familyId}.jpg`)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    return backgrounds();
  });
  register('background', async familyId => {
    if (!FAMILIES.some(family => family.id === familyId)) throw new Error('Unknown version family.');
    const result = await dialog.showOpenDialog(window, { title: `Background for ${familyId}`, properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] });
    if (result.canceled) return null;
    const source = result.filePaths[0];
    if ((await fs.stat(source)).size > 20 * 1024 * 1024) throw new Error('Choose an image smaller than 20 MB.');
    let image = nativeImage.createFromPath(source);
    if (image.isEmpty()) throw new Error('This image could not be opened. Use a PNG, JPG, or WebP file.');
    if (image.getSize().width > 1920) image = image.resize({ width: 1920, quality: 'best' });
    await atomicWrite(path.join(root, 'backgrounds', `${familyId}.jpg`), image.toJPEG(90));
    return backgrounds();
  });
  register('window', action => {
    if (action === 'minimize') window.minimize();
    if (action === 'maximize') window.isMaximized() ? window.unmaximize() : window.maximize();
    if (action === 'close') window.close();
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  protocol.handle('fusion-art', request => {
    const url = new URL(request.url);
    const familyId = url.pathname.slice(1);
    if (url.hostname !== 'background' || !FAMILIES.some(family => family.id === familyId)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(path.join(root, 'backgrounds', `${familyId}.jpg`)).href);
  });
  createWindow();
  if (app.isPackaged && settings.autoCheckUpdates) {
    const timer = setTimeout(() => updates.check().catch(() => {}), 12000); timer.unref();
  }
  const rpcTimer = setTimeout(() => presence.setEnabled(settings.discordPresence), 2000); rpcTimer.unref();
  log('Launcher started.');
}
function createWindow() {
  window = new BrowserWindow({ width: 1120, height: 730, minWidth: 980, minHeight: 660, frame: false, backgroundColor: '#111214', show: true,
    icon: path.join(__dirname, `../dist/assets/branding/${settings.accent}.png`),
    webPreferences: { additionalArguments: [`--fusion-accent=${settings.accent}`, `--fusion-motion=${settings.reducedMotion ? 'reduced' : 'full'}`], preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true },
  });
  let closing = false;
  window.on('close', event => {
    if (closing) return;
    event.preventDefault();
    saveSettingsInOrder.drain().finally(() => { closing = true; if (!window.isDestroyed()) window.close(); });
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  if (process.env.FUSION_DEV_URL && !app.isPackaged) window.loadURL(process.env.FUSION_DEV_URL);
  else window.loadFile(path.join(__dirname, '../dist/index.html'));
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(setup).catch(error => { dialog.showErrorBox('Fusion could not start', error.message); app.quit(); });
  app.on('before-quit', () => presence?.stop());
  app.on('window-all-closed', () => { auth?.cancel(); app.quit(); });
}
