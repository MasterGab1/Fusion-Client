const REPOSITORY = 'https://github.com/MasterGab1/Fusion-Client';
function validateRelease(info) {
  if (!info || !/^\d+\.\d+\.\d+$/.test(info.version)) throw new Error('The update has an invalid release version.');
  const expected = `Fusion-Setup-${info.version}.exe`;
  if (!Array.isArray(info.files) || info.files.length !== 1 || info.files[0].url !== expected || !/^[A-Za-z0-9+/]{86}==$/.test(info.files[0].sha512)) {
    throw new Error('The update does not match this launcher edition.');
  }
  return { version: info.version, name: typeof info.releaseName === 'string' ? info.releaseName.slice(0, 160) : `Fusion ${info.version}` };
}
function friendlyError(error) {
  const message = String(error?.message || error);
  if (/404|latest.version|channel.file|published.versions|releases feed/i.test(message)) return 'No published update is available. Sign in to GitHub on this PC and check that the repository contains a complete published release.';
  if (/PRIVATE_ACCESS/.test(message)) return 'Private updates need GitHub access on this PC. Open the publishing guide for the one-time sign-in command.';
  if (/401|403/.test(message)) return 'GitHub denied access to this private release. Renew your GitHub sign-in and confirm repository access.';
  if (/sha512|checksum|signature/i.test(message)) return 'Update verification failed. Nothing was installed. Check again to retry.';
  if (/net::|ENOTFOUND|ETIMEDOUT|ECONN|network/i.test(message)) return 'Could not reach GitHub. Check your connection and try again.';
  return 'The update could not be completed. Try checking again.';
}
class UpdateService {
  constructor({ createUpdater, installed, version, emit, blocked = () => false, getToken = null }) {
    Object.assign(this, { createUpdater, installed, emit, blocked, getToken });
    this.state = { status: 'idle', currentVersion: version, channel: 'Official', installed, repository: REPOSITORY, version: null, percent: 0, error: '' };
    this.pending = false;
  }
  snapshot() { return { ...this.state }; }
  set(patch) { Object.assign(this.state, patch); this.emit(this.snapshot()); return this.snapshot(); }
  engine() {
    if (this.updater) return this.updater;
    const updater = this.updater = this.createUpdater();
    updater.logger = null;
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.channel = 'latest';
    updater.allowDowngrade = false;
    updater.allowPrerelease = false;
    updater.on('update-available', info => {
      try { this.release = validateRelease(info); this.set({ status: 'available', ...this.release, error: '' }); }
      catch (error) { this.release = null; this.set({ status: 'error', error: error.message }); }
    });
    updater.on('update-not-available', () => this.set({ status: 'current', version: null, error: '' }));
    updater.on('download-progress', progress => this.set({ status: 'downloading', percent: Math.max(0, Math.min(100, Number(progress.percent) || 0)) }));
    updater.on('update-downloaded', info => {
      try { validateRelease(info); this.set({ status: 'ready', percent: 100, error: '' }); }
      catch (error) { this.release = null; this.set({ status: 'error', error: error.message }); }
    });
    updater.on('error', error => this.set({ status: 'error', error: friendlyError(error) }));
    return updater;
  }
  async check() {
    if (this.pending || ['downloading', 'ready', 'installing'].includes(this.state.status)) return this.snapshot();
    this.pending = true; this.release = null;
    this.set({ status: 'checking', error: '', version: null, percent: 0 });
    try {
      const engine = this.engine();
      if (this.getToken) {
        const token = await this.getToken();
        if (!token) throw new Error('PRIVATE_ACCESS');
        engine.setFeedURL({ provider: 'github', owner: 'MasterGab1', repo: 'Fusion-Client', private: true, token });
      }
      const result = await engine.checkForUpdates();
      if (!result) this.set({ status: 'unavailable', error: 'Update checks are available in the packaged Windows app.' });
    } catch (error) { this.set({ status: 'error', error: friendlyError(error) }); }
    finally { this.pending = false; }
    return this.snapshot();
  }
  async download() {
    if (!this.installed) throw new Error('Install Fusion with the setup executable first to enable in-place updates.');
    if (this.pending || this.state.status !== 'available' || !this.release) throw new Error('Check for an available update first.');
    this.pending = true; this.set({ status: 'downloading', percent: 0, error: '' });
    try { await this.engine().downloadUpdate(); }
    catch (error) { this.set({ status: 'error', error: friendlyError(error) }); }
    finally { this.pending = false; }
    return this.snapshot();
  }
  install() {
    if (this.blocked()) throw new Error('Close Minecraft and finish any account operation before restarting Fusion.');
    if (!this.installed || this.pending || this.state.status !== 'ready' || !this.release) throw new Error('Download and verify the update first.');
    this.set({ status: 'installing' });
    this.engine().quitAndInstall(true, true);
    return this.snapshot();
  }
}
module.exports = { UpdateService, validateRelease, friendlyError, REPOSITORY };
