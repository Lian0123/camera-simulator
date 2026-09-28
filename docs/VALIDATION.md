# Validation report

Run these commands from the repository root after `npm ci`:

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The Playwright server serves the built `dist` output at the `/camera-simulator/` project path, matching GitHub Pages. Browser projects cover Chromium, Firefox, WebKit, Pixel 7 emulation, and a 360 px touch viewport. End-to-end coverage includes the three independently layered 2D scenes, changes to their depth blur as aperture changes, preview framing, capture and playback; IndexedDB restore / editing / export; rendered 3D assets and capture; the complete downloaded 3D pack while offline; long-exposure cancellation; photo upload errors; denied camera permission and fallback; mobile export; and first-visit offline reload.

Latest local run: `npm run typecheck`, `npm test` (21 tests), and `npm run build` passed. The full browser suite reported 38 passed and 27 expected browser/device-specific skips across five projects; follow-up profile-switch and picture-style checks passed in all five projects, and the brand-metadata comparison check passed in Chromium. These cover the six body menus at desktop and mobile widths, including the 360 px touch viewport. The build emits the WebGL stage as a lazy-loaded 587 KiB JavaScript chunk (150 KiB gzip); it is fetched only when the 3D source is selected.

The main-branch [GitHub Actions run](https://github.com/Lian0123/camera-simulator/actions/runs/36352115680) passed the same checks and deployed Pages. After deployment, the site root, `/camera-simulator/sw.js`, the transparent plant layer PNG, and the window backplate JPEG all returned HTTP 200. The updated release is served beneath the configured project path.

`docs/screenshots/` contains the desktop studio, a [360 px mobile view](screenshots/mobile-360.png), its [expanded camera-profile panel](screenshots/mobile-360-camera-settings.png), the three layered 2D scenes, and the three 3D stages. No physical phone or hardware camera was available in this automated run; IndexedDB quota exhaustion and real WebGL context loss also remain manual acceptance checks.
