import type { SceneDefinition } from './types';

const path = `${import.meta.env.BASE_URL}scenes/`;
const modelPath = `${import.meta.env.BASE_URL}models/`;
const pbrModelFiles = (id: string, maps: string[]) => [
  `${modelPath}${id}/${id}_1k.gltf`, `${modelPath}${id}/${id}.bin`,
  ...maps.map((map) => `${modelPath}${id}/textures/${id}_${map}_1k.jpg`),
];

export const SCENES: SceneDefinition[] = [
  {
    id: 'tokyo', image: `${path}tokyo-rain.png`, stageImage: `${path}tokyo-backplate.png`, stageFiles: [`${modelPath}car-concept/CarConcept.glb`], lightEv: 7.1, depthHint: 0.45, moving: true,
    title: { zh: '雨夜街景', en: 'After the rain', ja: '雨上がりの街' },
    location: { zh: '日本・東京', en: 'Tokyo, Japan', ja: '日本・東京' },
  },
  {
    id: 'window', image: `${path}window-still-life.png`, stageImage: `${path}window-backplate.png`, stageFiles: [
      ...pbrModelFiles('potted_plant_04', ['nor_gl', 'diff', 'arm']),
      ...pbrModelFiles('ceramic_vase_01', ['nor_gl', 'diff', 'arm']),
    ], lightEv: 11.8, depthHint: 0.83, moving: false,
    title: { zh: '窗邊靜物', en: 'Window light', ja: '窓辺の光' },
    location: { zh: '早晨的工作室', en: 'A morning studio', ja: '朝のスタジオ' },
  },
  {
    id: 'interior', image: `${path}low-light-room.png`, stageImage: `${path}interior-backplate.png`, stageFiles: [
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
