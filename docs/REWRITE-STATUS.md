# Rewrite delivery status

This is the implementation record for the camera-studio rewrite. It separates shipped software from visual-simulation work that still needs real assets and device review.

| Stage | Status | Evidence |
| --- | --- | --- |
| 1. Engineering and workbench | Implemented | React / TypeScript / Vite, hashed GitHub Pages paths, three-language resources, responsive layouts, source selector, and Playwright setup. |
| 2. Camera core and first scene | Core workflow implemented | EV100 solver, P / A / S / M and Auto ISO, exposure meter, capture, IndexedDB playback, editing, and local export. Unit tests cover one-stop changes and exposure modes. |
| 3. Sources and scenes | Partial | All four sources are wired up. Three 2D lessons composite independent, transparent PBR subject sprites with per-layer depth blur and a limited moving-car path. Three local backplates combine with locally bundled PBR glTF props in the real-time stage. An explicit progress display saves the optional 3D asset pack for offline use. The city and room environments are still photographic plates, not complete relightable models. |
| 4. Photo workflow | Implemented with limits | Local capture restore, side-by-side comparison, editing presets, sliders, reset / undo / redo, versioned settings, crop-aware PNG / JPEG export and optional watermark are present. Physical-camera depth is not inferred. |
| 5. PWA, QA, and Pages | Deployed and verified | App-shell, 2D backplates, and transparent depth-layer sprites are precached; users can separately download the optional 3D asset pack. Updates wait for user confirmation. Type checking, 13 unit tests, the 38-pass Playwright run, and the main-branch build / deployment workflow passed. The deployed homepage, `sw.js`, a layered PNG, and a scene JPEG return HTTP 200. See [the deployment workflow](https://github.com/Lian0123/camera-simulator/actions/runs/36352115680). |

## Work that remains before this meets the complete brief

- Replace the WebGL photograph planes with fully modeled environments and tune true depth / temporal motion sampling. The current 3D props have real geometry and focus blur, while each city or interior background is still a flat photographic plate.
- Refine the 2D depth layers with additional foreground, middle, and background masks; current lessons have individually separable foreground objects over one photographic backplate.
- Review the result on physical phones, including real camera access and sustained frame rate. Automated mobile coverage uses Pixel 7 emulation and a 360 px viewport.
- Test IndexedDB quota exhaustion and WebGL context loss, and review the real camera on supported physical phones. Permission-denied behavior and long-exposure cancellation are covered by automated browser checks.

See [asset notes](ASSETS.md), [validation report](VALIDATION.md), and [screenshots](screenshots/) for the current review material.
