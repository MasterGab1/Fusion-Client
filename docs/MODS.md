# Fusion mods

Fusion 0.13 combines the first-party runtime with supported Fabric and Forge installations. See [community mods](COMMUNITY-MODS.md) for batch downloads, dependencies and compatibility.

Fusion uses first-party code in `runtime/src/fusion/runtime`. It does not load Sodium, Lithium, FerriteCore, FoamFix, Entity Culling, Fabric, or Forge. The launcher bundles a small Fusion Runtime JAR and loads it as a Java agent; original Minecraft JARs on disk stay unchanged.

The existing eight families retain their 49 stable releases. Every release offered by this build has a bundled Fusion runtime profile, including the base and point releases. New releases are admitted only after mappings are added and checked; snapshots are excluded. Choose Fabric or Forge in Mods when using third-party mods. The Installed tab contains the built-in controls.

| Module | Behavior |
| --- | --- |
| Watermark | Small white logo while an in-world menu is open; hidden during normal gameplay. |
| Saturation | Hunger and estimated client saturation, not server-verified. Off by default. |
| Free look | Hold Left Alt to rotate the camera without changing player aim; releases to the previous camera mode. Off by default. |
| FPS / Coordinates | Optional game-font readouts. Off by default; respect Hide GUI. |
| Background FPS | Caps the original frame limit while the game is unfocused, then restores the original limit on return. Default: 30 FPS; configurable from 5–60 FPS. Never raises a lower game cap. |
| Particles | Expires particles created farther than the configured distance from the player. Default: 24 blocks; configurable from 8–64 blocks. Player coordinates are sampled at most once per 25 milliseconds. |

These are initial optimizations, not a renderer replacement. Particle creation still occurs before early expiration; the savings are in subsequent ticking and rendering. Particle distance deliberately reduces distant effects. FPS gains have not been benchmarked in matched worlds.

Press **Right Shift** in a world to open the Fusion Mods menu. Mods, HUD, Performance and Controls organize the seven built-in features. The Installed category lists third-party mods. Use the switches to toggle, use +/− to adjust limits, or press 1–3 to toggle modules. Right Shift or Escape closes the menu. In-game changes take effect immediately and save per release to fusion.properties; the launcher rereads them when its Mods tab gains focus. Launcher switches apply at the next launch. The menu size controls range from 60–95% of the available screen, defaulting to 75%. Settings contains menu size, background FPS and particle distance defaults; changing them updates existing profiles. New installations use Fusion by default; existing saved Vanilla selections are preserved.

Worlds remain isolated: Vanilla uses `instances/<version>` and Fusion uses `instances/<version>-performance`. The latter name is retained to preserve existing worlds. Files tracked by the previous third-party preset are renamed `.disabled` during migration; user-added JARs are preserved. Fabric and Forge use their own isolated game folders and load third-party JARs alongside Fusion.

The runtime has no network access, telemetry, account handling, or server changes. Its hooks run in the client. A runtime integrity check precedes installation. Microsoft mode verifies the account in the launcher’s main process. An explicitly selected Local testing profile can launch singleplayer without Microsoft sign-in; there is no separate Test edition.

## Building

Install a JDK supporting `javac --release 8` (development uses JDK 25). `npm run build:mods` compiles the Java sources, relocates ASM's package to avoid library conflicts, bundles the 49 vanilla profiles plus 36 Fabric and 39 Forge loader profiles, and writes `electron/runtime/fusion-runtime.jar` plus its SHA-512 manifest. `npm run build` includes this step. Installed launchers use the automatic Minecraft runtimes and do not need a developer JDK.

ASM is a low-level bytecode library, not a Minecraft optimization mod. Its BSD license is included in the runtime JAR and at `runtime/vendor/LICENSE-ASM.txt`. The pinned vendor JAR is ASM 9.10.1, SHA-256 `ed825d10ab1399c8c0cb669e688cf0c8c82629b4c8399b58352b68e92ca10fcb`.

Profiles use Mojang client mappings for modern obfuscated releases, MCP SRG mappings for the available legacy releases, and unobfuscated names for 26.1. The seven intermediate 1.8 point releases are ported using unique class/member bytecode evidence, then audited against each official client JAR. Regeneration tools live in scripts/runtime-profiles.cjs and scripts/port-legacy-runtime.cjs. The shipped profiles contain only names/descriptors; game classes and downloaded mapping archives are not bundled. Injections use exact method descriptors and report a missing hook rather than claiming success.

Tests: `npm test`, `node scripts/runtime-world-test.cjs <version>` for interactive local-world QA. The latter keeps its test game open until closed. Test outputs live under `test-output/v0.8`.

## Texture overlay (Runtime 0.6.0)

The in-game screen uses the same Inter font, charcoal palette, accent colors, icon rail, and rounded cards as the launcher. A Java2D painter rasterizes the panel at 1600 × 1000, then uploads it as one Minecraft-owned texture with linear filtering. Mouse hit regions use the same virtual layout as the painter, so scaling preserves interaction. The texture is reused between changes and released when the menu closes. The panel is not rendered during ordinary gameplay. Enabled HUD readouts use the game font; the menu-only watermark texture is cached. The launcher accent is copied into each game profile at launch.

The overlay runs inside the game renderer and works with its window coordinates; it does not create a separate always-on-top desktop window. Native GPU behavior still needs hands-on confirmation on each target version. Static binding audits and JVM screen/bytecode verification cover all 49 releases. Rendering in a running world has not been manually rechecked on all 49.

## Loader interoperability

Loader-specific profiles use Fabric intermediary and Forge SRG names. The runtime shares its classes through the bootstrap loader and uses the active game loader for Minecraft classes. A narrowly scoped Fabric class-loader bridge resolves only `fusion.runtime.*` classes. Forge HUD overrides are hooked as well as vanilla HUD methods. The overlay Installed category displays the launch-time inventory, including manual JAR filenames; third-party configuration remains in each mod or the launcher.

Real prelaunch probes cover Fabric 1.16.5, 1.20.1 (with Mod Menu and Fabric API), 1.21.11 and 26.1.2, plus Forge 1.8.9 and 1.12.2. They check hook installation and generated-screen linking before a game window opens. Modern Forge mappings are not equivalent to verified gameplay support. Arbitrary mod combinations can still conflict.
