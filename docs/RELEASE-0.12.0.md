# Fusion 0.12.0

- Local testing profiles: choose Account → Local testing, enter your player name, and launch singleplayer without Microsoft sign-in. Press Right Shift in a world for Fusion's menu.
- Integrated modpacks: browse under Mods → Modpacks or import .mrpack files, then play isolated instances from My packs. Exact loader versions, verified files and client configuration are installed together.
- Fixed the clipped mod-install dialog. It now stays centered with a scrollable file list and visible action button, including at minimum window size.
- Startup uses your saved accent from the first render, removing the brief pink flash.
- Compact account tabs replace the long sign-in dialog.

The Minecraft version list is unchanged. Modpacks support Fabric and Forge on those releases. Optional pack files are skipped; NeoForge, Quilt and CurseForge ZIP imports are not supported. Local profiles cannot authenticate to online-mode servers or upload account skins. Initial downloads need internet access.

Validation: 57 unit tests, hidden Electron UI checks, real installation of Fabulously Optimized 5.4.1 (51 files), and Fusion hook/menu linking through its pinned Fabric 0.14.23 loader. Full gameplay remains for manual testing; automated UI checks do not take desktop focus.
