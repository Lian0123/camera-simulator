# Validation report

Run these commands from the repository root after `npm ci`:

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The Playwright server serves the built `dist` output at the `/camera-simulator/` project path, matching GitHub Pages. Browser projects cover Chromium, Firefox, WebKit, Pixel 7 emulation, and a 360 px touch viewport. End-to-end coverage includes capture / IndexedDB restore / editing / export, rendered 3D assets and capture, the complete downloaded 3D pack rendering while offline, long-exposure cancellation, photo upload errors, denied camera permission and fallback, the mobile export entry point, and first-visit offline reload.

Latest local run: `npm run typecheck`, `npm test` (13 tests), `npm run build`, and `npm run test:e2e -- --workers=1` all passed. The browser suite reported 37 passed and 23 expected skips across five projects. Skips are browser/device-specific checks that run in their designated project.

The main-branch [GitHub Actions run](https://github.com/Lian0123/camera-simulator/actions/runs/36349187054) passed the same checks and deployed Pages. After deployment, the site root, `/camera-simulator/sw.js`, and `/camera-simulator/models/potted_plant_04/potted_plant_04_1k.gltf` all returned HTTP 200. The model response uses `model/gltf+json` and is served beneath the configured project path.

`docs/screenshots/` contains captured desktop and mobile layouts. No physical phone or hardware camera was available in this automated run; those remain manual acceptance checks.
