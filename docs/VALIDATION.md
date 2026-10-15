# Build validation

## 0.10.0 installer, persistence and runtime coverage — 15 October 2026

- 48 service tests pass. Private-update credentials are kept out of observable state; serialized settings writes recover after errors.
- Hidden Electron checks cover background reset/path validation, 15 simultaneous setting patches, autosave across navigation/reload, compact settings at 980 × 660, browser-login cancellation, community mod dependency downloads, news and themes.
- Native WPF setup compiles with the official NSIS payload. Isolated mock-engine tests cover silent argument forwarding, paths with spaces, exit codes, desktop shortcut flags, progress/completion and retry UI. The real installer was not run over the user's installation.
- Runtime 0.4.0 supplies all 49 existing releases. Static member audits and JVM verification of generated screens plus all four instrumented hook classes pass for every release. New families and snapshots are not added. Full gameplay/GPU checks across all releases remain manual.
- The 118,802,944-byte official installer has a regenerated blockmap and SHA-512 metadata. Source and v0.10.0 were published to the verified-private repository. A real electron-updater client authenticated through Git Credential Manager, discovered the release, downloaded all bytes and verified the installer checksum in an isolated cache. Installation was not invoked.
- Minecraft registration approval remains outside launcher code. Authentication diagnostics now distinguish explicit invalid-registration errors from other HTTP 403 responses.


## 0.9.0 launcher refresh and Modrinth — 15 October 2026

- 46 Node tests pass, including required and pinned dependencies, incompatible versions, failed-download rollback, preserving manual files, dependency-aware removal, interrupted-commit recovery, CDN/path restrictions, and browser redirect diagnostics.
- Production Electron IPC and React UI pass in an isolated hidden offscreen window: direct browser authorization/cancel, online-account launch gate, one-click shortcuts, searchable release dropdown, real Modrinth search/download/install, dependency inventory and guarded removal, official news, settings persistence, accent color, reduced motion, and the 980 × 660 layout. Browser launch is intercepted; no Microsoft credentials are used. Screenshots are in test-output/v0.9 and were visually inspected.
- Live Modrinth installation of Sodium Extra for Fabric 1.20.1 resolved and verified Sodium and Fabric API. All three JARs downloaded into an isolated QA profile. This does not prove arbitrary mod combinations compatible.
- Actual loader installation and version parsing passed for Fabric 1.20.1 and 26.1.2, legacy Forge 1.8.9, and Forge 1.20.1 including its Java processors. No new Minecraft game window was opened, per the user's self-testing preference. In-game behavior of these community profiles remains unverified.
- Existing Java runtime tests pass for focus caps, particle boundaries, configuration persistence, high-resolution overlay rendering, hit regions, and menu-only logo visibility. Runtime remains 0.3.0 and is loaded only by the Fusion profile.
- Microsoft's redirect registration remains an owner action: register http://localhost under Mobile and desktop applications for the bundled Application ID. The launcher uses a root-path loopback callback, PKCE and state validation. No client secret is required. Live account login is not claimed fixed or verified by these tests.
- CurseForge was dropped at the user's request in favor of Modrinth only. Fusion built-in and Fabric/Forge community mods use separate profiles. No GitHub upload or release publication is authorized.

## 0.8.1 official launcher and texture overlay — 14 October 2026

- 37 Node tests pass: browser PKCE, mandatory online authentication, removal of local-profile bypasses, Discord framing/acknowledgement/game activity/cleanup, official-only update validation, settings, skins, and game-to-launcher module persistence.
- Java tests pass for bounded settings, saved runtime preferences, particle radius, focus FPS caps, high-resolution overlay rendering, hit regions, transparency, and logo visibility.
- The actual generated screen classes and injected keyboard hooks verify against cached official classes for all eight target releases. Texture upload and blit method signatures are checked. This does not replace native GPU testing.
- The new panel was rendered from production painter code to test-output/v0.8/overlay.png and visually inspected. It uses Inter, supplied white branding, an icon rail, rounded cards, and real module switches. No HUD watermark draw call remains.
- Before the texture redesign, Electron UI checks passed for version selection/art, browser-only sign-in and cancellation using the bundled client ID, settings persistence, mod toggles, updater states, and real WebGL skin rendering/import/export/username lookup. Account and update-service responses use fixtures where explicitly documented.
- The user requested finishing the build without further desktop/game UI control. The texture overlay has therefore not been visually confirmed in a running world. The older pixel-rendered watermark was observed in 1.8.9 before being replaced.
- Microsoft real-account sign-in, account skin upload, live Discord acknowledgement, and an installed older-to-newer update remain unverified. Public IDs are bundled, but service-side registration/approval is outside automated test coverage.
- GitHub publishing was explicitly deferred by the user. No source or release has been uploaded.



## 0.7 compact launcher, updater, and first-party runtime — 12 October 2026

- 38 Node tests pass. Updater tests cover lazy loading, explicit downloads, progress, verified-ready state, regular/test artifact isolation, invalid URLs/checksums, retry after failure, duplicate checks, unpacked-install refusal, and blocking restart during game/account operations.
- Java runtime tests pass for background FPS caps/restoration, particle radius boundaries, and bounded configuration. All eight exact releases reached game renderer initialization with all three first-party hooks in the runtime startup checks recorded under `test-output/v0.6/`.
- Real local worlds verified the Fusion watermark on 1.8.9 and 26.1.2. F1 hiding was checked on 1.8.9. In 26.1.2, `/particle minecraft:flame ~30 ~ ~ 0 0 0 0 1 force` triggered the runtime's logged expiration beyond the configured 24-block radius. Screenshots are in `test-output/v0.7/watermark-*.png`. No matched-world FPS improvement benchmark is claimed.
- Actual Electron tests pass for the compact layout, all artwork, one-click preferred releases, release search, switching families, imported backgrounds, saved selections/settings, Microsoft launch gating, browser PKCE cancellation, all three mod controls, and real WebGL skin preview/import/export/public username download. Minimum window size remains 980 × 660.
- Updater available/download-progress/ready/reopen states pass in the actual UI using a fixture transport. The fixture never downloads or runs an installer. The packaged app's real GitHub check reports no accessible published release; it does not claim to be up to date when the feed cannot be read.
- Both Windows NSIS builds completed, with separate `latest` and `test` channels and separate updater caches. Both packaged runtime JARs match their SHA-512 manifests. The packaged TEST executable launched official 1.8.9 as FusionTester, initialized the renderer, and installed all three Fusion hooks without Microsoft sign-in.
- Packaged REGULAR version-picker/updater checks and TEST settings/mods/skins/updater checks pass. Regular and Test retain separate app IDs and data folders; the local identity exists only in Test metadata.
- Three direct-executable startup measurements reached visible UI with hero artwork in **354, 387, and 372 ms**. These include Playwright instrumentation, use fresh isolated launcher data, and exclude game downloads. Results are machine/cache dependent. The old 0.4 portable measured 12.8–15.3 seconds to a visible native window; the metrics differ, so no precise speedup ratio is claimed.
- Production dependency audit: zero known vulnerabilities. `electron-updater` is pinned to patched 6.8.9.
- Release assets are prepared in `release-bundle/0.7.0/`. The GitHub Actions workflow and publishing instructions are included, but nothing has been uploaded or published to the repository.

Still unverified: a live older-to-newer installed update (requires accessible published releases), real Microsoft sign-in/gameplay and account skin upload (requires the owner's approved application client ID and licensed account), and in-world behavior on every supported release. Startup coverage for all eight versions does not substitute for full gameplay testing.

## 0.4 icon navigation and skins — 26 September 2026

- 25 unit tests pass, including PNG type/dimensions/size validation, library persistence and removal, classic/slim persistence, blocked path traversal, restricted texture hosts, download limits, upload authorization, multipart content, and failure responses.
- The actual Electron skin checks pass: left icon navigation and hover labels, real WebGL rendering, drag rotation, walking, no idle animation frames, PNG import and export, live Mojang username lookup, account gating, saved selection after restart, and the 980 × 660 layout.
- Existing version-picker, image import, account, and settings smoke checks still pass after moving navigation.
- The skin UI checks also pass in both packaged Windows builds; the normal app retains account gating and the test build disables account uploads. Test file dialogs are supplied by fixtures; the PNG importer/exporter, WebGL renderer, and public Mojang lookup run for real.
- Real Microsoft skin upload is implemented but remains unverified with a live licensed account; upload request/response handling is tested with fixtures.
- Screenshots are saved under `test-output/v0.4/`.

## 0.3 artwork, layout, and local test build — 26 September 2026

- 17 unit tests passed. The normal launcher rejects local identities before any download, and only the separate test packaging configuration enables the fixed local profile.
- Actual Electron UI checks passed: all eight bundled family images load, release folders and selection work, custom-image import persists, settings validate, and the regular app rejects unsigned-in launch attempts.
- The same UI checks passed against the final packaged regular executable, including image loading from the ASAR and the 980 × 660 layout.
- The packaged test executable launched official Minecraft 1.8.9 as `FusionTester`, with no account or client ID. The integration test verified a visible native window titled Minecraft 1.8.9 and closed its own game process afterwards.
- That test exposed an inherited `windowsHide` issue. Game launch now prefers `javaw.exe` and leaves the game window visible; Java version checks remain hidden.
- Screenshots and local game output are under `test-output/v0.3/`.
- Microsoft-authenticated gameplay remains unverified. Local game launching was verified on 1.8.9; not every supported subrelease was launched.

## 0.2 redesign — 25 September 2026

- 14 unit tests passed, including version-family boundaries, subrelease inclusion, snapshot exclusion, and unsupported version rejection before authentication/download.
- Electron UI checks passed: eight families only; 1.12 opens to 1.12, 1.12.1, and 1.12.2; default release selection; saved release persistence; missing-account launch refusal; account setup dialog; settings validation and persistence.
- Background import uses a stubbed native file-picker result in the test, then exercises the real importer, image decoding, local image protocol, rendering on the picker/home screen, and persistence across restart. Unknown family/path import requests are rejected.
- Old 26.3 selection migrates to 1.8.9; obsolete snapshot preferences are removed.
- Minimum 980 × 660 window checked for horizontal overflow.
- Screenshots saved under `test-output/v0.2/`.
- The complete UI suite also passed against the packaged Windows executable; imported artwork loaded through the packaged app's custom protocol.
- Startup shows the native window immediately instead of waiting on `ready-to-show`; the desktop suite asserts that the actual BrowserWindow is visible.
- Production dependency audit: zero known vulnerabilities.
- Real-account sign-in and authenticated gameplay remain unverified pending the owner's approved Microsoft application client ID.

## 0.1 foundation

Validated on Windows x64, 24 September 2026.

- Production Vite build and Electron portable packaging completed.
- 11 automated authentication/launch-policy tests passed, including missing account, mismatched client ID, network failure, missing ownership, API rejection, refresh-token rotation, device-code polling, cancellation, and invalid/concurrent launch requests.
- Actual Electron UI checks passed in development and the packaged application: rendering, sign-in setup, setup guide, invalid client-ID rejection, saved memory settings, version search/selection, account view, and persistence across restart.
- Packaged Electron sandbox enabled; context isolation enabled; Node integration disabled.
- Windows safeStorage encryption/decryption round trip passed.
- Native extraction using dependencies inside the packaged ASAR passed.
- Real official downloads checked for Minecraft 1.8.9 (including assets) and 26.3 (jar/libraries). Automatic Java 8 and Java 25 installation and execution (`java -version`) passed; native extraction and launch argument generation passed for both versions.
- npm production dependency audit reported zero known vulnerabilities.

Not verified: Microsoft OAuth with a real approved project client ID, real player entitlement/profile verification, a launched authenticated Minecraft session, and every historical/snapshot version. Real account testing needs the owner's Microsoft app registration and licensed account.

The UI screenshots under `test-output/` were captured from the real Electron app. Download verification does not start a Minecraft game process or bypass authentication.
