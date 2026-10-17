# Fusion updates

Fusion downloads official updates from the public [MasterGab1/Fusion-Client](https://github.com/MasterGab1/Fusion-Client) releases. Version 0.13 and later do not require GitHub sign-in for updates.

## This PC

Install Fusion once using the setup executable. Older releases configured for private updates may still ask for GitHub access; installing 0.13 once from the Releases page switches to public updates and preserves your data.

Open **Updates → Check for updates → Download update → Restart to install**. Future updates preserve worlds, profiles, skins, settings and custom backgrounds. Close Minecraft before installing an update. The custom Fusion update screen shows progress, then reopens the launcher. Updates from older builds also use this screen. The underlying installation engine runs without its own wizard.

Public downloads do not grant redistribution or rebranding rights to Fusion-owned code or artwork; see LICENSE.

## Publish a release

```powershell
npm ci
npm test
npm run dist
```

`npm run dist` builds the launcher and runtime, creates the NSIS engine, wraps it with the native Fusion setup UI, and regenerates checksums/blockmap for the final executable. `release-bundle/<version>/` contains exactly these files:

- `Fusion-Setup-<version>.exe`
- `Fusion-Setup-<version>.exe.blockmap`
- `latest.yml`

Upload all three assets to a published stable release tagged `v<version>`. Draft releases are invisible to the update feed. Bump package.json/package-lock.json before the next release. The included workflow can build a draft for review; publish it after confirming the artifacts. The runtime version is independent of the launcher version.

Do not upload `build/installer-engine.exe` separately or replace the wrapped executable without regenerating its metadata. Updates validate the edition filename and SHA-512 before installation.
