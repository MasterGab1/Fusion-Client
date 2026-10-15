# Fusion 0.10.0

- Native Fusion installer with folder selection, desktop shortcut choice, progress, and launch action. Silent in-place updates remain supported.
- Automatic settings saving with serialized writes; compact Game, Appearance and Launcher categories.
- Reset imported backgrounds directly from Play or Versions.
- Larger, spaced sidebar icons, theme transitions, and cleaner Mods controls. Promotional Modrinth labels and the Discord connection-status row are removed; discovery and Discord Rich Presence remain.
- Fusion Runtime 0.4.0 covers all 49 releases already offered in the existing eight families. No new families or snapshots are added. The menu watermark remains hidden during normal gameplay.
- Private GitHub updater uses this PC's Git Credential Manager sign-in. Credentials are never included in the installer.
- Sign-in errors distinguish an explicit invalid application registration from a generic Minecraft HTTP 403.

Install `Fusion-Setup-0.10.0.exe` once. Future releases are available through Updates. Keep Git for Windows installed and signed into a GitHub account with access to this private repository.

Validated: 48 automated service tests; hidden Electron UI and persistence checks; installer flow/silent update tests using an isolated mock engine; static mapping audits and JVM verification for all 49 releases. Gameplay/rendering has not been manually checked on every release or GPU.

Microsoft sign-in still depends on Minecraft accepting Fusion's application registration. Follow docs/MICROSOFT-SETUP.md if registration is rejected; this release cannot grant that server-side approval. Fusion's built-in modules use the Fusion profile; Fabric/Forge community profiles remain separate.
