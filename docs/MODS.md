# Fusion mods

Fusion 0.10 also has a Modrinth browser for **separate Fabric and Forge profiles**. See [community mods](COMMUNITY-MODS.md) for downloads, dependencies, and compatibility. The built-in modules below remain specific to the Fusion profile.

The Fusion profile uses first-party code in `runtime/src/fusion/runtime`. It does not load Sodium, Lithium, FerriteCore, FoamFix, Entity Culling, Fabric, or Forge. The launcher bundles a small Fusion Runtime JAR and loads it as a Java agent; original Minecraft JARs on disk stay unchanged.

The existing eight families retain their 49 stable releases. Every release offered by this build has a bundled Fusion runtime profile, including the base and point releases. New releases are admitted only after mappings are added and checked; snapshots are excluded. Select the Fusion profile in Settings, or Use Fusion in the built-in Mods tab.

| Module | Behavior |
| --- | --- |
| Fusion HUD | White Fusion logo inside the Fusion Mods overlay only. No logo or FPS text is drawn over normal gameplay. |
| Fusion Focus | Caps the original frame limit while the game is unfocused, then restores the original limit on return. Default: 30 FPS; configurable from 5–60 FPS. Never raises a lower game cap. |
| Fusion Particles | Expires particles created farther than the configured distance from the player. Default: 24 blocks; configurable from 8–64 blocks. Player coordinates are sampled at most once per 25 milliseconds. |

These are initial optimizations, not a renderer replacement. Particle creation still occurs before early expiration; the savings are in subsequent ticking and rendering. Particle distance deliberately reduces distant effects. FPS gains have not been benchmarked in matched worlds.

Press **Right Shift** in a world to open the Fusion Mods menu. All mods, HUD, and Performance categories list the three real modules. Use the switches to toggle, use +/− to adjust limits, or press 1–3 to toggle modules. Right Shift or Escape closes the menu. In-game changes take effect immediately and save per release to fusion.properties; the launcher rereads them when its Mods tab gains focus. Launcher switches apply at the next launch. Settings contains global background FPS and particle distance defaults; changing them updates existing profiles. New installations use Fusion by default; existing saved Vanilla selections are preserved.

Worlds remain isolated: Vanilla uses `instances/<version>` and Fusion uses `instances/<version>-performance`. The latter name is retained to preserve existing worlds. Files tracked by the previous third-party preset are renamed `.disabled` during migration; user-added JARs are preserved, but this runtime does not load Forge/Fabric mods.

The runtime has no network access, telemetry, account handling, or server changes. Its three hooks run in the client. A runtime integrity check precedes installation. Microsoft account verification remains mandatory in the launcher’s main process. No Test edition is distributed.

## Building

Install a JDK supporting `javac --release 8` (development uses JDK 25). `npm run build:mods` compiles the Java sources, relocates ASM's package to avoid library conflicts, bundles the 49 mapping profiles, and writes `electron/runtime/fusion-runtime.jar` plus its SHA-512 manifest. `npm run build` includes this step. Installed launchers use the automatic Minecraft runtimes and do not need a developer JDK.

ASM is a low-level bytecode library, not a Minecraft optimization mod. Its BSD license is included in the runtime JAR and at `runtime/vendor/LICENSE-ASM.txt`. The pinned vendor JAR is ASM 9.10.1, SHA-256 `ed825d10ab1399c8c0cb669e688cf0c8c82629b4c8399b58352b68e92ca10fcb`.

Profiles use Mojang client mappings for modern obfuscated releases, MCP SRG mappings for the available legacy releases, and unobfuscated names for 26.1. The seven intermediate 1.8 point releases are ported using unique class/member bytecode evidence, then audited against each official client JAR. Regeneration tools live in scripts/runtime-profiles.cjs and scripts/port-legacy-runtime.cjs. The shipped profiles contain only names/descriptors; game classes and downloaded mapping archives are not bundled. Injections use exact method descriptors and report a missing hook rather than claiming success.

Tests: `npm test`, `node scripts/runtime-world-test.cjs <version>` for interactive local-world QA. The latter keeps its test game open until closed. Test outputs live under `test-output/v0.8`.

## Texture overlay (Runtime 0.4.0)

The in-game screen uses the same Inter font, charcoal palette, accent colors, icon rail, and rounded cards as the launcher. A Java2D painter rasterizes the panel at 1600 × 1000, then uploads it as one Minecraft-owned texture with linear filtering. Mouse hit regions use the same virtual layout as the painter, so scaling preserves interaction. The texture is reused between changes and released when the menu closes. No rendering or image generation runs during ordinary gameplay. The launcher accent is copied into each game profile at launch.

The overlay runs inside the game renderer and works with its window coordinates; it does not create a separate always-on-top desktop window. Native GPU behavior still needs hands-on confirmation on each target version. Static binding audits and JVM screen/bytecode verification cover all 49 releases. Rendering in a running world has not been manually rechecked on all 49.
