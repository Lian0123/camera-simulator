import type { CameraSettings, SettingsDocument, SourceKind } from './types';
import { APERTURES, ISOS, SHUTTERS } from './exposure';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isOneOf = <T extends string | number>(value: unknown, allowed: readonly T[]): value is T =>
  typeof value === 'string' || typeof value === 'number' ? allowed.includes(value as T) : false;
const isFiniteBetween = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const isStep = (value: number, step: number) => Math.abs(value / step - Math.round(value / step)) < 1e-6;

export function isCameraSettings(value: unknown): value is CameraSettings {
  if (!isRecord(value)) return false;
  return isOneOf(value.mode, ['P', 'A', 'S', 'M'])
    && typeof value.aperture === 'number' && APERTURES.includes(value.aperture as (typeof APERTURES)[number])
    && typeof value.shutter === 'number' && SHUTTERS.includes(value.shutter as (typeof SHUTTERS)[number])
    && typeof value.iso === 'number' && ISOS.includes(value.iso as (typeof ISOS)[number])
    && typeof value.autoISO === 'boolean'
    && isFiniteBetween(value.exposureCompensation, -3, 3) && isStep(value.exposureCompensation, 1 / 3)
    && Number.isInteger(value.focalLength) && isFiniteBetween(value.focalLength, 24, 120)
    && isOneOf(value.aspectRatio, [1, 1.3333333333333333, 1.5, 1.7777777777777777] as const)
    && isOneOf(value.sensor, ['full-frame', 'aps-c'] as const)
    && isFiniteBetween(value.whiteBalance, 2500, 10000) && isStep(value.whiteBalance, 100)
    && isFiniteBetween(value.focusDistance, 0.3, 20)
    && typeof value.autofocus === 'boolean'
    && isOneOf(value.metering, ['matrix', 'center', 'spot'] as const)
    && typeof value.showGrid === 'boolean' && typeof value.showHistogram === 'boolean'
    && typeof value.highlightWarning === 'boolean'
    && isFiniteBetween(value.filmGrain, 0, 35);
}

export function parseSettingsDocument(value: unknown): SettingsDocument {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.exportedAt !== 'string'
    || !Number.isFinite(Date.parse(value.exportedAt)) || !isCameraSettings(value.settings)
    || !isOneOf<SourceKind>(value.source, ['scene2d', 'scene3d', 'upload', 'camera'])
    || typeof value.sceneId !== 'string' || value.sceneId.length === 0) {
    throw new Error('SETTINGS_INVALID');
  }
  return { schemaVersion: 1, exportedAt: value.exportedAt, settings: value.settings, source: value.source, sceneId: value.sceneId };
}
