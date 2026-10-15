const OAUTH = 'https://login.microsoftonline.com/consumers/oauth2/v2.0';
const SCOPE = 'XboxLive.signin offline_access';
const CLIENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class AuthService {
  constructor({ vault, fetcher = fetch, emit = () => {} }) {
    this.vault = vault;
    this.fetcher = fetcher;
    this.emit = emit;
    this.controller = null;
  }

  async request(url, options = {}, signal) {
    let response;
    try {
      response = await this.fetcher(url, { ...options, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000) });
    } catch (error) {
      if (signal?.aborted) throw new Error('Sign-in cancelled.');
      throw new Error('Cannot reach Microsoft or Minecraft. Check your connection and try again. Online verification is required.');
    }
    let data;
    try { data = await response.json(); } catch { throw new Error('The authentication service returned an unexpected response. Try again.'); }
    return { ok: response.ok, status: response.status, data };
  }

  post(url, data, signal, form = false) {
    return this.request(url, {
      method: 'POST',
      headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json', Accept: 'application/json' },
      body: form ? new URLSearchParams(data).toString() : JSON.stringify(data),
    }, signal);
  }

  cancel() { this.controller?.abort(); this.controller = null; }

  async signInBrowser(clientId, openBrowser) {
    if (!CLIENT_ID.test(clientId || '')) throw new Error('Microsoft sign-in is unavailable in this build. Please update Fusion.');
    this.cancel();
    const controller = new AbortController(); this.controller = controller;
    try {
      this.emit('browser-auth', { waiting: true });
      const { browserAuthorization } = require('./browser-auth.cjs');
      const { code, verifier, redirectUri } = await browserAuthorization({ clientId, openBrowser, signal: controller.signal });
      const result = await this.post(`${OAUTH}/token`, { client_id: clientId, grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: verifier, scope: SCOPE }, controller.signal, true);
      if (!result.ok) throw new Error('Microsoft rejected browser sign-in. Register http://localhost as a Mobile and desktop application redirect URI.');
      const account = await this.minecraftSession(result.data.access_token, clientId, controller.signal);
      controller.signal.throwIfAborted();
      await this.vault.write({ clientId, refreshToken: result.data.refresh_token, profile: account.profile });
      return account.profile;
    } finally { if (this.controller === controller) this.controller = null; this.emit('browser-auth', { waiting: false }); }
  }

  async minecraftSession(msToken, clientId, signal) {
    if (!msToken) throw new Error('Microsoft did not return an access token. Please sign in again.');
    const xbox = await this.post('https://user.auth.xboxlive.com/user/authenticate', {
      Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${msToken}` },
      RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT',
    }, signal);
    if (!xbox.ok || !xbox.data.Token) throw new Error('Xbox sign-in failed. Make sure your Microsoft account has an Xbox profile.');
    const xsts = await this.post('https://xsts.auth.xboxlive.com/xsts/authorize', {
      Properties: { SandboxId: 'RETAIL', UserTokens: [xbox.data.Token] },
      RelyingParty: 'rp://api.minecraftservices.com/', TokenType: 'JWT',
    }, signal);
    if (!xsts.ok) {
      const messages = {
        2148916233: 'Create an Xbox profile for this Microsoft account at xbox.com, then try again.',
        2148916235: 'Xbox Live is not available for this account’s region.',
        2148916238: 'This account needs a parent to configure its Microsoft family and Xbox permissions.',
      };
      throw new Error(messages[xsts.data.XErr] || 'Xbox could not authorize this account. Check your Xbox account settings.');
    }
    const claim = xsts.data.DisplayClaims?.xui?.[0];
    if (!claim?.uhs || !xsts.data.Token) throw new Error('Xbox returned an incomplete authorization response.');
    const minecraft = await this.post('https://api.minecraftservices.com/authentication/login_with_xbox', {
      identityToken: `XBL3.0 x=${claim.uhs};${xsts.data.Token}`,
    }, signal);
    if (!minecraft.ok) {
      const registration = /invalid.*app.*registration|application.*not.*(approved|allowed)/i.test(String(minecraft.data.error || '') + ' ' + String(minecraft.data.errorMessage || ''));
      throw new Error(registration
        ? 'Minecraft rejected Fusion’s application registration. The launcher owner must complete Minecraft Java API approval. Open sign-in help for the next steps.'
        : minecraft.status === 403 ? 'Microsoft and Xbox accepted sign-in, but Minecraft denied the session (HTTP 403). Check Minecraft service access and application permissions using sign-in help.'
        : 'Minecraft sign-in failed. Try again in a moment.');
    }
    if (!minecraft.data.access_token) throw new Error('Minecraft did not return a session token.');
    const headers = { Authorization: `Bearer ${minecraft.data.access_token}` };
    const [entitlements, profile] = await Promise.all([
      this.request('https://api.minecraftservices.com/entitlements/mcstore', { headers }, signal),
      this.request('https://api.minecraftservices.com/minecraft/profile', { headers }, signal),
    ]);
    if (!entitlements.ok || !profile.ok) throw new Error('A verified Minecraft: Java Edition license and profile are required. Check that this Microsoft account owns the game and has a Java username.');
    const ownsGame = entitlements.data.items?.some(item => ['game_minecraft', 'product_minecraft'].includes(item.name));
    if (!ownsGame || !/^[0-9a-f]{32}$/i.test(profile.data.id || '') || !profile.data.name) {
      throw new Error('This account does not have a verified Minecraft: Java Edition license. Offline and demo accounts are not supported.');
    }
    return {
      accessToken: minecraft.data.access_token,
      profile: { id: profile.data.id, name: profile.data.name },
      clientId, xuid: claim.xid || '',
    };
  }

  async verifyForLaunch(clientId) {
    const saved = await this.vault.read();
    if (!saved?.refreshToken || saved.clientId !== clientId) throw new Error('Sign in with a Microsoft account before launching Minecraft.');
    const refreshed = await this.post(`${OAUTH}/token`, {
      client_id: clientId, grant_type: 'refresh_token', refresh_token: saved.refreshToken, scope: SCOPE,
    }, undefined, true);
    if (!refreshed.ok) throw new Error('Your Microsoft session needs to be renewed. Please sign out and sign in again.');
    // Persist rotation even if a downstream service is temporarily unavailable.
    await this.vault.write({ ...saved, refreshToken: refreshed.data.refresh_token || saved.refreshToken });
    const session = await this.minecraftSession(refreshed.data.access_token, clientId);
    await this.vault.write({ clientId, refreshToken: refreshed.data.refresh_token || saved.refreshToken, profile: session.profile });
    return session;
  }
}
module.exports = { AuthService, CLIENT_ID };
