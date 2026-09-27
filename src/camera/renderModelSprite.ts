import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface SpriteRenderOptions {
  height: number;
  yaw?: number;
  light?: number;
}

/** Render a bundled, licensed model into a transparent sprite for the layered 2D lessons. */
export async function renderModelSprite(url: string, options: SpriteRenderOptions): Promise<string> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const object = gltf.scene;
  object.rotation.y = options.yaw ?? 0;
  object.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(object);
  let size = bounds.getSize(new THREE.Vector3());
  if (size.y <= 0 || size.x <= 0) throw new Error(`The model has no visible dimensions: ${url}`);
  object.scale.multiplyScalar(options.height / size.y);
  object.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(object);
  size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.y -= center.y;
  object.position.z -= center.z;

  const aspect = size.x / size.y;
  let width = Math.max(1, Math.round(768 * aspect));
  let height = 768;
  const dimensionScale = Math.min(1, 1280 / width, 960 / height);
  width = Math.round(width * dimensionScale);
  height = Math.round(height * dimensionScale);
  const halfHeight = size.y * 0.62;
  const halfWidth = halfHeight * width / height;
  const camera = new THREE.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, 0.01, 40);
  const radius = Math.max(size.x, size.y);
  camera.position.set(radius * 0.16, size.y * 0.1, radius * 3.5);
  camera.lookAt(0, size.y * 0.01, 0);

  const scene = new THREE.Scene();
  scene.add(object);
  scene.add(new THREE.HemisphereLight(0xf4eadc, 0x262a31, 2.0));
  const key = new THREE.DirectionalLight(0xffe5c0, options.light ?? 3.0);
  key.position.set(-3, 6, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc5d8ff, 1.15);
  fill.position.set(4, 1, 3);
  scene.add(fill);

  let renderer: THREE.WebGLRenderer | undefined;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  } finally {
    renderer?.dispose();
    renderer?.forceContextLoss();
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
    });
  }
}
