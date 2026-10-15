const { spawn } = require('node:child_process');
// Git Credential Manager keeps authentication in Windows storage. Never expose
// its output to the renderer, logs, build metadata, or release artifacts.
async function githubCredential() {
  if (process.env.FUSION_GITHUB_TOKEN) return process.env.FUSION_GITHUB_TOKEN;
  return new Promise(resolve => {
    let output = '', settled = false;
    const finish = token => { if (!settled) { settled = true; clearTimeout(timer); resolve(token); } };
    const child = spawn('git', ['credential', 'fill'], { windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' }, stdio: ['pipe','pipe','ignore'] });
    const timer = setTimeout(() => { child.kill(); finish(null); }, 8000);
    child.on('error', () => finish(null));
    child.stdout.on('data', chunk => { output += chunk; if (output.length > 32768) { child.kill(); finish(null); } });
    child.on('close', code => finish(code === 0 ? /^password=(.+)$/m.exec(output)?.[1]?.trim() || null : null));
    child.stdin.on('error', () => {});
    child.stdin.end('protocol=https\nhost=github.com\npath=MasterGab1/Fusion-Client.git\n\n');
  });
}
module.exports = { githubCredential };
