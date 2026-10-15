const supportedVersions = new Set(require('./runtime/manifest.json').versions);
const FAMILIES = Object.freeze([
  { id: '1.8', preferred: '1.8.9', label: 'Classic', artwork: './assets/versions/1.8.webp' },
  { id: '1.12', preferred: '1.12.2', label: 'World of Color', artwork: './assets/versions/1.12.webp' },
  { id: '1.16', preferred: '1.16.5', label: 'Nether Update', artwork: './assets/versions/1.16.webp' },
  { id: '1.18', preferred: '1.18.2', label: 'Caves & Cliffs', artwork: './assets/versions/1.18.webp' },
  { id: '1.19', preferred: '1.19.2', label: 'The Wild Update', artwork: './assets/versions/1.19.webp' },
  { id: '1.20', preferred: '1.20.1', label: 'Trails & Tales', artwork: './assets/versions/1.20.webp' },
  { id: '1.21', preferred: '1.21', label: '1.21 releases', artwork: './assets/versions/1.21.webp' },
  { id: '26.1', preferred: '26.1.2', label: '26.1 releases', artwork: './assets/versions/26.1.webp' },
]);
function familyOf(version) {
  if (typeof version !== 'string' || !/^\d+\.\d+(?:\.\d+)?$/.test(version)) return undefined;
  return FAMILIES.find(family => version === family.id || version.startsWith(`${family.id}.`));
}
function filterCatalog(manifest) {
  const versions = manifest.versions.filter(version => version.type === 'release' && familyOf(version.id) && supportedVersions.has(version.id));
  return { versions, families: FAMILIES.map(family => ({ ...family, versions: versions.filter(v => familyOf(v.id)?.id === family.id) })) };
}
module.exports = { FAMILIES, familyOf, filterCatalog };
