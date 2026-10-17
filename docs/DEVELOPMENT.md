# Development

## Build

Requires Windows x64, Node.js 22+, a JDK supporting `--release 8` (tested with JDK 25), and Windows .NET Framework 4.x for the installer.

```powershell
npm ci
npm test
npm run dist
```

The final installer and update metadata are in `release-bundle/0.13.0/`. `npm run dev` starts the desktop development app. Nothing is published by `npm run dist`.

```powershell
npm run test:ui
npm run test:mods
node scripts/test-installer.cjs
node scripts/test-uninstaller.cjs
```

UI checks use isolated data and hidden Electron windows. Installer tests use an isolated mock engine and do not replace your installed launcher. Additional runtime audits and JVM binding checks use official cached client JARs; no game classes are distributed.

