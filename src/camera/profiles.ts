import type { CameraProfileId, CameraSettings } from './types';

export interface ToneStyle {
  id: string;
  label: string;
  contrast: number;
  saturation: number;
  temperature: number;
  hue: number;
  sepia: number;
}

export interface CameraProfile {
  id: CameraProfileId;
  brand: string;
  body: string;
  sensor: CameraSettings['sensor'];
  defaultStyle: string;
  nativeIso?: readonly [number, number];
  softSkinEffect: boolean;
  styles: readonly ToneStyle[];
}

const styles = (entries: Array<[string, string, number, number, number, number?, number?]>): ToneStyle[] =>
  entries.map(([id, label, contrast, saturation, temperature = 0, hue = 0, sepia = 0]) => ({ id, label, contrast, saturation, temperature, hue, sepia }));

// Look parameters are original, lightweight approximations for this simulator.
// Manufacturer names identify the camera families; the rendering is not a camera JPEG engine.
export const CAMERA_PROFILES: readonly CameraProfile[] = [
  { id: 'sony-a7iv', brand: 'Sony', body: 'α7 IV', sensor: 'full-frame', defaultStyle: 'sony-st', softSkinEffect: true, styles: styles([
    ['sony-st', 'ST · Standard', 0, 0, 0], ['sony-pt', 'PT · Portrait', -9, -5, 4], ['sony-nt', 'NT · Neutral', -8, -8, 0],
    ['sony-vv', 'VV · Vivid', 11, 22, 0], ['sony-fl', 'FL · Film', -5, -8, 8], ['sony-in', 'IN · Instant', 7, -12, 5],
    ['sony-sh', 'SH · Soft High-key', -18, -12, 13], ['sony-bw', 'BW · Black & White', 8, -100, 0], ['sony-se', 'SE · Sepia', -2, -30, 10, 0, 0.34],
  ]) },
  { id: 'canon-r6ii', brand: 'Canon', body: 'EOS R6 Mark II', sensor: 'full-frame', defaultStyle: 'canon-auto', softSkinEffect: false, styles: styles([
    ['canon-auto', 'Auto', 2, 3, 1], ['canon-standard', 'Standard', 4, 8, 0], ['canon-portrait', 'Portrait', -10, -3, 5],
    ['canon-landscape', 'Landscape', 8, 18, -2], ['canon-fine', 'Fine Detail', 10, 4, 0], ['canon-neutral', 'Neutral', -8, -12, 0],
    ['canon-faithful', 'Faithful', -3, -8, 0], ['canon-mono', 'Monochrome', 11, -100, 0],
  ]) },
  { id: 'nikon-z8', brand: 'Nikon', body: 'Z 8', sensor: 'full-frame', defaultStyle: 'nikon-auto', softSkinEffect: true, styles: styles([
    ['nikon-auto', 'Auto', 2, 2, 0], ['nikon-standard', 'Standard', 4, 5, 0], ['nikon-neutral', 'Neutral', -10, -12, 0],
    ['nikon-vivid', 'Vivid', 12, 23, -2], ['nikon-flat', 'Flat', -20, -18, 0], ['nikon-portrait', 'Rich Tone Portrait', -8, 0, 5],
    ['nikon-landscape', 'Landscape', 9, 18, -3], ['nikon-mono', 'Monochrome', 9, -100, 0], ['nikon-deep', 'Deep Tone Mono', 20, -100, -3],
  ]) },
  { id: 'fujifilm-xt5', brand: 'Fujifilm', body: 'X-T5', sensor: 'aps-c', defaultStyle: 'fuji-provia', softSkinEffect: true, styles: styles([
    ['fuji-provia', 'PROVIA / Standard', 1, 2, 0], ['fuji-velvia', 'Velvia', 12, 27, -2], ['fuji-astia', 'ASTIA', -8, 4, 4],
    ['fuji-chrome', 'CLASSIC CHROME', 4, -17, 5], ['fuji-pro-neg-hi', 'PRO Neg. Hi', 5, -6, 1], ['fuji-pro-neg-std', 'PRO Neg. Std', -12, -9, 5],
    ['fuji-eterna', 'ETERNA', -15, -19, 6], ['fuji-classic-neg', 'Classic Neg.', 13, 7, 8], ['fuji-acros', 'ACROS', 13, -100, 0],
    ['fuji-nostalgic', 'NOSTALGIC Neg.', -8, 8, 11], ['fuji-reala', 'REALA ACE', 3, -3, 1],
  ]) },
  { id: 'lumix-s5iix', brand: 'Panasonic LUMIX', body: 'S5IIX', sensor: 'full-frame', defaultStyle: 'lumix-standard', nativeIso: [100, 640], softSkinEffect: false, styles: styles([
    ['lumix-standard', 'Standard', 2, 4, 0], ['lumix-vivid', 'Vivid', 10, 18, -1], ['lumix-natural', 'Natural', -8, -5, 2],
    ['lumix-classic', 'L.ClassicNeo', -4, -9, 8], ['lumix-mono', 'L.Monochrome', 10, -100, 0], ['lumix-mono-d', 'L.Monochrome D', 17, -100, -2],
    ['lumix-cinelike-d', 'Cinelike D2', -13, -15, 2], ['lumix-cinelike-v', 'Cinelike V2', 12, 9, -1], ['lumix-709', 'Like709', 3, -4, 0],
  ]) },
  { id: 'om-3', brand: 'OM SYSTEM', body: 'OM-3', sensor: 'micro-four-thirds', defaultStyle: 'om-natural', softSkinEffect: false, styles: styles([
    ['om-ifinish', 'i-Finish', 6, 7, 1], ['om-vivid', 'Vivid', 11, 18, -2], ['om-natural', 'Natural', 0, 0, 0],
    ['om-portrait', 'Portrait', -9, -4, 5], ['om-muted', 'Muted', -8, -13, 3], ['om-mono', 'Monotone', 10, -100, 0],
    ['om-colour-creator', 'Colour Creator', 4, 11, 7],
  ]) },
];

export function getCameraProfile(id: string): CameraProfile {
  return CAMERA_PROFILES.find((profile) => profile.id === id) ?? CAMERA_PROFILES[0];
}

export function getToneStyle(settings: Pick<CameraSettings, 'cameraProfile' | 'toneSimulation'>): ToneStyle {
  const profile = getCameraProfile(settings.cameraProfile);
  return profile.styles.find((style) => style.id === settings.toneSimulation) ?? profile.styles.find((style) => style.id === profile.defaultStyle)!;
}

export function selectedNativeIso(settings: Pick<CameraSettings, 'cameraProfile' | 'dualNativeISO'>, iso: number): number | null {
  const profile = getCameraProfile(settings.cameraProfile);
  if (!profile.nativeIso) return null;
  if (settings.dualNativeISO === 'low') return profile.nativeIso[0];
  if (settings.dualNativeISO === 'high') return profile.nativeIso[1];
  return iso >= profile.nativeIso[1] ? profile.nativeIso[1] : profile.nativeIso[0];
}

export function isoRange(settings: Pick<CameraSettings, 'cameraProfile' | 'dualNativeISO'>): readonly [number, number] {
  const profile = getCameraProfile(settings.cameraProfile);
  if (!profile.nativeIso) return [100, 25600];
  if (settings.dualNativeISO === 'low') return [profile.nativeIso[0], 800];
  if (settings.dualNativeISO === 'high') return [profile.nativeIso[1], 25600];
  return [100, 25600];
}

export function sensorCropFactor(sensor: CameraSettings['sensor']): number {
  return sensor === 'micro-four-thirds' ? 2 : sensor === 'aps-c' ? 1.5 : 1;
}
