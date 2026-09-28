import { describe, expect, it } from 'vitest';
import { DEFAULT_CAMERA } from './store';
import { parseSettingsDocument } from './settingsDocument';

const document = () => ({ schemaVersion: 2, exportedAt: '2026-09-28T00:00:00.000Z', settings: { ...DEFAULT_CAMERA }, source: 'scene2d', sceneId: 'tokyo' });

describe('versioned settings files', () => {
  it('accepts a complete, versioned settings export', () => {
    expect(parseSettingsDocument(document()).settings).toEqual(DEFAULT_CAMERA);
  });

  it('rejects old or malformed documents instead of partially applying them', () => {
    expect(() => parseSettingsDocument({ ...document(), schemaVersion: 1 })).toThrow();
    expect(() => parseSettingsDocument({ ...document(), settings: { ...DEFAULT_CAMERA, shutter: 'fast' } })).toThrow();
    expect(() => parseSettingsDocument({ ...document(), settings: { ...DEFAULT_CAMERA, autoISO: 'true' } })).toThrow();
  });

  it('rejects model settings with a style from a different manufacturer profile', () => {
    expect(() => parseSettingsDocument({
      ...document(), settings: { ...DEFAULT_CAMERA, cameraProfile: 'fujifilm-xt5', toneSimulation: 'sony-st' },
    })).toThrow();
  });

  it('rejects body-specific controls when the selected body does not list the feature', () => {
    expect(() => parseSettingsDocument({ ...document(), settings: { ...DEFAULT_CAMERA, cameraProfile: 'sony-a7iv', toneSimulation: 'sony-st', dualNativeISO: 'high' } })).toThrow();
    expect(() => parseSettingsDocument({ ...document(), settings: { ...DEFAULT_CAMERA, cameraProfile: 'lumix-s5iix', toneSimulation: 'lumix-standard', softSkin: 'high' } })).toThrow();
  });
});
