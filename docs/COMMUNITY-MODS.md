# Modrinth mods in Fusion 0.9

Open **Mods → Discover**, choose Fabric or Forge, and search. Results match the selected Minecraft release and loader and exclude server-only projects. The two legacy families use Forge. Selecting a mod resolves required dependencies recursively; exact version dependencies are honored, optional and embedded dependencies are skipped, and advertised incompatibilities are rejected. The preview shows all new JARs and total size before download. Installing also selects that loader for the next launch.

Files come from Modrinth's official CDN. Fusion checks the declared size, SHA-512 and ZIP header. Downloads are staged; the installed folder and inventory are swapped only after all downloads pass. A failure preserves the previous profile. A backup directory recovers an interrupted commit. Existing manual files are retained, matching filenames are never overwritten, and a dependency cannot be removed while another installed mod requires it. Changed files must be handled manually rather than silently deleted. Provider metadata is not a guarantee that arbitrary mod combinations will run together.

**Installed** lists managed mods and dependencies. **Built-in Fusion** controls Fusion HUD, Focus, and Particles. These are different launch profiles in this release:

| Profile | Game folder | Mods |
| --- | --- | --- |
| Fusion | `instances/<version>-performance` | Bundled Fusion Runtime and overlay |
| Fabric | `instances/<version>-fabric` | Downloaded Fabric mods |
| Forge | `instances/<version>-forge` | Downloaded Forge mods |
| Vanilla | `instances/<version>` | Original game |

All folders are under `%APPDATA%\Fusion Launcher`. Minecraft resources and Java downloads are shared. Worlds are not copied or migrated when switching profiles. Fusion's agent targets original game mappings and is intentionally not injected into Fabric/Forge. Its overlay and first-party optimizations therefore do not run in those profiles yet.

On the first launch, Fusion installs an official Fabric or Forge loader and its libraries. Later launches reuse the completed loader install. Forge's installer is checked against its official SHA-1; Modrinth JARs use SHA-512. The Microsoft license/account check is still mandatory. Unsupported game/loader combinations return an error rather than launching Vanilla with unloaded mods.

There is no CurseForge key or integration in this build: the owner chose Modrinth only. Mod updates, NeoForge, Quilt, modpacks, automatic game-crash diagnosis, and importing third-party mods into the in-game Fusion menu are not implemented.

Developer validation: `npm test` covers dependency resolution and atomic changes with fixtures. `npm run test:ui` exercises real Modrinth search/downloads in isolated temporary data, inside a hidden Electron window. Live services are required for this UI test. No game window opens and production authentication is not bypassed.

References: [Modrinth API](https://docs.modrinth.com/api/), [Fabric mod installation](https://docs.fabricmc.net/players/installing-mods), [Forge downloads](https://files.minecraftforge.net/).
