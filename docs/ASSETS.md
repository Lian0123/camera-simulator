# Asset sources

All scene photographs in `public/scenes/` were generated specifically for Stillframe on 2026-09-28 and delivered as high-quality JPEGs to keep the offline app pack small. The original three photographs are used as scene thumbnails. Three additional edited backplates leave the foreground clear for independently rendered props. All assets are served from this repository; the running app makes no third-party asset requests.

| File | Use |
| --- | --- |
| `tokyo-rain.jpg`, `window-still-life.jpg`, `low-light-room.jpg` | Original scene thumbnails |
| `tokyo-backplate.jpg`, `window-backplate.jpg`, `interior-backplate.jpg` | Clear environment plates for layered 2D scenes and the 3D stage |
| `layers/*.png` | Transparent sprites rendered from the cited models for the independent 2D depth layers |

The repeatable offline render tool is `npm run render:scene-layers`; start the Vite development server first. The PNG sprites preserve alpha and are generated from the bundled local models, so the runtime does not require WebGL to draw the layered lessons.

The four Poly Haven model sets are bundled as 1K glTF files with their binary geometry and JPEG PBR textures. Poly Haven publishes its assets under CC0: [potted plant](https://polyhaven.com/a/potted_plant_04), [ceramic vase](https://polyhaven.com/a/ceramic_vase_01), [sofa](https://polyhaven.com/a/sofa_02), [oil lamp](https://polyhaven.com/a/vintage_oil_lamp), [license](https://polyhaven.com/license).

`public/models/car-concept/CarConcept.glb` is from the Khronos glTF Sample Assets project. It is licensed CC BY 4.0; attribution: Eric Chadwick, model and textures. See the [asset description and legal notice](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/CarConcept/README.md).

Generated photographs are original project imagery and are not claimed to be CC0 stock. Their distribution is subject to the image-generation provider's applicable terms. The application icon is an original SVG in this repository.
