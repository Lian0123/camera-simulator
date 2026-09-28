import { create } from 'zustand';
import type { CameraSettings, Language, SceneDefinition, SourceKind, Workspace } from './types';
import { isCameraSettings } from './settingsDocument';

export const DEFAULT_CAMERA: CameraSettings = {
  cameraProfile: 'lumix-s5iix', toneSimulation: 'lumix-standard', dualNativeISO: 'auto', highIsoNoiseReduction: 'standard', softSkin: 'off', flashSimulation: 'off', captureProgram: 'standard',
  mode: 'A', aperture: 5.6, shutter: 1 / 125, iso: 400, autoISO: true,
  exposureCompensation: 0, focalLength: 50, aspectRatio: 1.5, sensor: 'full-frame', whiteBalance: 5200,
  focusDistance: 3.2, autofocus: true, metering: 'matrix', showGrid: true, showHistogram: true,
  highlightWarning: false, filmGrain: 0,
};

const restoreSettings = (): CameraSettings => {
  try {
    const current = localStorage.getItem('stillframe.camera.v2');
    const legacy = current ? null : localStorage.getItem('stillframe.camera.v1');
    const value = current ?? legacy;
    if (!value) return DEFAULT_CAMERA;
    const parsed: unknown = JSON.parse(value);
    if (isCameraSettings(parsed)) return parsed;
    // Migrate the previous local-only settings shape by keeping validated old fields
    // and filling only newly-added controls from defaults.
    if (!current && typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const old = parsed as Record<string, unknown>;
      const merged = { ...DEFAULT_CAMERA } as Record<string, unknown>;
      for (const key of Object.keys(DEFAULT_CAMERA)) if (key in old) merged[key] = old[key];
      if (isCameraSettings(merged)) {
        localStorage.setItem('stillframe.camera.v2', JSON.stringify(merged));
        return merged;
      }
    }
    return DEFAULT_CAMERA;
  } catch { return DEFAULT_CAMERA; }
};

interface StudioState {
  camera: CameraSettings;
  source: SourceKind;
  sceneId: string;
  workspace: Workspace;
  language: Language;
  update: <K extends keyof CameraSettings>(key: K, value: CameraSettings[K]) => void;
  setSource: (source: SourceKind) => void;
  setScene: (scene: SceneDefinition) => void;
  setWorkspace: (workspace: Workspace) => void;
  setLanguage: (language: Language) => void;
}

function defaultLanguage(): Language {
  try {
    const saved = localStorage.getItem('stillframe.language');
    if (saved === 'zh' || saved === 'en' || saved === 'ja') return saved;
    return /^ja/i.test(navigator.language) ? 'ja' : /^en/i.test(navigator.language) ? 'en' : 'zh';
  } catch { return 'zh'; }
}

export const useStudioStore = create<StudioState>((set, get) => ({
  camera: restoreSettings(), source: 'scene2d', sceneId: 'tokyo', workspace: 'shoot', language: defaultLanguage(),
  update: (key, value) => {
    const camera = { ...get().camera, [key]: value };
    set({ camera });
    try { localStorage.setItem('stillframe.camera.v2', JSON.stringify(camera)); } catch { /* Private browsing still works without settings persistence. */ }
  },
  setSource: (source) => set({ source }),
  setScene: (scene) => set({ sceneId: scene.id }),
  setWorkspace: (workspace) => set({ workspace }),
  setLanguage: (language) => {
    set({ language });
    try { localStorage.setItem('stillframe.language', language); } catch { /* Language remains available for the current visit. */ }
  },
}));
