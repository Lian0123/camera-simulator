import { describe, expect, it } from 'vitest';
import { DEFAULT_CAMERA } from './store';
import { parseSettingsDocument } from './settingsDocument';

const document = () => ({ schemaVersion: 1, exportedAt: '2026-09-28T00:00:00.000Z', settings: { ...DEFAULT_CAMERA }, source: 'scene2d', sceneId: 'tokyo' });

describe('versioned settings files', () => {
  it('accepts a complete, versioned settings export', () => {
    expect(parseSettingsDocument(document()).settings).toEqual(DEFAULT_CAMERA);
  });

  it('rejects old or malformed documents instead of partially applying them', () => {
    expect(() => parseSettingsDocument({ ...document(), schemaVersion: 0 })).toThrow();
    expect(() => parseSettingsDocument({ ...document(), settings: { ...DEFAULT_CAMERA, shutter: 'fast' } })).toThrow();
    expect(() => parseSettingsDocument({ ...document(), settings: { ...DEFAULT_CAMERA, autoISO: 'true' } })).toThrow();
  });
});
