const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { version } = require('../package.json');
const { validateRelease } = require('../electron/updates.cjs');
(async () => {
  const destination = path.resolve('release-bundle', version);
  await fs.mkdir(destination, { recursive: true });
  {
    const folder = 'release';
    const filename = `Fusion-Setup-${version}.exe`;
    const source = path.join(folder, filename), bytes = await fs.readFile(source);
    const sha512 = crypto.createHash('sha512').update(bytes).digest('base64');
    const info = { version, files: [{ url: filename, sha512, size: bytes.length }], path: filename, sha512, releaseDate: new Date().toISOString() };
    validateRelease(info);
    await fs.copyFile(source, path.join(destination, filename));
    await fs.copyFile(`${source}.blockmap`, path.join(destination, `${filename}.blockmap`));
    // JSON is valid YAML.
    await fs.writeFile(path.join(destination, 'latest.yml'), JSON.stringify(info, null, 2) + '\n');
  }
  console.log(`Release assets prepared in ${destination}. Upload all three files to the same published GitHub release.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
