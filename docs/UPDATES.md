# Fusion updates

Fusion uses the private GitHub repository [MasterGab1/Fusion-Client](https://github.com/MasterGab1/Fusion-Client). A private repository requires authentication even for release downloads.

## This PC

Install Fusion once using the setup executable. In PowerShell, sign Git Credential Manager into the GitHub account that can access the repository:

```powershell
git credential-manager github login --username MasterGab1 --browser
```

Git for Windows must be installed and available on PATH. Fusion reads the existing credential from Git Credential Manager without opening a prompt and passes it only to the updater in memory. It never writes it to settings, logs, the renderer, or release metadata. If access expires, repeat the command. Developer-managed environments can instead supply `FUSION_GITHUB_TOKEN` at runtime; never set it in a build configuration or commit it.

Open **Updates → Check for updates → Download update → Restart to install**. Future updates preserve worlds, profiles, skins, settings and custom backgrounds. Close Minecraft before installing an update. The custom installer forwards silent-update flags to the NSIS installation engine.

Everyone using this private feed needs repository access and local GitHub credentials. For distribution to players without source access, use a separate public release repository or an authenticated distribution service. Making source private alone does not create public access to installer downloads.

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
