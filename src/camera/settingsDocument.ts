import type { CameraSettings, SettingsDocument, SourceKind } from './types';
import { APERTURES, ISOS, SHUTTERS } from './exposure';
import { CAMERA_PROFILES, isoRange } from './profiles';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isOneOf = <T extends string | number>(value: unknown, allowed: readonly T[]): value is T =>
  typeof value === 'string' || typeof value === 'number' ? allowed.includes(value as T) : false;
const isFiniteBetween = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const isStep = (value: number, step: number) => Math.abs(value / step - Math.round(value / step)) < 1e-6;

export function isCameraSettings(value: unknown): value is CameraSettings {
  if (!isRecord(value)) return false;
  const profile = CAMERA_PROFILES.find((item) => item.id === value.cameraProfile);
  return Boolean(profile)
    && typeof value.toneSimulation === 'string' && profile!.styles.some((style) => style.id === value.toneSimulation)
    && isOneOf(value.dualNativeISO, ['auto', 'low', 'high'] as const)
    && isOneOf(value.highIsoNoiseReduction, ['off', 'low', 'standard', 'high'] as const)
    && isOneOf(value.softSkin, ['off', 'low', 'standard', 'high'] as const)
    && (profile!.softSkinEffect || value.softSkin === 'off')
    && (profile!.nativeIso !== undefined || value.dualNativeISO === 'auto')
    && isOneOf(value.flashSimulation, ['off', 'fill', 'slow-sync', 'rear-curtain'] as const)
    && isOneOf(value.captureProgram, ['standard', 'portrait', 'landscape', 'night', 'sports'] as const)
    && isOneOf(value.mode, ['P', 'A', 'S', 'M'])
    && typeof value.aperture === 'number' && APERTURES.includes(value.aperture as (typeof APERTURES)[number])
    && typeof value.shutter === 'number' && SHUTTERS.includes(value.shutter as (typeof SHUTTERS)[number])
    && typeof value.iso === 'number' && ISOS.includes(value.iso as (typeof ISOS)[number])
    && value.iso >= isoRange(value as unknown as CameraSettings)[0] && value.iso <= isoRange(value as unknown as CameraSettings)[1]
    && typeof value.autoISO === 'boolean'
    && isFiniteBetween(value.exposureCompensation, -3, 3) && isStep(value.exposureCompensation, 1 / 3)
    && Number.isInteger(value.focalLength) && isFiniteBetween(value.focalLength, 24, 120)
    && isOneOf(value.aspectRatio, [1, 1.3333333333333333, 1.5, 1.7777777777777777] as const)
    && isOneOf(value.sensor, ['full-frame', 'aps-c', 'micro-four-thirds'] as const)
    && isFiniteBetween(value.whiteBalance, 2500, 10000) && isStep(value.whiteBalance, 100)
    && isFiniteBetween(value.focusDistance, 0.3, 20)
    && typeof value.autofocus === 'boolean'
    && isOneOf(value.metering, ['matrix', 'center', 'spot'] as const)
    && typeof value.showGrid === 'boolean' && typeof value.showHistogram === 'boolean'
    && typeof value.highlightWarning === 'boolean'
    && isFiniteBetween(value.filmGrain, 0, 35);
}

export function parseSettingsDocument(value: unknown): SettingsDocument {
  if (!isRecord(value) || value.schemaVersion !== 2 || typeof value.exportedAt !== 'string'
    || !Number.isFinite(Date.parse(value.exportedAt)) || !isCameraSettings(value.settings)
    || !isOneOf<SourceKind>(value.source, ['scene2d', 'scene3d', 'upload', 'camera'])
    || typeof value.sceneId !== 'string' || value.sceneId.length === 0) {
    throw new Error('SETTINGS_INVALID');
  }
  return { schemaVersion: 2, exportedAt: value.exportedAt, settings: value.settings, source: value.source, sceneId: value.sceneId };
}
