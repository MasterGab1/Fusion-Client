const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Version } = require('@xmcl/core');
(async () => {
  const output = path.resolve('build/runtime-tests'); await fs.mkdir(output, { recursive: true });
  const jar = path.resolve('electron/runtime/fusion-runtime.jar');
  const files = (await fs.readdir('runtime/test/fusion/runtime')).map(f => path.resolve('runtime/test/fusion/runtime', f));
  execFileSync('javac', ['--release', '8', '-cp', jar, '-d', output, ...files], { windowsHide: true, stdio: 'inherit' });
  const cp = [output, jar].join(path.delimiter);
  execFileSync('java', ['-cp', cp, 'fusion.runtime.RuntimeTests'], { windowsHide: true, stdio: 'inherit' });
  execFileSync('java', ['-Djava.awt.headless=true', '-cp', cp, 'fusion.runtime.OverlayTests', path.resolve('test-output/v0.8')], { windowsHide: true, stdio: 'inherit' });
  if (!process.argv.includes('--bindings')) return;
  for (const version of require('../electron/runtime/manifest.json').versions) {
    const resources = path.resolve('test-output/downloads/minecraft'), resolved = await Version.parse(resources, version);
    const jars = [path.join(resources, 'versions', version, `${version}.jar`), ...resolved.libraries.filter(l => !l.isNative).map(l => path.join(resources, 'libraries', l.path))];
    const list = path.join(output, `classpath-${version}.txt`); await fs.writeFile(list, jars.join('\n'));
    execFileSync('java', ['-Xverify:all', `-javaagent:${jar}=${version}`, '-cp', cp, 'fusion.runtime.ScreenBindingsTest', path.resolve('runtime/profiles', `${version}.properties`), list], { windowsHide: true, stdio: 'inherit' });
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
