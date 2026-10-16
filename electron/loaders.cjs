const fs = require('node:fs/promises');
const path = require('node:path');
const { context } = require('./community-mods.cjs');
async function metadata(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error('The mod loader service is unavailable. Retry the launch.');
  return response.json();
}
async function prepareLoader({ version, loader, resourcePath, javaPath, settings, launcher, loaderVersion }) {
  context(version, loader);
  const { Version } = require('@xmcl/core');
  const installer = require('@xmcl/installer');
  if (loaderVersion && !/^[0-9]+(?:\.[0-9]+){1,3}$/.test(loaderVersion)) throw new Error('Unsupported modpack loader version.');
  const file = path.join(resourcePath, `fusion-${version}-${loader}${loaderVersion ? '-'+loaderVersion : ''}.json`);
  let cached;
  try { cached = JSON.parse(await fs.readFile(file, 'utf8')); } catch {}
  if (cached?.id && !settings.verifyFiles) {
    try { return await Version.parse(resourcePath, cached.id); } catch {}
  }
  launcher.status(`Installing ${loader === 'fabric' ? 'Fabric' : 'Forge'}`);
  const options = launcher.installerOptions(settings);
  let installed;
  if (loader === 'fabric') {
    const releases = await metadata(`https://meta.fabricmc.net/v2/versions/loader/${version}`);
    const release = loaderVersion ? releases.find(r => r.loader.version === loaderVersion) : releases.find(r => r.loader.stable) || releases[0];
    if (!release) throw new Error(`Fabric is not available for Minecraft ${version}. Choose another profile.`);
    installed = await installer.installFabric({ minecraftVersion: version, version: release.loader.version, minecraft: resourcePath, ...options });
  } else {
    const { promos } = await metadata('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
    const release = loaderVersion || promos[`${version}-recommended`] || promos[`${version}-latest`];
    if (!release || !/^[0-9.]+$/.test(release)) throw new Error(`Forge is not available for Minecraft ${version}. Try Fabric or Fusion.`);
    const artifact = `${version}-${release}${/^1\.8(?:\.|$)/.test(version) ? `-${version}` : ''}`;
    const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${artifact}/forge-${artifact}-installer.jar`;
    const checksumResponse = await fetch(`${installerUrl}.sha1`, { signal: AbortSignal.timeout(25000) });
    const checksum = checksumResponse.ok ? (await checksumResponse.text()).trim() : '';
    if (!/^[a-f0-9]{40}$/i.test(checksum)) throw new Error('Could not verify the official Forge installer checksum. Please retry.');
    const secureLibraries = library => {
      const original = library.download.url?.replace(/^http:\/\/(files\.minecraftforge\.net|maven\.minecraftforge\.net)/, 'https://$1');
      return [...new Set([original, `https://maven.minecraftforge.net/${library.download.path}`, `https://libraries.minecraft.net/${library.download.path}`, `https://repo1.maven.org/maven2/${library.download.path}`].filter(url => url?.startsWith('https://')))];
    };
    installed = await launcher.runTask(installer.installForgeTask({ mcversion: version, version: release, installer: { path: installerUrl, sha1: checksum } }, resourcePath, { ...options, java: javaPath, libraryHost: secureLibraries }), 'Installing Forge');
  }
  launcher.checkCancelled();
  const resolved = await Version.parse(resourcePath, installed);
  await launcher.runTask(installer.installLibrariesTask(resolved, options), `Downloading ${loader} libraries`);
  await fs.writeFile(file, JSON.stringify({ id: installed }));
  return resolved;
}
module.exports = { prepareLoader };
