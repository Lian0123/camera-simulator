import { describe, expect, it } from 'vitest';
import { DEFAULT_CAMERA } from './store';
import { measuredEv, resolveExposure, shutterProgressSamples, formatShutter } from './exposure';

describe('exposure arithmetic', () => {
  it('matches EV100 and one-stop shutter and ISO changes', () => {
    const baseline = measuredEv(4, 1 / 125, 100);
    expect(measuredEv(4, 1 / 250, 100)).toBeCloseTo(baseline + 1, 8);
    expect(measuredEv(4, 1 / 125, 200)).toBeCloseTo(baseline - 1, 8);
    expect(measuredEv(4, 1 / 60, 100)).toBeCloseTo(baseline - 1.06, 2);
  });

  it('keeps the A-mode handheld limit while Auto ISO rises in dim scenes', () => {
    const settings = { ...DEFAULT_CAMERA, mode: 'A' as const, aperture: 5.6, focalLength: 50, autoISO: true };
    const bright = resolveExposure(settings, 12);
    const dim = resolveExposure(settings, 4.8);
    expect(bright.shutter).toBeLessThan(dim.shutter);
    expect(bright.iso).toBeLessThan(dim.iso);
    expect(dim.shutter).toBeGreaterThanOrEqual(1 / 80);
    expect(dim.iso).toBeLessThanOrEqual(25600);
  });

  it('locks the parameter selected by aperture and shutter priority modes', () => {
    const aperture = resolveExposure({ ...DEFAULT_CAMERA, mode: 'A', aperture: 2.8, autoISO: false, iso: 400 }, 8);
    expect(aperture.aperture).toBe(2.8);
    const shutter = resolveExposure({ ...DEFAULT_CAMERA, mode: 'S', shutter: 1 / 500, autoISO: false, iso: 400 }, 8);
    expect(shutter.shutter).toBe(1 / 500);
  });

  it('keeps manual settings and flags clipping instead of hiding it', () => {
    const camera = { ...DEFAULT_CAMERA, mode: 'M' as const, aperture: 2.8, shutter: 1 / 125, iso: 800, autoISO: false };
    expect(resolveExposure(camera, 4).iso).toBe(800);
    expect(resolveExposure(camera, 18).outOfRange).toBe(true);
  });

  it('formats shutters and caps long-exposure sampling work', () => {
    expect(formatShutter(1 / 125)).toBe('1/125');
    expect(formatShutter(2)).toBe('2″');
    expect(shutterProgressSamples(30)).toBe(64);
  });
});
