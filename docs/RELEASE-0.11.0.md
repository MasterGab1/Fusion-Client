# Fusion 0.11.0

- Refined launcher styling, quieter accents, Ember and Lime themes, and optional startup animation.
- Compact settings, saved output size/font controls, and a clearer skin library.
- Select mods across searches and download one combined dependency plan; installed mod icons now load from project metadata.
- Fusion modules run with supported Fabric/Forge profiles. The current Minecraft version list stays unchanged.
- Redesigned high-resolution in-game menu with installed-mod inventory. The Fusion logo only appears inside the menu.
- Custom uninstaller that preserves game data.
- Prepare a Fusion installation for the official Minecraft Launcher to use its account sign-in while Fusion app approval is unresolved.

Download **Fusion-Setup-0.11.0.exe**, or use Updates in Fusion. Private release downloads require a GitHub account with repository access.

Validation: 51 unit tests; hidden Electron UI checks including real batch downloads; runtime image/hit-region checks; Fabric and legacy Forge prelaunch probes; installer/uninstaller mock-engine checks. Direct Microsoft login and the official-launcher handoff still require a real-account test. Modern Forge profiles are mapped but have not received equivalent live-loader QA. No benchmarked FPS gain is claimed.
