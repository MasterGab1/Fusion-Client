const http = require('node:http');
const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');
const SCOPE = 'XboxLive.signin offline_access';
async function browserAuthorization({ clientId, openBrowser, signal, timeoutMs = 180000 }) {
  const verifier = randomBytes(48).toString('base64url');
  const state = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  let finish, fail, timer;
  const result = new Promise((resolve, reject) => { finish = resolve; fail = reject; });
  // Observe rejection while the browser-opening operation is still pending.
  result.catch(() => {});
  const server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'");
    response.setHeader('Referrer-Policy', 'no-referrer');
    const url = new URL(request.url, 'http://localhost');
    if (request.method !== 'GET' || url.pathname !== '/') { response.writeHead(404).end(); return; }
    const returned = Buffer.from(url.searchParams.get('state') || '');
    if (returned.length !== state.length || !timingSafeEqual(returned, Buffer.from(state))) { response.writeHead(400).end('This sign-in request is invalid. Return to Fusion and try again.'); return; }
    if (url.searchParams.has('error')) {
      response.end('Sign-in could not finish. Return to Fusion.');
      const redirectError = /redirect_uri|AADSTS50011/i.test(url.searchParams.get('error_description') || '');
      fail(new Error(redirectError ? 'Fusion’s Microsoft application needs http://localhost registered as a Mobile and desktop redirect URI. See the sign-in help.' : 'Microsoft sign-in was declined.')); return;
    }
    const code = url.searchParams.get('code');
    if (!code || code.length > 10000) { response.writeHead(400).end('Missing authorization code.'); return; }
    response.end('<!doctype html><meta charset="utf-8"><title>Fusion sign-in</title><style>body{background:#15161b;color:#eee;font:16px system-ui;padding:12vh 12vw}h1{font-size:28px}p{color:#aaa}</style><h1>Return to Fusion</h1><p>Microsoft authorization received. Fusion will finish checking your Minecraft account.</p>');
    finish(code);
  });
  const cancel = () => fail(new Error('Sign-in cancelled.'));
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const redirectUri = `http://localhost:${server.address().port}/`;
    const url = new URL('https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize');
    url.search = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, response_mode: 'query', scope: SCOPE, state, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account' });
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) throw new Error('Sign-in cancelled.');
    timer = setTimeout(() => fail(new Error('Browser sign-in timed out. Please try again.')), timeoutMs);
    await openBrowser(url.href);
    return { code: await result, verifier, redirectUri };
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', cancel);
    server.close(); server.closeAllConnections();
  }
}
module.exports = { browserAuthorization };
