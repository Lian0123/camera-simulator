import type { CameraSettings, ResolvedExposure } from './types';
import { evBrightness } from './exposure';

export interface DevelopSettings {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  temperature: number;
  saturation: number;
  vignette: number;
  grain: number;
  preset: string;
}

export const DEFAULT_DEVELOP: DevelopSettings = {
  exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, saturation: 0, vignette: 0, grain: 0, preset: 'neutral',
};

export function isoNoiseAmount(iso: number): number {
  return Math.max(0, Math.log2(Math.max(100, iso) / 100) * 3);
}

const presets: Record<string, Partial<DevelopSettings>> = {
  neutral: {}, warm: { temperature: 24, saturation: 6, contrast: 5 },
  cool: { temperature: -22, saturation: -4, contrast: 8 },
  soft: { contrast: -12, highlights: -24, shadows: 18, saturation: -8 },
  mono: { saturation: -100, contrast: 12 },
  film: { temperature: 8, contrast: -3, saturation: -14, grain: 18 },
};

export function getDevelopSettings(settings: DevelopSettings): DevelopSettings {
  return { ...settings, ...(presets[settings.preset] ?? {}) };
}

export function makeImageFilter(camera: CameraSettings, exposure: ResolvedExposure, develop = DEFAULT_DEVELOP): string {
  const photo = getDevelopSettings(develop);
  const brightness = evBrightness(exposure.deviation + photo.exposure);
  const contrast = Math.max(0.2, 1 + photo.contrast / 100);
  const saturation = Math.max(0, 1 + photo.saturation / 100);
  const warmth = photo.temperature / 18;
  const white = Math.max(2300, Math.min(9500, camera.whiteBalance + warmth * 55));
  const sepia = Math.max(0, Math.min(0.45, (white - 5000) / 10000));
  const hue = (5000 - white) / 250;
  return `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)}) saturate(${saturation.toFixed(3)}) sepia(${sepia.toFixed(3)}) hue-rotate(${hue.toFixed(1)}deg)`;
}

export function renderDevelopedImage(
  image: CanvasImageSource,
  width: number,
  height: number,
  camera: CameraSettings,
  exposure: ResolvedExposure,
  develop: DevelopSettings = DEFAULT_DEVELOP,
  quality: 'preview' | 'capture' = 'capture',
  preserveCapturedBase = false,
): HTMLCanvasElement {
  const ratio = preserveCapturedBase ? width / height : Math.max(0.5, Math.min(2, camera.aspectRatio));
  const imageRatio = width / height;
  let sx = 0; let sy = 0; let sw = width; let sh = height;
  if (imageRatio > ratio) { sw = height * ratio; sx = (width - sw) / 2; }
  else if (imageRatio < ratio) { sh = width / ratio; sy = (height - sh) / 2; }
  const fieldOfViewZoom = preserveCapturedBase ? 1 : Math.max(1, camera.focalLength / 50 * (camera.sensor === 'aps-c' ? 1.5 : 1));
  if (fieldOfViewZoom > 1) {
    sw /= fieldOfViewZoom; sh /= fieldOfViewZoom;
    sx = (width - sw) / 2; sy = (height - sh) / 2;
  }
  const canvas = document.createElement('canvas');
  const maximumScale = Math.min(1, 3840 / Math.max(sw, sh), Math.sqrt(24_000_000 / (sw * sh)));
  const scale = quality === 'preview' ? Math.min(maximumScale, 1200 / Math.max(sw, sh)) : maximumScale;
  const outputWidth = Math.max(1, Math.round(sw * scale));
  const outputHeight = Math.max(1, Math.round(sh * scale));
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas image processing is not available in this browser.');
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const photo = getDevelopSettings(develop);
  const processingCamera = preserveCapturedBase ? { ...camera, whiteBalance: 5200 } : camera;
  ctx.filter = makeImageFilter(processingCamera, { ...exposure, deviation: preserveCapturedBase ? 0 : exposure.deviation }, photo);
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvasWidth, canvasHeight);
  ctx.filter = 'none';

  if (photo.highlights !== 0 || photo.shadows !== 0) {
    const tonal = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    for (let i = 0; i < tonal.data.length; i += 4) {
      const luminance = (tonal.data[i] * 0.2126 + tonal.data[i + 1] * 0.7152 + tonal.data[i + 2] * 0.0722) / 255;
      const adjustment = (photo.shadows / 100 * (1 - luminance) ** 2 + photo.highlights / 100 * luminance ** 2) * 52;
      tonal.data[i] = Math.max(0, Math.min(255, tonal.data[i] + adjustment));
      tonal.data[i + 1] = Math.max(0, Math.min(255, tonal.data[i + 1] + adjustment));
      tonal.data[i + 2] = Math.max(0, Math.min(255, tonal.data[i + 2] + adjustment));
    }
    ctx.putImageData(tonal, 0, 0);
  }

  const vignette = Math.max(0, Math.min(0.85, photo.vignette / 100));
  if (vignette > 0) {
    const gradient = ctx.createRadialGradient(canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.13, canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.82);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(8,8,8,${vignette})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }
  const grain = Math.max(0, Math.min(35, (preserveCapturedBase ? 0 : camera.filmGrain + isoNoiseAmount(exposure.iso)) + photo.grain));
  if (grain > 0) {
    const imageData = ctx.getImageData(0, 0, outputWidth, outputHeight);
    let seed = 8917;
    const nextRandom = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed / 4294967295) - 0.5; };
    const strength = grain * 0.55;
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = nextRandom() * strength;
      imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
      imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
  }
  return canvas;
}

export function downloadImage(canvas: HTMLCanvasElement, format: 'image/png' | 'image/jpeg', longestEdge: 1280 | 1920 | 3840, watermark = ''): void {
  const ratio = longestEdge / Math.max(canvas.width, canvas.height);
  const target = document.createElement('canvas');
  target.width = Math.round(canvas.width * ratio);
  target.height = Math.round(canvas.height * ratio);
  const ctx = target.getContext('2d');
  if (!ctx) throw new Error('Image export is not supported.');
  ctx.drawImage(canvas, 0, 0, target.width, target.height);
  if (watermark.trim()) {
    const size = Math.max(13, Math.round(target.width / 70));
    ctx.font = `500 ${size}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.shadowColor = 'rgba(0,0,0,.7)';
    ctx.shadowBlur = 7;
    ctx.fillText(watermark.trim().slice(0, 80), 26, target.height - 26);
  }
  const anchor = document.createElement('a');
  anchor.download = `stillframe-${Date.now()}.${format === 'image/png' ? 'png' : 'jpg'}`;
  anchor.href = target.toDataURL(format, 0.94);
  anchor.click();
}
