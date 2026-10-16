const path = require('node:path');
const { familyOf } = require('./catalog.cjs');
const defaults = {
  memory: 4, javaPath: '', selectedVersion: '1.8.9',
  width: 1280, height: 720, fullscreen: false, downloadThreads: 8,
  verifyFiles: false, minimizeOnLaunch: true, restoreAfterGame: true,
  reducedMotion: false, accent: 'pink', launchMode: 'performance',
  backgroundFps: 30, particleDistance: 24, autoCheckUpdates: true, discordPresence: true,
  startupAnimation: true, showNews: true, outputAutoOpen: false, outputHeight: 250, outputFontSize: 11, skinAutoRotate: false,
};
function validateSettings(current, patch, maxMemory) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Invalid settings.');
  const next = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (!Object.hasOwn(defaults, key)) continue;
    if (['fullscreen', 'verifyFiles', 'minimizeOnLaunch', 'restoreAfterGame', 'reducedMotion', 'autoCheckUpdates', 'discordPresence', 'startupAnimation', 'showNews', 'outputAutoOpen', 'skinAutoRotate'].includes(key)) {
      if (typeof value !== 'boolean') throw new Error(`Invalid ${key} setting.`);
    } else if (['memory', 'width', 'height', 'downloadThreads', 'backgroundFps', 'particleDistance', 'outputHeight', 'outputFontSize'].includes(key)) {
      const bounds = { memory: [2, maxMemory], width: [640, 7680], height: [480, 4320], downloadThreads: [1, 16], backgroundFps: [5, 60], particleDistance: [8, 64], outputHeight: [120, 550], outputFontSize: [9, 16] }[key];
      if (!Number.isInteger(value) || value < bounds[0] || value > bounds[1]) throw new Error(`Choose ${key} between ${bounds[0]} and ${bounds[1]}.`);
    }
    else if (key === 'javaPath' && (typeof value !== 'string' || (value && (!path.isAbsolute(value) || !/javaw?\.exe$/i.test(value))))) throw new Error('Select java.exe or leave Automatic Java enabled.');
    else if (key === 'selectedVersion' && !familyOf(value)) throw new Error('Choose a release from one of the supported version families.');
    else if (['accent', 'launchMode'].includes(key) && !{ accent: ['pink', 'violet', 'blue', 'orange', 'green'], launchMode: ['vanilla', 'performance', 'fabric', 'forge'] }[key].includes(value)) throw new Error(`Invalid ${key}.`);
    next[key] = value;
  }
  return next;
}
module.exports = { defaults, validateSettings };
