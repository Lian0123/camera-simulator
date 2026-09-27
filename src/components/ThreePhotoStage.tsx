import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import i18n from '../i18n';
import '../threeStage.css';

interface Props {
  image: HTMLImageElement;
  sceneId: string;
  focalLength: number;
  sensor: 'full-frame' | 'aps-c';
  aperture: number;
  focusDistance: number;
  language: 'zh' | 'en' | 'ja';
  pauseRendering: boolean;
  onFallback: () => void;
}

interface ModelPlacement {
  url: string;
  height: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  moving?: boolean;
}

const root = import.meta.env.BASE_URL;
const stageModels: Record<string, ModelPlacement[]> = {
  tokyo: [{ url: `${root}models/car-concept/CarConcept.glb`, height: 0.7, position: [-0.1, -0.97, -3.8], rotation: [0, Math.PI, 0], moving: true }],
  window: [
    { url: `${root}models/potted_plant_04/potted_plant_04_1k.gltf`, height: 0.82, position: [-0.67, -0.82, -4.6] },
    { url: `${root}models/ceramic_vase_01/ceramic_vase_01_1k.gltf`, height: 0.54, position: [0.62, -0.82, -4.2] },
  ],
  interior: [
    { url: `${root}models/sofa_02/sofa_02_1k.gltf`, height: 1.12, position: [0.45, -0.83, -4.1] },
    { url: `${root}models/vintage_oil_lamp/vintage_oil_lamp_1k.gltf`, height: 1.18, position: [-0.5, -0.8, -3.35] },
  ],
};

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) value.dispose(); });
      material.dispose();
    });
  });
}

function fitModel(object: THREE.Object3D, height: number) {
  object.updateMatrixWorld(true);
  const initial = new THREE.Box3().setFromObject(object);
  const size = initial.getSize(new THREE.Vector3());
  if (size.y > 0) object.scale.multiplyScalar(height / size.y);
  object.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(object);
  const center = fitted.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.y -= fitted.min.y;
  object.position.z -= center.z;
}

/** A locally bundled photographic backplate with PBR props, movable optics, and aperture-based depth blur. */
export function ThreePhotoStage({ image, sceneId, focalLength, sensor, aperture, focusDistance, language, pauseRendering, onFallback }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const fallback = useRef(onFallback);
  const [failure, setFailure] = useState('');
  const [loadedCount, setLoadedCount] = useState(0);
  const [retryGeneration, setRetryGeneration] = useState(0);
  const liveOptics = useRef({ focalLength, sensor, aperture, focusDistance });
  const renderPaused = useRef(pauseRendering);
  const tr = i18n.getFixedT(language);
  fallback.current = onFallback;
  liveOptics.current = { focalLength, sensor, aperture, focusDistance };
  renderPaused.current = pauseRendering;

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    setFailure('');
    setLoadedCount(0);
    let renderer: THREE.WebGLRenderer;
    let composer: EffectComposer | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let frame = 0;
    let disposed = false;
    let contextLost = false;
    let movingCar: THREE.Object3D | undefined;
    const movableObjects: THREE.Object3D[] = [];
    const resize = () => {
      if (!host.current || !composer) return;
      const width = Math.max(1, host.current.clientWidth);
      const height = Math.max(1, host.current.clientHeight);
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      camera.aspect = width / height;
      syncOptics();
      composer.render();
    };
    const contextLostHandler = (event: Event) => { event.preventDefault(); contextLost = true; setFailure('stageContextError'); };
    const contextRestoredHandler = () => { contextLost = false; setFailure(''); resize(); };

    const sensorHeight = liveOptics.current.sensor === 'full-frame' ? 24 : 16;
    const width = Math.max(1, element.clientWidth);
    const height = Math.max(1, element.clientHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(2 * Math.atan(sensorHeight / (2 * focalLength)) * THREE.MathUtils.RAD2DEG, width / height, 0.05, 150);
    const texture = new THREE.Texture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    const backgroundHeight = 25 * sensorHeight / focalLength;
    const background = new THREE.Mesh(
      new THREE.PlaneGeometry(backgroundHeight * image.naturalWidth / image.naturalHeight, backgroundHeight),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    );
    background.position.z = -25;
    background.renderOrder = -1;
    scene.add(background);

    const ambient = new THREE.HemisphereLight(0xe6edf4, 0x191817, sceneId === 'interior' ? 1.55 : sceneId === 'tokyo' ? 1.1 : 0.82);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(sceneId === 'tokyo' ? 0xc9dcff : sceneId === 'interior' ? 0xffbc76 : 0xfff0d4, sceneId === 'interior' ? 3.3 : sceneId === 'tokyo' ? 3.8 : 2.8);
    key.position.set(sceneId === 'tokyo' ? -3 : -4, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 28;
    key.shadow.bias = -0.0002;
    scene.add(key);
    if (sceneId === 'interior' || sceneId === 'tokyo') {
      const practical = new THREE.PointLight(sceneId === 'tokyo' ? 0xff8d4d : 0xffbd70, sceneId === 'tokyo' ? 22 : 18, 10, 2);
      practical.position.set(-1.2, 1.4, -4.4);
      scene.add(practical);
    }

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(32, 32), new THREE.ShadowMaterial({ color: 0x090a0b, opacity: 0.22 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.99, -8);
    floor.receiveShadow = true;
    scene.add(floor);

    try {
      renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, powerPreference: 'low-power', preserveDrawingBuffer: true });
    } catch {
      setFailure('stageWebglError');
      return;
    }
    const mobile = window.matchMedia('(max-width: 720px)').matches;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    const lowPower = mobile || (navigator.hardwareConcurrency || 4) <= 4 || memory <= 4;
    const frameInterval = lowPower ? 1000 / 30 : 1000 / 60;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.35));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = sceneId === 'interior' ? 1.38 : 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(width, height, false);
    renderer.domElement.setAttribute('aria-label', 'Locally rendered 3D photographic scene');
    renderer.domElement.addEventListener('webglcontextlost', contextLostHandler);
    renderer.domElement.addEventListener('webglcontextrestored', contextRestoredHandler);
    element.appendChild(renderer.domElement);

    const renderPass = new RenderPass(scene, camera);
    const bokehPass = new BokehPass(scene, camera, { focus: focusDistance, aperture: 0.006 * (1.4 / Math.max(1.4, aperture)), maxblur: 0.72 });
    const bokehUniforms = bokehPass.uniforms as unknown as Record<string, { value: number }>;
    composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bokehPass);
    let previousFocalLength = focalLength;
    let previousSensor = sensor;
    const syncOptics = () => {
      const optics = liveOptics.current;
      const currentSensorHeight = optics.sensor === 'full-frame' ? 24 : 16;
      if (optics.focalLength !== previousFocalLength || optics.sensor !== previousSensor) {
        const currentPlaneHeight = 25 * currentSensorHeight / optics.focalLength;
        background.geometry.dispose();
        background.geometry = new THREE.PlaneGeometry(currentPlaneHeight * image.naturalWidth / image.naturalHeight, currentPlaneHeight);
        previousFocalLength = optics.focalLength;
        previousSensor = optics.sensor;
      }
      camera.fov = 2 * Math.atan(currentSensorHeight / (2 * optics.focalLength)) * THREE.MathUtils.RAD2DEG;
      camera.updateProjectionMatrix();
      bokehUniforms['focus'].value = Math.max(0.3, optics.focusDistance);
      bokehUniforms['aperture'].value = 0.006 * (1.4 / Math.max(1.4, optics.aperture));
    };

    const loader = new GLTFLoader();
    const specs = stageModels[sceneId] ?? [];
    void Promise.all(specs.map(async (spec) => {
      const gltf = await loader.loadAsync(spec.url);
      if (disposed) { disposeObject(gltf.scene); return; }
      fitModel(gltf.scene, spec.height);
      const placement = new THREE.Group();
      placement.position.set(...spec.position);
      if (spec.rotation) placement.rotation.set(...spec.rotation);
      placement.add(gltf.scene);
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; }
      });
      scene.add(placement);
      movableObjects.push(placement);
      if (spec.moving) movingCar = placement;
    })).then(() => { if (!disposed) { setLoadedCount(specs.length); setFailure(''); } }).catch(() => { if (!disposed) setFailure('stageModelError'); });

    let pointerX = 0.5;
    let pointerY = 0.5;
    let lastRenderedAt = -Infinity;
    const pointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      pointerX = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
      pointerY = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)));
    };
    const render = (time: number) => {
      if (disposed) return;
      if (!renderPaused.current && !contextLost && document.visibilityState === 'visible' && time - lastRenderedAt >= frameInterval) {
        lastRenderedAt = time;
        syncOptics();
        camera.rotation.y += ((0.5 - pointerX) * 0.045 - camera.rotation.y) * 0.055;
        camera.rotation.x += ((pointerY - 0.5) * 0.03 - camera.rotation.x) * 0.055;
        if (movingCar && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) movingCar.position.x = specs[0].position[0] + Math.sin(time * 0.00022) * 0.12;
        composer?.render();
      }
      frame = requestAnimationFrame(render);
    };
    element.addEventListener('pointermove', pointerMove, { passive: true });
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(element);
    render(0);

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      element.removeEventListener('pointermove', pointerMove);
      cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener('webglcontextlost', contextLostHandler);
      renderer.domElement.removeEventListener('webglcontextrestored', contextRestoredHandler);
      composer?.dispose();
      movableObjects.forEach(disposeObject);
      background.geometry.dispose();
      background.material.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [image, retryGeneration, sceneId]);

  return (
    <div className="three-stage" ref={host} aria-label="Real-time 3D photographic viewfinder" data-model-count={loadedCount}>
      {failure && <div className="scene-stage-error" role="alert"><span>{tr(failure)}</span><button type="button" className="retry-stage" onClick={() => setRetryGeneration((generation) => generation + 1)}>{tr('stageRetry')}</button><button type="button" onClick={() => fallback.current()}>{tr('stageFallback')}</button></div>}
    </div>
  );
}
