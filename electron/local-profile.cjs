const { createHash } = require('node:crypto');
function localSession(name) {
  if (typeof name !== 'string' || !/^[A-Za-z0-9_]{3,16}$/.test(name)) throw new Error('Use 3–16 letters, numbers or underscores for the local player name.');
  const id = createHash('md5').update(`OfflinePlayer:${name}`).digest();
  id[6] = (id[6] & 15) | 48; id[8] = (id[8] & 63) | 128;
  return { local: true, profile: { name, id: id.toString('hex') }, accessToken: '0', xuid: '0', clientId: '0' };
}
module.exports = { localSession };
