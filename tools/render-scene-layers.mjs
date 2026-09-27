import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.CAMERA_SIMULATOR_BASE ?? 'http://127.0.0.1:5173/camera-simulator/';
const root = new URL(base);
const items = [
  { file: 'potted-plant.png', model: 'models/potted_plant_04/potted_plant_04_1k.gltf', height: 1.55 },
  { file: 'vase.png', model: 'models/ceramic_vase_01/ceramic_vase_01_1k.gltf', height: 1.45 },
  { file: 'sofa.png', model: 'models/sofa_02/sofa_02_1k.gltf', height: 1.65 },
  { file: 'oil-lamp.png', model: 'models/vintage_oil_lamp/vintage_oil_lamp_1k.gltf', height: 1.65 },
  { file: 'car.png', model: 'models/car-concept/CarConcept.glb', height: 1.4, yaw: Math.PI, light: 2.2 },
];

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(root.href, { waitUntil: 'domcontentloaded' });
  const rendered = await page.evaluate(async ({ rootPath, models }) => {
    const { renderModelSprite } = await import(`${rootPath}src/camera/renderModelSprite.ts`);
    const output = [];
    for (const model of models) {
      const image = await renderModelSprite(`${rootPath}${model.model}`, model);
      output.push({ file: model.file, image: image.slice(image.indexOf(',') + 1) });
    }
    return output;
  }, { rootPath: root.pathname, models: items });
  const out = new URL('../public/scenes/layers/', import.meta.url);
  await mkdir(out, { recursive: true });
  for (const image of rendered) {
    await writeFile(new URL(image.file, out), Buffer.from(image.image, 'base64'));
    console.log(`${image.file}: ${(Buffer.from(image.image, 'base64').byteLength / 1024).toFixed(0)} KiB`);
  }
} finally {
  await browser.close();
}
