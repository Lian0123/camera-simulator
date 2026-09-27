# Changelog

## 1.0.0 — Stillframe studio rewrite

- Replaced the CDN and single-file prototype with a modular React, TypeScript, and Vite application.
- Added an EV100-based exposure solver, responsive camera studio UI, scene and image sources, capture review, local photo persistence, and in-browser image development.
- Added Japanese and English UI resources, local-first PWA caching, and a GitHub Pages build/deploy workflow.
- Added new locally bundled photographic practice imagery.
- Added explicit camera permissions and stream cleanup, settings schema validation, IndexedDB capture restore, edit undo / redo, and JPEG / PNG export from both desktop and mobile review.
- Added Chromium, Firefox, WebKit, Pixel 7, and 360 px Playwright coverage; the production build now precaches its hashed app shell for offline use and offers an update only after the user chooses it.
