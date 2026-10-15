const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const unzip = createRequire(require.resolve('@xmcl/installer'))('@xmcl/unzip');
const root = path.resolve(__dirname, '..');
// Relocate ASM's constant-pool names so Minecraft's own libraries cannot conflict.
function relocate(bytes) {
  const chunks = [bytes.subarray(0, 10)]; let pos = 10;
  for (let i = 1, count = bytes.readUInt16BE(8); i < count; i++) {
    const start = pos, tag = bytes[pos++];
    if (tag === 1) {
      const size = bytes.readUInt16BE(pos); pos += 2;
      const raw = bytes.subarray(pos, pos + size);
      const value = raw.includes(Buffer.from('org/objectweb/asm')) || raw.includes(Buffer.from('org.objectweb.asm')) ? Buffer.from(raw.toString('utf8').replaceAll('org/objectweb/asm', 'fusion/internal/asm').replaceAll('org.objectweb.asm', 'fusion.internal.asm')) : raw;
      const header = Buffer.alloc(3); header[0] = 1; header.writeUInt16BE(value.length, 1);
      chunks.push(header, value); pos += size;
    } else {
      const size = ({ 3:4, 4:4, 5:8, 6:8, 7:2, 8:2, 9:4, 10:4, 11:4, 12:4, 15:3, 16:2, 17:4, 18:4, 19:2, 20:2 })[tag];
      if (size === undefined) throw new Error(`Unknown JVM constant ${tag}`);
      pos += size; chunks.push(bytes.subarray(start, pos)); if (tag === 5 || tag === 6) i++;
    }
  }
  chunks.push(bytes.subarray(pos)); return Buffer.concat(chunks);
}
(async () => {
  const classes = path.join(root, 'build/runtime-classes');
  // Only the fixed generated build directory is replaced.
  await fs.rm(classes, { recursive: true, force: true }); await fs.mkdir(classes, { recursive: true });
  const source = path.join(root, 'runtime/src/fusion/runtime');
  const sources = (await fs.readdir(source)).filter(f => f.endsWith('.java')).map(f => path.join(source, f));
  const asm = path.join(root, 'runtime/vendor/asm-9.10.1.jar');
  execFileSync('javac', ['--release', '8', '-encoding', 'UTF-8', '-cp', asm, '-d', classes, ...sources], { windowsHide: true, stdio: 'inherit' });
  const folder = path.join(classes, 'fusion/runtime');
  for (const file of await fs.readdir(folder)) if (file.endsWith('.class')) await fs.writeFile(path.join(folder, file), relocate(await fs.readFile(path.join(folder, file))));
  const zip = await unzip.open(asm);
  try {
    for (const entry of await unzip.readAllEntries(zip)) if (entry.fileName.startsWith('org/objectweb/asm/') && entry.fileName.endsWith('.class') && !entry.fileName.includes('..')) {
      const target = path.join(classes, entry.fileName.replace('org/objectweb/asm', 'fusion/internal/asm'));
      await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, relocate(await unzip.readEntry(zip, entry)));
    }
  } finally { zip.close(); }
  await fs.cp(path.join(root, 'runtime/profiles'), path.join(classes, 'profiles'), { recursive: true });
  await fs.copyFile(path.join(root, 'runtime/vendor/LICENSE-ASM.txt'), path.join(classes, 'LICENSE-ASM.txt'));
  const sharp = require('sharp');
  await sharp(path.join(root, 'assets/branding/white.png')).trim().resize(256, 256, { fit: 'contain', background: '#00000000' }).png().toFile(path.join(classes, 'logo-white.png'));
  await fs.copyFile(path.join(root, 'runtime/assets/Inter-Regular.ttf'), path.join(classes, 'Inter-Regular.ttf'));
  await fs.copyFile(path.join(root, 'runtime/assets/Inter-Semibold.ttf'), path.join(classes, 'Inter-Semibold.ttf'));
  await fs.copyFile(path.join(root, 'public/assets/INTER-LICENSE.txt'), path.join(classes, 'INTER-LICENSE.txt'));

  const manifest = path.join(root, 'build/runtime-manifest.mf');
  await fs.writeFile(manifest, 'Manifest-Version: 1.0\nPremain-Class: fusion.runtime.FusionAgent\nImplementation-Title: Fusion Runtime\nImplementation-Version: 0.4.0\n\n');
  const output = path.join(root, 'electron/runtime'); await fs.mkdir(output, { recursive: true });
  const jar = path.join(output, 'fusion-runtime.jar');
  execFileSync('jar', ['--create', '--file', jar, '--manifest', manifest, '-C', classes, '.'], { windowsHide: true, stdio: 'inherit' });
  const bytes = await fs.readFile(jar);
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify({ version: '0.4.0', sha512: createHash('sha512').update(bytes).digest('hex'), versions: (await fs.readdir(path.join(root, 'runtime/profiles'))).filter(f => f.endsWith('.properties')).map(f => f.replace('.properties', '')) }, null, 2));
  console.log(`Built Fusion Runtime: ${bytes.length} bytes, release profiles generated.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
