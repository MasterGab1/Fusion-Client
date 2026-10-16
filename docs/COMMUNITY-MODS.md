# Community mods in Fusion 0.11

Open **Mods → Discover**, choose Fabric or Forge, and search. Results match the selected Minecraft release and loader and exclude server-only projects. The two legacy families use Forge. Check mods across multiple searches, then select Download selected. The combined plan resolves shared required dependencies once; exact version dependencies are honored, optional and embedded dependencies are skipped, and advertised incompatibilities are rejected. The preview shows all new JARs and total size before download. Installing also selects that loader for the next launch.

Files come from Modrinth's official CDN. Fusion checks the declared size, SHA-512 and ZIP header. Downloads are staged; the installed folder and inventory are swapped only after all downloads pass. A failure preserves the previous profile. A backup directory recovers an interrupted commit. Existing manual files are retained, matching filenames are never overwritten, and a dependency cannot be removed while another installed mod requires it. Changed files must be handled manually rather than silently deleted. Provider metadata is not a guarantee that arbitrary mod combinations will run together.

**Installed** lists managed mods, dependencies and the built-in Fusion controls. These profiles keep worlds separate while sharing Fusion preferences:

| Profile | Game folder | Mods |
| --- | --- | --- |
| Fusion | `instances/<version>-performance` | Bundled Fusion Runtime and overlay |
| Fabric | `instances/<version>-fabric` | Fusion Runtime plus downloaded Fabric mods |
| Forge | `instances/<version>-forge` | Fusion Runtime plus downloaded Forge mods |
| Vanilla | `instances/<version>` | Original game |

All folders are under `%APPDATA%\Fusion Launcher`. Minecraft resources and Java downloads are shared. Worlds are not copied or migrated when switching profiles. Fusion uses loader-specific mappings to run its modules with supported Fabric/Forge releases. The current version picker is unchanged; unavailable loader combinations return a clear error.

On the first launch, Fusion installs an official Fabric or Forge loader and its libraries. Later launches reuse the completed loader install. Forge's installer is checked against its official SHA-1; Modrinth JARs use SHA-512. Microsoft mode verifies the account; explicit Local testing profiles can also launch these instances. Unsupported game/loader combinations return an error rather than launching Vanilla with unloaded mods.

There is no CurseForge key or integration in this build: the owner chose Modrinth only. Mod updates, NeoForge, Quilt, automatic game-crash diagnosis. The in-game menu lists installed third-party mods; it does not replace their configuration screens.

Developer validation: `npm test` covers dependency resolution and atomic changes with fixtures. `npm run test:ui` exercises real Modrinth search/downloads in isolated temporary data, inside a hidden Electron window. Live services are required for this UI test. No game window opens and production authentication is not bypassed.

References: [Modrinth API](https://docs.modrinth.com/api/), [Fabric mod installation](https://docs.fabricmc.net/players/installing-mods), [Forge downloads](https://files.minecraftforge.net/).

## Modpack instances (0.12)

Mods → Modpacks supports browsing and importing Modrinth .mrpack archives. Each pack is installed into its own `packs/<id>/game` folder. Exact file hashes and sizes are checked; downloads stream to disk with four workers. Client override files apply after common overrides, and server-only files are excluded. Optional files are skipped and counted in the preview. Minecraft and loader versions come from the manifest; the loader cache includes the pinned loader version. Pack profiles do not mix with ordinary mod-library installations.

Archives have path traversal, Windows device-name, duplicate-path, symbolic-link and expanded-size checks. Staging becomes a visible instance only after all downloads and configuration files succeed. The current Minecraft catalog is unchanged. Fabric and Forge are supported; NeoForge, Quilt and CurseForge ZIP packs are rejected clearly.

Format reference: [Modrinth .mrpack specification](https://support.modrinth.com/en/articles/8802351-modrinth-modpack-format-mrpack).
