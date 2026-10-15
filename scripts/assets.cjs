const fs = require('node:fs/promises');
const sharp = require('sharp');
(async () => {
  await fs.mkdir('build', { recursive: true });
  await fs.mkdir('public/assets/versions', { recursive: true });
  const sources = {
    '1.8': 'public/assets/versions/1.8-original.png',
    '1.12': 'world_of_color.png',
    '1.16': 'updates/netherupdate.png',
    '1.18': 'updates/caves_and_clifss.png',
    '1.19': 'updates/warden_udpatte.png',
    '1.20': 'updates/trails_and_tales.png',
    '1.21': 'updates/mountsofmayhem.png',
    '26.1': 'updates/thecopperage.png',
  };
  await Promise.all(Object.entries(sources).map(([id, source]) =>
    sharp(source).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 88 }).toFile(`public/assets/versions/${id}.webp`)));
  await fs.copyFile('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'public/assets/inter-latin.woff2');
  await fs.mkdir('public/assets/licenses', { recursive: true });
  await Promise.all(['skinview3d', 'skinview-utils', 'three'].map(name => fs.copyFile(`node_modules/${name}/LICENSE`, `public/assets/licenses/${name}.txt`)));
  await fs.mkdir('public/assets/branding', { recursive: true });
  for (const accent of ['pink', 'violet', 'blue']) {
    // Normalize transparent padding for app-sized assets; retain the supplied artwork.
    await sharp(`assets/branding/${accent}.png`).trim().resize(256, 256, { fit: 'contain', background: '#00000000' }).png().toFile(`public/assets/branding/${accent}.png`);
  }
  const png = await fs.readFile('public/assets/branding/pink.png');
  await fs.writeFile('public/assets/icon.png', png);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
  await fs.writeFile('build/icon.ico', Buffer.concat([header, png]));
  console.log('Generated local launcher artwork, font, and app icons.');
})();
