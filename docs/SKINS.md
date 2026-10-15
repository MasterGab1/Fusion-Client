# Skins

Open the shirt icon in the left navigation rail. Hover or keyboard-focus any rail icon to see its label.

- **Import PNG** adds a 64 × 64 or legacy 64 × 32 Minecraft skin to the local library. Original files are unchanged.
- Enter a Java username and select **Load skin** to download its current public skin from Mojang. Then select **Download PNG** to save the texture through the Windows file dialog.
- Drag the 3D model to rotate it, scroll to zoom, and use the toolbar for automatic rotation, walking, the outer layer, or resetting the camera.
- Choose **Classic** or **Slim** arms before applying. Legacy 64 × 32 textures only support Classic. Model selection is saved with imported skins.
- **Apply skin** uploads the selected PNG and arm model to the signed-in Minecraft account. Restart Minecraft to refresh the in-game skin. The person icon loads the current account's public skin.
- Select a saved skin and use the library's trash icon to remove the local copy. The imported source file and account skin are not deleted.

The test build supports the complete library, downloader, and 3D preview. It cannot upload an account skin or inject a skin into offline vanilla gameplay. That would require separate in-game integration. The regular launcher needs a signed-in licensed account and an approved Microsoft application ID to apply skins.

Skin images are decoded and validated in Electron's main process. Upload tokens never enter the renderer. Public downloads use fixed Mojang profile endpoints and restrict textures to `textures.minecraft.net`; redirects and oversized responses are rejected. Skins and selection live under the app's own `skins` folder, separate for regular and test builds.

The 3D module loads only when the Skins tab opens. Stationary previews render on changes, animation pauses when the document is hidden, and the viewer releases its resources when leaving the tab. No preview animation loop runs while idle.

## Implementation references

- [skinview3d upstream documentation](https://github.com/bs-community/skinview3d) — preview, classic/slim models, layers, and animations. MIT licenses for skinview3d, skinview-utils, and Three.js ship under `assets/licenses`.
- [XMCL's Mojang client](https://github.com/Voxelum/minecraft-launcher-core-node/blob/master/packages/user/mojang.ts) — Minecraft profile skin upload request and multipart fields.

The bundled default Steve texture comes from the official Minecraft 1.8.9 client resources. It is a Minecraft asset, not original Fusion artwork.

## Verification

`npm test` checks input validation, persistence, duplicate imports, saved arm models, deletion, hostile texture URLs, bounded downloads, request errors, account-only uploads, PNG multipart data, and upload-result confirmation with explicit fixtures. `node scripts/smoke-skins.cjs` runs the actual desktop UI, WebGL preview, drag rotation, idle rendering, PNG dialogs, a live username lookup, persistence, and the minimum window layout. Set `FUSION_TEST_EXE` to either unpacked build to run those UI checks on packaged code.

Live public downloads and previews are tested. Real account uploads remain unverified until the owner's Microsoft registration and licensed account are available; API upload tests use fixtures and never change a real user's skin.
