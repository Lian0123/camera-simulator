export type ShootingMode = 'P' | 'A' | 'S' | 'M';
export type SourceKind = 'scene3d' | 'scene2d' | 'upload' | 'camera';
export type Workspace = 'shoot' | 'playback' | 'edit';
export type Language = 'zh' | 'en' | 'ja';

export interface CameraSettings {
  mode: ShootingMode;
  aperture: number;
  shutter: number;
  iso: number;
  autoISO: boolean;
  exposureCompensation: number;
  focalLength: number;
  aspectRatio: 1 | 1.3333333333333333 | 1.5 | 1.7777777777777777;
  sensor: 'full-frame' | 'aps-c';
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

export interface SceneDefinition {
  id: string;
  image: string;
  stageImage: string;
  stageFiles: string[];
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
  schemaVersion: 1;
  exportedAt: string;
  settings: CameraSettings;
  source: SourceKind;
  sceneId: string;
}
