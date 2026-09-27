import type { CameraSettings, ResolvedExposure, ShootingMode } from './types';

export const APERTURES = [1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22] as const;
export const SHUTTERS = [1 / 8000, 1 / 6400, 1 / 5000, 1 / 4000, 1 / 3200, 1 / 2500, 1 / 2000, 1 / 1600, 1 / 1250, 1 / 1000, 1 / 800, 1 / 640, 1 / 500, 1 / 400, 1 / 320, 1 / 250, 1 / 200, 1 / 160, 1 / 125, 1 / 100, 1 / 80, 1 / 60, 1 / 50, 1 / 40, 1 / 30, 1 / 25, 1 / 20, 1 / 15, 1 / 13, 1 / 10, 1 / 8, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 0.4, 0.5, 0.6, 0.8, 1, 1.3, 1.6, 2, 2.5, 3.2, 4, 5, 6, 8, 10, 13, 15, 20, 25, 30] as const;
export const ISOS = [100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600] as const;
export const SHUTTER_MIN = 1 / 8000;
export const SHUTTER_MAX = 30;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const nearest = (v: number, values: readonly number[]) => values.reduce((best, value) => Math.abs(value - v) < Math.abs(best - v) ? value : best);
const clampAperture = (value: number) => clamp(nearest(value, APERTURES), 1.4, 22);
const clampShutter = (value: number) => nearest(clamp(value, SHUTTER_MIN, SHUTTER_MAX), SHUTTERS);
const clampIso = (value: number) => clamp(nearest(value, ISOS), 100, 25600);

/** EV100 represented by the selected aperture, shutter duration, and ISO. */
export function measuredEv(aperture: number, shutter: number, iso: number): number {
  return Math.log2((aperture * aperture) / shutter * (100 / iso));
}

/** Solves the camera modes from a scene meter reading in EV100. */
export function resolveExposure(settings: CameraSettings, sceneEv: number): ResolvedExposure {
  const targetEv = sceneEv + settings.exposureCompensation;
  let aperture = settings.aperture;
  let shutter = settings.shutter;
  let iso = settings.iso;

  if (settings.mode === 'A') {
    aperture = clampAperture(settings.aperture);
    const timeAtIso100 = aperture ** 2 / (2 ** targetEv);
    if (settings.autoISO) {
      const handheldLimit = 1 / Math.max(30, settings.focalLength);
      shutter = clampShutter(Math.min(timeAtIso100, handheldLimit));
      iso = timeAtIso100 <= handheldLimit ? 100 : clampIso((timeAtIso100 / shutter) * 100);
      if (iso >= 25600 && timeAtIso100 / shutter > 256) shutter = clampShutter(timeAtIso100 / 256);
    } else {
      shutter = clampShutter((aperture ** 2) * (100 / settings.iso) / (2 ** targetEv));
    }
  } else if (settings.mode === 'S') {
    shutter = clampShutter(settings.shutter);
    aperture = clampAperture(Math.sqrt((2 ** targetEv) * shutter * (settings.autoISO ? 1 : settings.iso / 100)));
  } else if (settings.mode === 'P') {
    aperture = clampAperture(4);
    const timeAtIso100 = aperture ** 2 / (2 ** targetEv);
    if (settings.autoISO) {
      const handheldLimit = 1 / Math.max(30, settings.focalLength);
      shutter = clampShutter(Math.min(timeAtIso100, handheldLimit));
      iso = timeAtIso100 <= handheldLimit ? 100 : clampIso((timeAtIso100 / shutter) * 100);
      if (iso >= 25600 && timeAtIso100 / shutter > 256) shutter = clampShutter(timeAtIso100 / 256);
    } else {
      shutter = clampShutter((aperture ** 2) * (100 / settings.iso) / (2 ** targetEv));
    }
  }

  if (settings.autoISO && settings.mode !== 'A' && settings.mode !== 'P') {
    const solved = (aperture ** 2 / shutter) * 100 / (2 ** targetEv);
    iso = clampIso(solved);
  } else if (!settings.autoISO) {
    iso = clampIso(settings.iso);
  }

  aperture = clampAperture(aperture);
  shutter = clampShutter(shutter);
  iso = clampIso(iso);
  const measured = measuredEv(aperture, shutter, iso);
  const deviation = targetEv - measured;
  return { aperture, shutter, iso, targetEv, measuredEv: measured, deviation, outOfRange: Math.abs(deviation) > 0.2 };
}

export function applyModeSetting(settings: CameraSettings, mode: ShootingMode): CameraSettings {
  return { ...settings, mode };
}

export function formatShutter(seconds: number): string {
  if (seconds >= 1) return `${Number(seconds.toFixed(1))}″`;
  return `1/${Math.round(1 / seconds)}`;
}

export function evBrightness(deviation: number): number {
  return 2 ** clamp(deviation, -4, 3);
}

export function shutterProgressSamples(seconds: number): number {
  return clamp(Math.ceil(seconds * 8), 1, 64);
}
