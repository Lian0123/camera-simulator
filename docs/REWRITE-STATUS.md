# Rewrite delivery status

This is the implementation record for the camera-studio rewrite. It separates shipped software from visual-simulation work that still needs real assets and device review.

| Stage | Status | Evidence |
| --- | --- | --- |
| 1. Engineering and workbench | Implemented | React / TypeScript / Vite, hashed GitHub Pages paths, three-language resources, responsive layouts, source selector, and Playwright setup. |
| 2. Camera core and first scene | Core workflow implemented | EV100 solver, P / A / S / M and Auto ISO, exposure meter, capture, IndexedDB playback, editing, and local export. Unit tests cover one-stop changes and exposure modes. |
| 3. Sources and scenes | Partial | 2D photographic plates, imported images, camera access and fallback, and a WebGL viewfinder are wired up. The WebGL stage still uses a photographic plane rather than relightable 3D models; the built-in 2D photographs are not separated depth layers. |
| 4. Photo workflow | Implemented with limits | Local capture restore, side-by-side comparison, editing presets, sliders, reset / undo / redo, versioned settings, crop-aware PNG / JPEG export and optional watermark are present. Physical-camera depth is not inferred. |
| 5. PWA, QA, and Pages | Build and offline QA implemented; deployment pending | Hashed app-shell and scene assets are precached, updates wait for user confirmation, and Pages Actions deploys `main`. Publication depends on a successful push and the repository Pages source being set to GitHub Actions. |

## Work that remains before this meets the complete brief

- Replace the WebGL photograph plane with three authored 3D environments using locally bundled, licensed models, materials, and lighting. The current stage does not provide true depth-based focus or physically sampled motion.
- Create true multi-layer 2D practice scenes with depth maps and object masks.
- Review the result on physical phones, including real camera access and sustained frame rate. Automated mobile coverage uses Pixel 7 emulation and a 360 px viewport.
- Test IndexedDB quota exhaustion and WebGL context loss, and review the real camera on supported physical phones. Permission-denied behavior and long-exposure cancellation are covered by automated browser checks.

See [asset notes](ASSETS.md), [validation report](VALIDATION.md), and [screenshots](screenshots/) for the current review material.
