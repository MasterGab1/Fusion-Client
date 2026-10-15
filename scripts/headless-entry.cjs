// Development-only harness: exercise the real Electron IPC without taking desktop focus.
// scripts/ is excluded from every packaged build.
const electron = require('electron');
electron.app.getVersion = () => require('../package.json').version;
const original = electron.BrowserWindow;
const HiddenWindow = new Proxy(original, { construct(Target, [options]) {
  const window = new Target({ ...options, show: false, webPreferences: { ...options.webPreferences, offscreen: true, backgroundThrottling: false } });
  window.show = () => {}; window.focus = () => {};
  return window;
} });
const Module = require('node:module');
const load = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'electron') return { ...electron, BrowserWindow: HiddenWindow };
  return load.call(this, request, parent, isMain);
};
require('../electron/main.cjs');
