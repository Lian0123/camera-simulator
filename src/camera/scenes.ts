import type { SceneDefinition } from './types';

const path = `${import.meta.env.BASE_URL}scenes/`;
const modelPath = `${import.meta.env.BASE_URL}models/`;
const layerPath = `${path}layers/`;
const pbrModelFiles = (id: string, maps: string[]) => [
  `${modelPath}${id}/${id}_1k.gltf`, `${modelPath}${id}/${id}.bin`,
  ...maps.map((map) => `${modelPath}${id}/textures/${id}_${map}_1k.jpg`),
];

export const SCENES: SceneDefinition[] = [
  {
    id: 'tokyo', image: `${path}tokyo-rain.jpg`, stageImage: `${path}tokyo-backplate.jpg`, stageFiles: [`${layerPath}car.png`, `${modelPath}car-concept/CarConcept.glb`], layers: [
      { id: 'car', image: `${layerPath}car.png`, left: 0.06, top: 0.48, width: 0.88, height: 0.43, depth: 3.8, motion: 0.025 },
    ], lightEv: 7.1, depthHint: 0.45, moving: true,
    title: { zh: '雨夜街景', en: 'After the rain', ja: '雨上がりの街' },
    location: { zh: '日本・東京', en: 'Tokyo, Japan', ja: '日本・東京' },
  },
  {
    id: 'window', image: `${path}window-still-life.jpg`, stageImage: `${path}window-backplate.jpg`, layers: [
      { id: 'plant', image: `${layerPath}potted-plant.png`, left: 0.04, top: 0.39, width: 0.32, height: 0.56, depth: 4.6 },
      { id: 'vase', image: `${layerPath}vase.png`, left: 0.67, top: 0.55, width: 0.24, height: 0.4, depth: 4.2 },
    ], stageFiles: [
      `${layerPath}potted-plant.png`, `${layerPath}vase.png`,
      ...pbrModelFiles('potted_plant_04', ['nor_gl', 'diff', 'arm']),
      ...pbrModelFiles('ceramic_vase_01', ['nor_gl', 'diff', 'arm']),
    ], lightEv: 11.8, depthHint: 0.83, moving: false,
    title: { zh: '窗邊靜物', en: 'Window light', ja: '窓辺の光' },
    location: { zh: '早晨的工作室', en: 'A morning studio', ja: '朝のスタジオ' },
  },
  {
    id: 'interior', image: `${path}low-light-room.jpg`, stageImage: `${path}interior-backplate.jpg`, layers: [
      { id: 'sofa', image: `${layerPath}sofa.png`, left: 0.24, top: 0.53, width: 0.64, height: 0.36, depth: 4.1 },
      { id: 'lamp', image: `${layerPath}oil-lamp.png`, left: 0.04, top: 0.43, width: 0.19, height: 0.5, depth: 3.35 },
    ], stageFiles: [
      `${layerPath}sofa.png`, `${layerPath}oil-lamp.png`,
      ...pbrModelFiles('sofa_02', ['nor_gl', 'diff', 'arm']),
      ...pbrModelFiles('vintage_oil_lamp', ['nor_gl', 'diff', 'arm', 'glass_nor_gl', 'glass_diff', 'glass_arm', 'flame_diff']),
    ], lightEv: 4.8, depthHint: 0.65, moving: false,
    title: { zh: '午夜室內', en: 'Low light, slow down', ja: '夜の部屋' },
    location: { zh: '夜晚的聆聽室', en: 'Listening room, 23:18', ja: '深夜のリスニングルーム' },
  },
];

export function imageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load scene: ${url}`));
    image.src = url;
  });
}
