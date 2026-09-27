import { describe, expect, it } from 'vitest';
import { DEFAULT_CAMERA } from './store';
import { makeImageFilter, getDevelopSettings, DEFAULT_DEVELOP, isoNoiseAmount } from './processor';

describe('image development settings', () => {
  it('produces a deterministic filter shared by preview and export', () => {
    const exposure = { aperture: 4, shutter: 1 / 125, iso: 100, targetEv: 7, measuredEv: 7, deviation: 0, outOfRange: false };
    const camera = { ...DEFAULT_CAMERA, whiteBalance: 5600 };
    expect(makeImageFilter(camera, exposure)).toBe(makeImageFilter(camera, exposure));
    expect(makeImageFilter(camera, exposure)).toContain('brightness(1.000)');
    expect(makeImageFilter({ ...camera, whiteBalance: 3200 }, exposure)).not.toBe(makeImageFilter(camera, exposure));
  });

  it('applies preset looks predictably and leaves custom values intact', () => {
    expect(getDevelopSettings({ ...DEFAULT_DEVELOP, preset: 'mono' }).saturation).toBe(-100);
    expect(getDevelopSettings({ ...DEFAULT_DEVELOP, preset: 'custom', saturation: -35 }).saturation).toBe(-35);
    expect(getDevelopSettings({ ...DEFAULT_DEVELOP, preset: 'unknown' }).contrast).toBe(0);
  });

  it('adds progressively stronger sensor noise as ISO rises', () => {
    expect(isoNoiseAmount(100)).toBe(0);
    expect(isoNoiseAmount(800)).toBeGreaterThan(isoNoiseAmount(400));
    expect(isoNoiseAmount(25600)).toBeGreaterThan(isoNoiseAmount(6400));
  });
});
