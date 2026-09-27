import { useEffect, useRef } from 'react';
import type { CameraSettings, SceneDefinition } from '../camera/types';

interface Props {
  scene: SceneDefinition;
  background: HTMLImageElement;
  camera: CameraSettings;
  pauseRendering: boolean;
  zoom: number;
}

function depthBlur(depth: number, focus: number, aperture: number, focalLength: number) {
  return Math.min(48, Math.abs(depth - focus) * 10 / Math.max(1.4, aperture) * focalLength / 50);
}

/** Composites independently rendered model layers over a scene plate with per-depth lens blur. */
export function LayeredSceneCanvas({ scene, background, camera, pauseRendering, zoom }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<((time: number) => void) | null>(null);
  const live = useRef({ camera, pauseRendering });
  live.current = { camera, pauseRendering };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    let disposed = false;
    let frame = 0;
    let lastFrame = 0;
    const layers = scene.layers;
    const images = new Map<string, HTMLImageElement>();
    canvas.width = background.naturalWidth;
    canvas.height = background.naturalHeight;
    canvas.dataset.ready = 'false';

    const draw = (time: number) => {
      if (disposed) return;
      const settings = live.current.camera;
      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      context.save();
      context.filter = `blur(${depthBlur(16, settings.focusDistance, settings.aperture, settings.focalLength).toFixed(2)}px)`;
      context.drawImage(background, 0, 0, width, height);
      context.restore();
      for (const layer of layers) {
        const image = images.get(layer.id);
        if (!image) continue;
        const boxWidth = layer.width * width;
        const boxHeight = layer.height * height;
        const fit = Math.min(boxWidth / image.naturalWidth, boxHeight / image.naturalHeight);
        const imageWidth = image.naturalWidth * fit;
        const imageHeight = image.naturalHeight * fit;
        const centeredX = layer.left * width + (boxWidth - imageWidth) / 2;
        const y = layer.top * height + (boxHeight - imageHeight) / 2;
        const animatedOffset = layer.motion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? Math.sin(time * 0.00055) * layer.motion * width : 0;
        const x = centeredX + animatedOffset;
        const blur = depthBlur(layer.depth, settings.focusDistance, settings.aperture, settings.focalLength);
        context.save();
        context.filter = `blur(${blur.toFixed(2)}px)`;
        const shadow = context.createRadialGradient(x + imageWidth * 0.5, y + imageHeight * 0.94, 1, x + imageWidth * 0.5, y + imageHeight * 0.94, imageWidth * 0.56);
        shadow.addColorStop(0, 'rgba(0,0,0,.27)');
        shadow.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = shadow;
        context.beginPath();
        context.ellipse(x + imageWidth * 0.5, y + imageHeight * 0.94, imageWidth * 0.5, Math.max(3, imageHeight * 0.045), 0, 0, Math.PI * 2);
        context.fill();
        context.drawImage(image, x, y, imageWidth, imageHeight);
        context.restore();
      }
      if (images.size === layers.length) canvas.dataset.ready = 'true';
    };
    drawRef.current = draw;

    void Promise.all(layers.map(async (layer) => {
      const image = new Image();
      image.src = layer.image;
      await image.decode();
      if (!disposed) images.set(layer.id, image);
    })).then(() => { if (!disposed) draw(performance.now()); }).catch(() => { if (!disposed) canvas.dataset.ready = 'error'; });
    const animate = (time: number) => {
      if (disposed) return;
      const moving = layers.some((layer) => layer.motion);
      if (canvas.dataset.ready === 'true' && !live.current.pauseRendering && document.visibilityState === 'visible'
        && time - lastFrame >= 1000 / 30 && moving && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        lastFrame = time;
        draw(time);
      }
      frame = requestAnimationFrame(animate);
    };
    draw(0);
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      images.clear();
      drawRef.current = null;
    };
  }, [scene, background]);

  useEffect(() => {
    drawRef.current?.(performance.now());
  }, [camera.aperture, camera.focusDistance, camera.focalLength, scene, background]);

  return <canvas ref={canvasRef} className="layered-scene" style={{ transform: `scale(${zoom})` }} aria-label="Layered 2D scene with simulated depth of field" data-layer-count={scene.layers.length} />;
}
