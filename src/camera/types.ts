export type ShootingMode = 'P' | 'A' | 'S' | 'M';
export type SourceKind = 'scene3d' | 'scene2d' | 'upload' | 'camera';
export type Workspace = 'shoot' | 'playback' | 'edit';
export type Language = 'zh' | 'en' | 'ja';
export type DualNativeIsoMode = 'auto' | 'low' | 'high';
export type CameraProfileId = 'sony-a7iv' | 'canon-r6ii' | 'nikon-z8' | 'fujifilm-xt5' | 'lumix-s5iix' | 'om-3';
export type NoiseReductionLevel = 'off' | 'low' | 'standard' | 'high';
export type SoftSkinLevel = 'off' | 'low' | 'standard' | 'high';
export type FlashSimulation = 'off' | 'fill' | 'slow-sync' | 'rear-curtain';
export type SensorFormat = 'full-frame' | 'aps-c' | 'micro-four-thirds';

export interface CameraSettings {
  cameraProfile: CameraProfileId;
  toneSimulation: string;
  dualNativeISO: DualNativeIsoMode;
  highIsoNoiseReduction: NoiseReductionLevel;
  softSkin: SoftSkinLevel;
  flashSimulation: FlashSimulation;
  captureProgram: 'standard' | 'portrait' | 'landscape' | 'night' | 'sports';
  mode: ShootingMode;
  aperture: number;
  shutter: number;
  iso: number;
  autoISO: boolean;
  exposureCompensation: number;
  focalLength: number;
  aspectRatio: 1 | 1.3333333333333333 | 1.5 | 1.7777777777777777;
  sensor: SensorFormat;
  whiteBalance: number;
  focusDistance: number;
  autofocus: boolean;
  metering: 'matrix' | 'center' | 'spot';
  showGrid: boolean;
  showHistogram: boolean;
  highlightWarning: boolean;
  filmGrain: number;
}

export interface ResolvedExposure {
  aperture: number;
  shutter: number;
  iso: number;
  targetEv: number;
  measuredEv: number;
  deviation: number;
  outOfRange: boolean;
}

export interface SceneLayer {
  id: string;
  image: string;
  left: number;
  top: number;
  width: number;
  height: number;
  depth: number;
  motion?: number;
}

export interface SceneDefinition {
  id: string;
  image: string;
  stageImage: string;
  stageFiles: string[];
  layers: SceneLayer[];
  title: Record<Language, string>;
  lightEv: number;
  depthHint: number;
  moving: boolean;
  location: Record<Language, string>;
}

export interface SceneFrame {
  image: CanvasImageSource;
  capturedAt: number;
  source: SourceKind;
  settings: CameraSettings;
  exposure: ResolvedExposure;
  width: number;
  height: number;
}

export interface SceneSource {
  kind: SourceKind;
  capabilities: Set<'aperture' | 'shutter' | 'iso' | 'focus' | 'depth' | 'whiteBalance' | 'crop'>;
  initialize(): Promise<void>;
  capture(settings: CameraSettings, exposure: ResolvedExposure): Promise<SceneFrame>;
  dispose(): void;
}

export interface CaptureRecord {
  id: string;
  image: string;
  thumbnail: string;
  settings: CameraSettings;
  exposure: ResolvedExposure;
  source: SourceKind;
  createdAt: number;
  sceneId?: string;
}

export interface SettingsDocument {
  schemaVersion: 2;
  exportedAt: string;
  settings: CameraSettings;
  source: SourceKind;
  sceneId: string;
}
