# Fusion background

## 0.2 — Minecraft 1.8 family

Original artwork generated with the built-in image_gen tool, not an official Mojang image. Source: `public/assets/versions/1.8-original.png`. Optimized app asset: `public/assets/versions/1.8.webp` (shared across the 1.8 family, including 1.8.9).

Final prompt:

> Create an original landscape illustration for a block-building game's desktop launcher. Wide 16:9 panoramic composition. A beautifully art-directed sunny voxel world with strictly cubic geometry, crisp square pixel textures, rich green grassy hills with exposed dirt and stone blocks, oak trees with chunky cube-leaf canopies, a small oak-plank and cobblestone village with wheat fields, and a meandering blue river. Mountains recede into a light blue distance. Bright clear blue sky with rectangular block clouds. A small block-built pig and sheep in the meadow. Clean dimensional 3D game promotional artwork, soft ambient occlusion, warm afternoon sun and natural shadows, cheerful classic sandbox atmosphere. Camera from a grassy hill overlooking the village, village and most detail centered and on the right, quieter meadow on the lower left where a launcher will place controls. Era inspired by classic mid-2010s voxel games. No modern machinery, no neon colors, no fantasy portal, no glowing effects, no floating islands. No people. No text, lettering, logos, branding, watermarks or UI. High quality crisp illustration, not photorealism.

## 0.3 — supplied artwork

Every build now processes the supplied files into local WebP assets. Previously these files were present but were not connected to the catalog or build pipeline.

| Family | Source |
| --- | --- |
| 1.8 | `public/assets/versions/1.8-original.png` |
| 1.12 | `world_of_color.png` |
| 1.16 | `updates/netherupdate.png` |
| 1.18 | `updates/caves_and_clifss.png` |
| 1.19 | `updates/warden_udpatte.png` |
| 1.20 | `updates/trails_and_tales.png` |
| 1.21 | `updates/mountsofmayhem.png` |
| 26.1 | `updates/thecopperage.png` |

These are family backgrounds, not claims that every subrelease corresponds to the update pictured. In particular, the supplied Copper Age artwork is assigned to 26.1 as a visual choice. `updates/villageandpillage.png` is preserved but not assigned because the requested families do not include 1.14. The Change background control can override any family image; overrides survive updates.

## 0.1 — archived artwork

Generated with the built-in image_gen tool and saved to `public/assets/fusion-world.png`. The app uses `public/assets/fusion-world.webp`.

Final prompt:

> Use case: stylized-concept. Asset type: wide background artwork for a premium Minecraft Java desktop launcher called Fusion. Create a gorgeous cinematic Minecraft voxel world, clearly block-built pixel-textured terrain, dramatic lush mountainous floating cliffs over a turquoise river valley, rustic block-built wooden and stone village houses, cherry blossom trees and pink petals, a distant glowing pink-purple portal built from dark blocks on the right, sunrise peach light from upper right with deep violet cloud shadows. Wide panoramic 16:9 image. Rich emerald vegetation, pale pink cherry blossoms, subtle purple atmosphere. Foreground depth with grassy block ledges. Composition: relatively calm dark mountainous vegetation on left third suitable for overlaid white text, most interesting village and portal details center/right. Beautiful high-end ray-traced Minecraft screenshot aesthetic, crisp square voxel geometry, cinematic atmospheric depth. No text, no lettering, no logo, no watermark, no UI. Generate as landscape.

## 0.8 — Fusion branding

The pink, violet, and blue source logos in `assets/branding` were supplied by the project owner. The build trims transparent padding and creates the launcher images and Windows icon.

The white in-game variant is saved at `assets/branding/white.png`. It was edited from the supplied pink logo with the built-in image-generation tool, using real transparency. Runtime 0.3.0 bundles a 256-pixel copy and composites it into the high-resolution menu texture.

Final prompt:

> Edit target: the attached Fusion F logo. Create its flat pure-white monochrome counterpart for a small in-game HUD watermark. Preserve the distinctive angular F monogram and hexagonal surrounding outline from the original, simplifying the 3D bevels into crisp solid white shapes separated by transparent negative spaces. No pink, gray, black ink, gradients, shadows, text or additional marks. Centered square composition with modest transparent padding, actual alpha transparent background. Must be clearly recognizable at 24 pixels. This is a recoloring/simplification of the exact supplied logo, not a new brand.

Inter Regular and Semibold in runtime/assets are static instances (weights 400 and 600) derived from the installed @fontsource-variable/inter Latin WOFF2 using FontTools. The SIL Open Font License is bundled in the runtime JAR. The overlay is drawn from application code; it is not an AI-generated screenshot.
