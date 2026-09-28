import { describe, expect, it } from 'vitest';
import { DEFAULT_CAMERA } from './store';
import type { CameraSettings } from './types';
import { makeImageFilter, getDevelopSettings, DEFAULT_DEVELOP, flashOverlayColor, isoNoiseAmount, noiseReductionBlur } from './processor';
import { CAMERA_PROFILES, getCameraProfile, selectedNativeIso } from './profiles';

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

  it('provides camera-specific looks and enables dual native ISO only on a listed body', () => {
    expect(CAMERA_PROFILES).toHaveLength(6);
    expect(getCameraProfile('lumix-s5iix').nativeIso).toEqual([100, 640]);
    expect(selectedNativeIso({ cameraProfile: 'lumix-s5iix', dualNativeISO: 'auto' }, 800)).toBe(640);
    expect(selectedNativeIso({ cameraProfile: 'sony-a7iv', dualNativeISO: 'auto' }, 800)).toBeNull();
    const exposure = { aperture: 4, shutter: 1 / 125, iso: 100, targetEv: 7, measuredEv: 7, deviation: 0, outOfRange: false };
    expect(makeImageFilter({ ...DEFAULT_CAMERA, toneSimulation: 'fuji-velvia', cameraProfile: 'fujifilm-xt5' }, exposure))
      .not.toBe(makeImageFilter(DEFAULT_CAMERA, exposure));
  });

  it('reduces simulated high-ISO grain when noise reduction is raised', () => {
    const off = { ...DEFAULT_CAMERA, highIsoNoiseReduction: 'off' as const };
    const high = { ...DEFAULT_CAMERA, highIsoNoiseReduction: 'high' as const };
    expect(isoNoiseAmount(6400, high)).toBeLessThan(isoNoiseAmount(6400, off));
    expect(noiseReductionBlur(high, 6400)).toBeGreaterThan(noiseReductionBlur(off, 6400));
    expect(isoNoiseAmount(6400, DEFAULT_CAMERA)).toBeLessThan(isoNoiseAmount(6400, { ...DEFAULT_CAMERA, dualNativeISO: 'low' }));
  });

  it('uses different rendered flash falloffs for fill and sync modes', () => {
    expect(flashOverlayColor('off')).toBe('transparent');
    expect(flashOverlayColor('fill')).not.toBe(flashOverlayColor('slow-sync'));
    expect(flashOverlayColor('slow-sync')).not.toBe(flashOverlayColor('rear-curtain'));
  });

  it('does not apply the camera look twice when developing a captured JPEG', () => {
    const exposure = { aperture: 4, shutter: 1 / 125, iso: 6400, targetEv: 7, measuredEv: 7, deviation: 0, outOfRange: false };
    const camera: CameraSettings = { ...DEFAULT_CAMERA, toneSimulation: 'fuji-velvia', cameraProfile: 'fujifilm-xt5', softSkin: 'high', flashSimulation: 'fill' };
    expect(makeImageFilter(camera, exposure, DEFAULT_DEVELOP, true)).not.toContain('blur(');
    expect(makeImageFilter(camera, exposure, DEFAULT_DEVELOP, true)).toContain('saturate(1.000)');
  });
});
