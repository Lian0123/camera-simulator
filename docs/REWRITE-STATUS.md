# Rewrite delivery status

This is the implementation record for the camera-studio rewrite. It separates shipped software from visual-simulation work that still needs real assets and device review.

| Stage | Status | Evidence |
| --- | --- | --- |
| 1. Engineering and workbench | Implemented | React / TypeScript / Vite, hashed GitHub Pages paths, three-language resources, responsive layouts, source selector, and Playwright setup. |
| 2. Camera core and first scene | Core workflow implemented | EV100 solver, P / A / S / M and Auto ISO, exposure meter, capture, IndexedDB playback, editing, and local export. Unit tests cover one-stop changes and exposure modes. |
| 3. Sources and scenes | Partial | All four sources are wired up. Three local backplates combine with locally bundled PBR glTF props, focus blur, and limited view motion. An explicit progress display saves the optional 3D asset pack for offline use. The environments are still photographic plates, not complete relightable models; the 2D photographs still lack independent depth layers. |
| 4. Photo workflow | Implemented with limits | Local capture restore, side-by-side comparison, editing presets, sliders, reset / undo / redo, versioned settings, crop-aware PNG / JPEG export and optional watermark are present. Physical-camera depth is not inferred. |
| 5. PWA, QA, and Pages | Previous version deployed; current revision in validation | App-shell and 2D scenes are precached; users can separately download the optional 3D asset pack. Updates wait for user confirmation. The original rewrite is live at the target URL; this follow-up needs its final workflow and Pages check before it can be recorded as deployed. |

## Work that remains before this meets the complete brief

- Replace the WebGL photograph planes with fully modeled environments and tune true depth / temporal motion sampling. The current 3D props have real geometry and focus blur, while each city or interior background is still a flat photographic plate.
- Create true multi-layer 2D practice scenes with depth maps and object masks.
- Review the result on physical phones, including real camera access and sustained frame rate. Automated mobile coverage uses Pixel 7 emulation and a 360 px viewport.
- Test IndexedDB quota exhaustion and WebGL context loss, and review the real camera on supported physical phones. Permission-denied behavior and long-exposure cancellation are covered by automated browser checks.

See [asset notes](ASSETS.md), [validation report](VALIDATION.md), and [screenshots](screenshots/) for the current review material.
