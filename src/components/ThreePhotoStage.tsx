import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props { image: HTMLImageElement; focalLength: number; sensor: 'full-frame' | 'aps-c'; }

/** WebGL viewfinder stage. The photographic scene itself remains a local photograph. */
export function ThreePhotoStage({ image, focalLength, sensor }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(element.clientWidth, element.clientHeight);
    element.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const sensorHeight = sensor === 'full-frame' ? 24 : 16;
    const camera = new THREE.PerspectiveCamera(2 * Math.atan(sensorHeight / (2 * focalLength)) * THREE.MathUtils.RAD2DEG, element.clientWidth / Math.max(1, element.clientHeight), 0.1, 200);
    camera.position.set(0, 0, 0);
    const texture = new THREE.Texture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry((25 * sensorHeight / focalLength) * image.naturalWidth / image.naturalHeight, 25 * sensorHeight / focalLength),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    );
    plane.position.z = -25;
    scene.add(plane);

    let frame = 0;
    const render = () => { renderer.render(scene, camera); frame = requestAnimationFrame(render); };
    const resizeObserver = new ResizeObserver(() => {
      if (!host.current) return;
      renderer.setSize(host.current.clientWidth, host.current.clientHeight);
      camera.aspect = host.current.clientWidth / Math.max(1, host.current.clientHeight);
      camera.fov = 2 * Math.atan(sensorHeight / (2 * focalLength)) * THREE.MathUtils.RAD2DEG;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    });
    camera.fov = 2 * Math.atan(sensorHeight / (2 * focalLength)) * THREE.MathUtils.RAD2DEG;
    camera.updateProjectionMatrix();
    resizeObserver.observe(element);
    render();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
      plane.geometry.dispose();
      plane.material.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [focalLength, image]);

  return <div className="three-stage" ref={host} aria-label="WebGL photographic viewfinder" />;
}
