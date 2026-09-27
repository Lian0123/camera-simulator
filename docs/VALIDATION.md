# Validation report

Run these commands from the repository root after `npm ci`:

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The Playwright server serves the built `dist` output at the `/camera-simulator/` project path, matching GitHub Pages. Browser projects cover Chromium, Firefox, WebKit, Pixel 7 emulation, and a 360 px touch viewport. End-to-end coverage includes capture / IndexedDB restore / editing / export, long-exposure cancellation, photo upload errors, denied camera permission and fallback, the mobile export entry point, and first-visit offline reload.

Latest local run: `npm run typecheck`, `npm test` (13 tests), `npm run build`, and `npm run test:e2e -- --workers=1` all passed. The browser suite reported 35 passed and 15 expected skips across five projects. Skips are browser/device-specific checks that run in their designated project.

`docs/screenshots/` contains captured desktop and mobile layouts. No physical phone or hardware camera was available in this automated run; those remain manual acceptance checks.
