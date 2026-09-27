# Stillframe — Camera Studio

Stillframe is a quiet, local-first camera practice studio. Explore how exposure settings change a photograph, work with one of three photographic scenes or a photo from your device, then review and develop your captures.

**Live site:** [lian0123.github.io/camera-simulator](https://lian0123.github.io/camera-simulator/)

## What is included

- P, A, S, and M exposure modes, Auto ISO, exposure compensation, focal length, sensor format, white balance, focus distance, and matrix / center-weighted / spot metering.
- Three original photographic practice scenes with a rule-of-thirds overlay, focus placement, exposure meter, live histogram, selectable crop, and a WebGL photographic viewfinder.
- Local JPEG, PNG, and WebP photo import, plus an explicitly activated device camera. Stillframe does not request microphone access.
- A capture library on the current device, in-browser color controls, JPEG / PNG export, and versioned settings import / export.
- Traditional Chinese, English, and Japanese. The app shell and included photographs can be used offline after the first visit.

Photography sources are presented honestly: built-in views use photographs as scene plates, so clicking a focus point is a focus-distance exercise rather than focus measurement from a true depth map. Photos from the device camera or an upload receive software effects; they do not change hardware exposure or recover real scene depth.

Images and settings stay in the browser. Captures live in IndexedDB and can be removed from the library. Camera access begins only after the user activates it and is available on HTTPS or localhost.

## Develop locally

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open the local URL shown by Vite. Validate changes with:

```sh
npm run typecheck
npm test
npm run build
```

## GitHub Pages

The Vite build uses the project path `/camera-simulator/`. The GitHub Actions workflow validates pull requests and deploys successful commits on `main` to Pages. The repository’s Pages source is configured for **GitHub Actions**.

## Photo asset notes

The three bundled scene plates are original images generated for Stillframe. They were created for this project and do not contain stock photographs or remote font, image, model, or texture dependencies. See [the asset notes](docs/ASSETS.md).

## License

Project source is distributed under the MIT License. Generated photographic assets are original project assets; consult the image-generation provider’s terms for their use.
