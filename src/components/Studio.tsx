import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Aperture, ArrowDownToLine, ArrowLeftRight, AudioLines, BarChart3 as Histogram, Camera, Check, ChevronDown,
  CircleHelp, Clock3, Download, Focus, Grid2X2, Languages, Minus, Plus, RotateCcw, RotateCw, SlidersHorizontal,
  Sun, Upload, X, Zap,
} from 'lucide-react';
import { useStudioStore, DEFAULT_CAMERA } from '../camera/store';
import { parseSettingsDocument } from '../camera/settingsDocument';
import { ISOS, resolveExposure, formatShutter, shutterProgressSamples } from '../camera/exposure';
import type { ResolvedExposure } from '../camera/types';
import { DEFAULT_DEVELOP, downloadImage, renderDevelopedImage, type DevelopSettings } from '../camera/processor';
import { SCENES, imageFromUrl } from '../camera/scenes';
import type { CameraSettings, CaptureRecord, SourceKind, Workspace } from '../camera/types';
import { saveCapture, listCaptures, deleteCapture, clearCaptures } from '../storage/library';
import { downloadOfflineScenes, getOfflineSceneProgress } from '../storage/offlineScenes';
import i18n from '../i18n';
import { Viewfinder } from './Viewfinder';
import { DevelopedPhoto } from './DevelopedPhoto';

const APERTURE_MARKS = [1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22];
const SHUTTER_MARKS = [1 / 8000, 1 / 6400, 1 / 5000, 1 / 4000, 1 / 3200, 1 / 2500, 1 / 2000, 1 / 1600, 1 / 1250, 1 / 1000, 1 / 800, 1 / 640, 1 / 500, 1 / 400, 1 / 320, 1 / 250, 1 / 200, 1 / 160, 1 / 125, 1 / 100, 1 / 80, 1 / 60, 1 / 50, 1 / 40, 1 / 30, 1 / 25, 1 / 20, 1 / 15, 1 / 13, 1 / 10, 1 / 8, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 0.4, 0.5, 0.6, 0.8, 1, 1.3, 1.6, 2, 2.5, 3.2, 4, 5, 6, 8, 10, 13, 15, 20, 25, 30];
const labels = { zh: '繁中', en: 'EN', ja: '日本語' } as const;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const nearestMark = (value: number, marks: number[]) => marks.reduce((a, b) => Math.abs(b - value) < Math.abs(a - value) ? b : a);
const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function getImageDimensions(image: CanvasImageSource): [number, number] {
  const candidate = image as CanvasImageSource & { videoWidth?: number; videoHeight?: number; naturalWidth?: number; naturalHeight?: number; width: number; height: number };
  if (candidate.videoWidth !== undefined) return [candidate.videoWidth, candidate.videoHeight ?? 0];
  if (candidate.naturalWidth !== undefined) return [candidate.naturalWidth, candidate.naturalHeight ?? 0];
  return [candidate.width, candidate.height];
}

function RangeRow({ label, value, min, max, step, onChange, format, disabled, hint }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void;
  format?: (value: number) => string; disabled?: boolean; hint?: string;
}) {
  return <div className={`range-row ${disabled ? 'is-disabled' : ''}`}>
    <div className="range-label"><label>{label}</label>{hint && <span className="range-hint">{hint}</span>}<output>{format?.(value) ?? value}</output></div>
    <div className="range-inputs">
      <input aria-label={label} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
      <input aria-label={`${label} number`} className="number-entry" type="number" min={min} max={max} step={step} value={Number(value.toFixed(3))} disabled={disabled} onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) onChange(clamp(next, min, max)); }} />
    </div>
  </div>;
}

function HistogramLine({ image }: { image: string | null }) {
  const [bars, setBars] = useState<number[]>([]);
  useEffect(() => {
    if (!image) { setBars([]); return; }
    let active = true;
    const img = new Image(); img.src = image;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 64;
        const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return;
        ctx.drawImage(img, 0, 0, 96, 64);
        const pixels = ctx.getImageData(0, 0, 96, 64).data; const hist = new Array(32).fill(0);
        for (let i = 0; i < pixels.length; i += 4) hist[Math.min(31, Math.floor((pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722) / 8))] += 1;
        const ceiling = Math.max(...hist, 1); if (active) setBars(hist.map((n: number) => 6 + (n / ceiling) * 37));
      } catch { if (active) setBars([]); }
    };
    return () => { active = false; };
  }, [image]);
  return <svg className="histogram-graph" viewBox="0 0 120 48" role="img" aria-label="Image luminance histogram"><defs><linearGradient id="hist-fill" x1="0" x2="1"><stop offset="0%" stopColor="#e19e59" stopOpacity=".24" /><stop offset="100%" stopColor="#eeece4" stopOpacity=".5" /></linearGradient></defs>{bars.length > 0 && <><path d={`M 0 48 ${bars.map((v, i) => `L ${i * (120 / (bars.length - 1))} ${48 - (v / 48) * 48}`).join(' ')} L 120 48 Z`} fill="url(#hist-fill)" /><path d={bars.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * (120 / (bars.length - 1))} ${48 - (v / 48) * 48}`).join(' ')} fill="none" stroke="#e7b37d" strokeWidth="1.3" /></>}</svg>;
}

function MeterScale({ deviation }: { deviation: number }) {
  const position = clamp(50 + deviation * 16.66, 0, 100);
  return <div className="meter-graphic" aria-label={`Exposure meter ${deviation >= 0 ? 'plus ' : 'minus '}${Math.abs(deviation).toFixed(1)} stops`}>
    <div className="meter-ticks">{[-3, -2, -1, 0, 1, 2, 3].map((n) => <span key={n} className={n === 0 ? 'meter-zero' : ''}>{n > 0 ? `+${n}` : n}</span>)}</div>
    <div className="meter-rail"><span style={{ left: `${position}%` }} /></div>
  </div>;
}

function CameraPanel({ camera, update, exposure, language, disabled }: {
  camera: CameraSettings; update: ReturnType<typeof useStudioStore.getState>['update']; exposure: ResolvedExposure;
  language: 'zh' | 'en' | 'ja'; disabled: boolean;
}) {
  const tr = (k: string, en?: string) => i18n.getFixedT(language)(k) === k ? en ?? k : i18n.getFixedT(language)(k);
  const modeOptions: Array<CameraSettings['mode']> = ['P', 'A', 'S', 'M'];
  const apertureIndex = APERTURE_MARKS.findIndex((item) => item === exposure.aperture);
  const shutterIndex = nearestMark(exposure.shutter, SHUTTER_MARKS);
  const shutterPosition = SHUTTER_MARKS.findIndex((item) => item === shutterIndex);
  const isoPosition = ISOS.findIndex((item) => item === exposure.iso);
  const apertureLocked = camera.mode === 'S' || camera.mode === 'P';
  const shutterLocked = camera.mode === 'A' || camera.mode === 'P';
  const manual = camera.mode === 'M' && !camera.autoISO;
  return <div className="camera-panel">
    <div className="panel-heading"><div><span className="eyebrow">{tr('shooting', 'CAMERA SETTINGS')}</span><h2>{tr('shooting', 'Camera')}</h2></div><button className="icon-button tiny help-button" title={tr('settingsHelp', 'Learn how these settings work')}><CircleHelp size={15} /></button></div>
    <div className="mode-control">
      <div className="range-label"><label>{tr('mode', 'Exposure mode')}</label><span className="range-hint">{camera.mode === 'A' ? 'SEMIAUTOMATIC' : camera.mode === 'M' ? 'MANUAL' : camera.mode === 'S' ? 'SEMIAUTOMATIC' : 'PROGRAM'}</span></div>
      <div className="mode-segment" role="group" aria-label={tr('mode', 'Exposure mode')}>
        {modeOptions.map((mode) => <button key={mode} type="button" aria-pressed={camera.mode === mode} className={camera.mode === mode ? 'selected' : ''} onClick={() => update('mode', mode)} disabled={disabled}><strong>{mode}</strong><span>{mode === 'P' ? 'PROGRAM' : mode === 'A' ? 'APERTURE' : mode === 'S' ? 'SHUTTER' : 'MANUAL'}</span></button>)}
      </div>
    </div>
    <div className="camera-controls">
      <div className="control-topline"><span className="panel-subheading">EXPOSURE TRIANGLE</span><span className="mode-explainer">{camera.mode === 'A' ? 'Aperture priority' : camera.mode === 'S' ? 'Shutter priority' : camera.mode === 'P' ? 'Balanced program' : 'Full manual'}</span></div>
      <MeterScale deviation={exposure.deviation} />
      <div className={`dial-card aperture-dial ${apertureLocked ? 'is-disabled' : ''}`}>
        <div className="dial-icon"><Aperture size={20} strokeWidth={1.55} /></div>
        <div className="dial-data"><span>{tr('aperture', 'APERTURE')}</span><strong>f/{exposure.aperture}</strong><div className="aperture-marks">{['1.4', '2', '2.8', '4', '5.6', '8', '11', '16', '22'].map((v) => <i key={v} className={v === `${exposure.aperture}` ? 'active' : ''} />)}</div></div>
        <div className="dial-selector"><button aria-label="Close aperture" disabled={disabled || apertureLocked} onClick={() => { const current = APERTURE_MARKS.indexOf(exposure.aperture); if (current >= 0) update('aperture', APERTURE_MARKS[Math.max(0, current - 1)]); }}><Minus size={11} /></button><button aria-label="Open aperture" disabled={disabled || apertureLocked} onClick={() => { const current = APERTURE_MARKS.indexOf(exposure.aperture); if (current >= 0) update('aperture', APERTURE_MARKS[Math.min(APERTURE_MARKS.length - 1, current + 1)]); }}><Plus size={11} /></button></div>
        <div className="dial-range"><input aria-label={tr('aperture', 'Aperture')} type="range" min="0" max={APERTURE_MARKS.length - 1} step="1" value={Math.max(0, apertureIndex)} disabled={disabled || apertureLocked} onChange={(event) => update('aperture', APERTURE_MARKS[Number(event.target.value)])} /></div>
      </div>
      <div className={`dial-card shutter-dial ${shutterLocked ? 'is-disabled' : ''}`}>
        <div className="dial-icon shutter-icon"><Clock3 size={20} strokeWidth={1.55} /></div>
        <div className="dial-data"><span>{tr('shutter', 'SHUTTER SPEED')}</span><strong>{formatShutter(exposure.shutter)}</strong><div className="dial-caption">{exposure.shutter >= 1 ? 'Long exposure' : exposure.shutter <= 1 / 500 ? 'Action stopped' : 'Handheld range'}</div></div>
        <div className="dial-selector"><button aria-label="Slower shutter" disabled={disabled || shutterLocked} onClick={() => update('shutter', SHUTTER_MARKS[Math.min(SHUTTER_MARKS.length - 1, shutterPosition + 1)])}><Minus size={11} /></button><button aria-label="Faster shutter" disabled={disabled || shutterLocked} onClick={() => update('shutter', SHUTTER_MARKS[Math.max(0, shutterPosition - 1)])}><Plus size={11} /></button></div>
        <div className="dial-range"><input aria-label={tr('shutter', 'Shutter speed')} type="range" min="0" max={SHUTTER_MARKS.length - 1} step="1" value={Math.max(0, shutterPosition)} disabled={disabled || shutterLocked} onChange={(event) => update('shutter', SHUTTER_MARKS[Number(event.target.value)])} /></div>
      </div>
      <div className="dial-card iso-dial">
        <div className="dial-icon iso-icon">ISO</div>
        <div className="dial-data"><span>{tr('iso', 'SENSOR SENSITIVITY')}</span><strong className="iso-value">{exposure.iso}<small> ISO</small></strong><div className="dial-caption">{exposure.iso <= 200 ? 'Clean · low grain' : exposure.iso <= 1600 ? 'Balanced detail' : 'More visible grain'}</div></div>
        <label className={`switch-row auto-iso ${camera.autoISO ? 'on' : ''}`}><input aria-label={tr('autoIso', 'Auto ISO')} type="checkbox" checked={camera.autoISO} disabled={disabled || manual} onChange={(event) => update('autoISO', event.target.checked)} /><span className="switch-knob" /><span className="switch-label">AUTO</span></label>
        <div className="dial-range"><input aria-label={tr('iso', 'ISO')} type="range" min="0" max={ISOS.length - 1} step="1" value={Math.max(0, isoPosition)} disabled={disabled || camera.autoISO} onChange={(event) => update('iso', ISOS[Number(event.target.value)])} /></div>
      </div>
      <RangeRow label={tr('compensation', 'EXPOSURE COMPENSATION')} value={camera.exposureCompensation} min={-3} max={3} step={1 / 3} format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} EV`} onChange={(v) => update('exposureCompensation', v)} disabled={disabled || manual} />
    </div>

    <div className="panel-divider" />
    <div className="panel-subheading optics-heading">OPTICS & FOCUS <span>35 MM FORMAT</span></div>
    <RangeRow label={tr('focalLength', 'FOCAL LENGTH')} value={camera.focalLength} min={24} max={120} step={1} format={(v) => `${v} mm`} onChange={(v) => update('focalLength', v)} disabled={disabled} />
    <div className="af-control"><span>{tr('autofocus', 'FOCUS')}</span><button type="button" className={camera.autofocus ? 'selected' : ''} aria-pressed={camera.autofocus} disabled={disabled} onClick={() => update('autofocus', !camera.autofocus)}><Focus size={12} /> {camera.autofocus ? 'AF-S' : 'MF'}</button></div>
    <RangeRow label={tr('focus', 'FOCUS DISTANCE')} value={camera.focusDistance} min={0.3} max={20} step={0.1} format={(v) => v < 1 ? `${Math.round(v * 100)} cm` : `${v.toFixed(1)} m`} onChange={(v) => update('focusDistance', v)} disabled={disabled || camera.autofocus} />
    <div className="sensor-row"><span className="control-inline-icon"><Focus size={15} /> {tr('sensor', 'SENSOR')}</span><div className="mini-segment"><button className={camera.sensor === 'full-frame' ? 'active' : ''} onClick={() => update('sensor', 'full-frame')} disabled={disabled}>FULL FRAME</button><button className={camera.sensor === 'aps-c' ? 'active' : ''} onClick={() => update('sensor', 'aps-c')} disabled={disabled}>APS-C</button></div></div>

    <div className="panel-divider" />
    <div className="section-heading-inline"><div><span className="panel-subheading">LIGHT & COLOUR</span><span className="subheading-detail">Set to the scene</span></div><Sun size={16} /></div>
    <RangeRow label={tr('whiteBalance', 'WHITE BALANCE')} value={camera.whiteBalance} min={2500} max={10000} step={100} format={(v) => `${v} K`} onChange={(v) => update('whiteBalance', v)} disabled={disabled} />
    <div className="setting-grid">
      <label className="select-field"><span>{tr('metering', 'Metering mode')}</span><select aria-label={tr('metering', 'Metering mode')} value={camera.metering} onChange={(event) => update('metering', event.target.value as CameraSettings['metering'])} disabled={disabled}><option value="matrix">{tr('matrix', 'Matrix')}</option><option value="center">{tr('center', 'Center-weighted')}</option><option value="spot">{tr('spot', 'Spot')}</option></select></label>
      <label className="select-field"><span>WHITE BALANCE PRESET</span><select value={camera.whiteBalance} onChange={(event) => update('whiteBalance', Number(event.target.value))} disabled={disabled}>{[2500, 3200, 4000, 5000, 5200, 5600, 6500, 7500, 10000].map((kelvin) => <option key={kelvin} value={kelvin}>{kelvin} K</option>)}</select></label>
    </div>
    <div className="setting-toggles"><Toggle icon={<Grid2X2 size={14} />} label={tr('grid', 'Rule of thirds')} checked={camera.showGrid} onChange={(v) => update('showGrid', v)} disabled={disabled} /><Toggle icon={<Histogram size={14} />} label={tr('histogram', 'Histogram')} checked={camera.showHistogram} onChange={(v) => update('showHistogram', v)} disabled={disabled} /><Toggle icon={<Zap size={14} />} label={tr('highlights', 'Highlight warning')} checked={camera.highlightWarning} onChange={(v) => update('highlightWarning', v)} disabled={disabled} /></div>
  </div>;
}

function Toggle({ icon, label, checked, onChange, disabled }: { icon: React.ReactNode; label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <label className={`toggle-choice ${checked ? 'active' : ''}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /><span className="toggle-icon">{icon}</span><span>{label}</span><span className="toggle-check">{checked && <Check size={11} />}</span></label>;
}

function DevelopPanel({ develop, setDevelop, undo, redo, reset, historyAvailable, redoAvailable, image, photoCamera, photoExposure }: { develop: DevelopSettings; setDevelop: (settings: DevelopSettings) => void; undo: () => void; redo: () => void; reset: () => void; historyAvailable: boolean; redoAvailable: boolean; image: string | null; photoCamera: CameraSettings; photoExposure: ResolvedExposure }) {
  const language = useStudioStore((state) => state.language);
  const tr = (k: string, en?: string) => i18n.getFixedT(language)(k) === k ? en ?? k : i18n.getFixedT(language)(k);
  const [showOriginal, setShowOriginal] = useState(false);
  const presets = [{ id: 'neutral', label: tr('neutral', 'Neutral'), color: '#87837b' }, { id: 'warm', label: tr('warm', 'Warm light'), color: '#bd8966' }, { id: 'cool', label: tr('cool', 'Cool'), color: '#768595' }, { id: 'soft', label: tr('soft', 'Soft'), color: '#a39481' }, { id: 'mono', label: tr('mono', 'Mono'), color: '#b9b8b2' }, { id: 'film', label: tr('film', 'Film'), color: '#8d7860' }];
  const set = (key: keyof DevelopSettings, value: number | string) => setDevelop({ ...develop, [key]: value, preset: key === 'preset' ? String(value) : 'custom' });
  const makeControl = (key: keyof DevelopSettings, name: string, min: number, max: number, step: number, value: number) => <RangeRow key={key} label={tr(key as string, name)} value={value} min={min} max={max} step={step} format={(v) => key === 'exposure' ? `${v > 0 ? '+' : ''}${v.toFixed(1)} EV` : key === 'temperature' ? `${v > 0 ? '+' : ''}${v} K` : `${v}`} onChange={(next) => set(key, next)} />;
  return <section className="develop-panel">
    <div className="panel-heading"><div><span className="eyebrow">COLOR ROOM</span><h2>{tr('color', 'Color & tone')}</h2></div><div className="history-actions"><button className="icon-button tiny" aria-label={tr('reset', 'Reset edits')} title={tr('reset', 'Reset edits')} onClick={reset}><span>0</span></button><button className="icon-button tiny" aria-label={tr('undo', 'Undo')} title={tr('undo', 'Undo')} onClick={undo} disabled={!historyAvailable}><RotateCcw size={15} /></button><button className="icon-button tiny" aria-label={tr('redo', 'Redo')} title={tr('redo', 'Redo')} onClick={redo} disabled={!redoAvailable}><RotateCw size={15} /></button></div></div>
    <div className="develop-photo" onPointerDown={() => setShowOriginal(true)} onPointerUp={() => setShowOriginal(false)} onPointerLeave={() => setShowOriginal(false)} onContextMenu={(e) => e.preventDefault()}>
      {image ? showOriginal ? <img src={image} alt="Original photograph" /> : <DevelopedPhoto src={image} camera={photoCamera} exposure={photoExposure} develop={develop} preserveCapturedBase alt="Photo in the develop room" /> : <div className="develop-empty"><SlidersHorizontal size={24} /><span>{tr('selectCompare', 'Select a photo to edit')}</span></div>}
      {image && <span className="original-instruction">{showOriginal ? tr('original', 'Original') : 'HOLD TO VIEW ORIGINAL'}</span>}
    </div>
    <div className="preset-block"><div className="panel-subheading">{tr('preset', 'FILM LOOKS')}</div><div className="preset-strip">{presets.map((preset) => <button key={preset.id} className={`preset-chip ${develop.preset === preset.id ? 'active' : ''}`} onClick={() => setDevelop({ ...develop, preset: preset.id })}><span style={{ background: preset.color }} /><strong>{preset.label}</strong></button>)}</div></div>
    <div className="develop-controls">
      {makeControl('exposure', 'Exposure', -3, 3, 0.1, develop.exposure)}
      {makeControl('contrast', 'Contrast', -50, 50, 1, develop.contrast)}
      {makeControl('highlights', 'Highlights', -50, 50, 1, develop.highlights)}
      {makeControl('shadows', 'Shadows', -50, 50, 1, develop.shadows)}
      {makeControl('temperature', 'Temperature', -100, 100, 1, develop.temperature)}
      {makeControl('saturation', 'Saturation', -100, 40, 1, develop.saturation)}
      {makeControl('vignette', 'Vignette', 0, 70, 1, develop.vignette)}
      {makeControl('grain', 'Grain', 0, 28, 1, develop.grain)}
    </div>
  </section>;
}

function Sidebar({ camera, update, exposure, language, workspace, activeRecord, develop, setDevelop, undo, redo, reset, historyAvailable, redoAvailable, showEdit, locked }: {
  camera: CameraSettings; update: ReturnType<typeof useStudioStore.getState>['update']; exposure: ResolvedExposure; language: 'zh' | 'en' | 'ja'; workspace: Workspace;
  activeRecord: CaptureRecord | null; develop: DevelopSettings; setDevelop: (v: DevelopSettings) => void; undo: () => void; redo: () => void; reset: () => void; historyAvailable: boolean; redoAvailable: boolean; showEdit: boolean;
  locked: boolean;
}) {
  if (showEdit || workspace === 'edit') return <DevelopPanel develop={develop} setDevelop={setDevelop} undo={undo} redo={redo} reset={reset} historyAvailable={historyAvailable && !locked} redoAvailable={redoAvailable && !locked} image={activeRecord?.image ?? null} photoCamera={activeRecord?.settings ?? camera} photoExposure={activeRecord?.exposure ?? exposure} />;
  return <CameraPanel camera={camera} update={update} exposure={exposure} language={language} disabled={workspace === 'playback' || locked} />;
}

export function Studio() {
  const camera = useStudioStore((state) => state.camera); const update = useStudioStore((state) => state.update);
  const source = useStudioStore((state) => state.source); const setSource = useStudioStore((state) => state.setSource);
  const sceneId = useStudioStore((state) => state.sceneId); const setScene = useStudioStore((state) => state.setScene);
  const workspace = useStudioStore((state) => state.workspace); const setWorkspace = useStudioStore((state) => state.setWorkspace);
  const language = useStudioStore((state) => state.language); const setLanguage = useStudioStore((state) => state.setLanguage);
  const scene = SCENES.find((item) => item.id === sceneId) ?? SCENES[0];
  const exposure = useMemo(() => resolveExposure(camera, scene.lightEv), [camera, scene]);
  const [customImage, setCustomImage] = useState<HTMLImageElement | null>(null);
  const [activeRecord, setActiveRecord] = useState<CaptureRecord | null>(null);
  const [captures, setCaptures] = useState<CaptureRecord[]>([]);
  const [develop, setDevelopState] = useState<DevelopSettings>(DEFAULT_DEVELOP);
  const [developHistory, setDevelopHistory] = useState<DevelopSettings[]>([]);
  const [developRedo, setDevelopRedo] = useState<DevelopSettings[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [cameraPermissionError, setCameraPermissionError] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [isExposing, setIsExposing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [notice, setNotice] = useState('');
  const [compare, setCompare] = useState<CaptureRecord | null>(null);
  const [longEdge, setLongEdge] = useState<1280 | 1920 | 3840>(1920);
  const [exportFormat, setExportFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [exportOptionsOpen, setExportOptionsOpen] = useState(false);
  const [watermark, setWatermark] = useState('');
  const [importError, setImportError] = useState('');
  const [ratioOpen, setRatioOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [offlinePack, setOfflinePack] = useState({ ready: false, saved: 0, total: 0, downloading: false, error: false });
  const videoRef = useRef<HTMLVideoElement>(null);
  const abortCapture = useRef<AbortController | null>(null);
  const abortOfflinePack = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const settingsFileInput = useRef<HTMLInputElement>(null);
  const updateRegistration = useRef<ServiceWorkerRegistration | null>(null);
  const updateConfirmed = useRef(false);
  const customImageUrl = useRef<string | null>(null);
  const uploadSequence = useRef(0);

  const t = (key: string, fallback?: string) => {
    const value = i18n.getFixedT(language)(key);
    return value === key ? fallback ?? key : value;
  };
  const setDevelop = (next: DevelopSettings) => {
    setDevelopHistory((previous) => [...previous.slice(-19), develop]);
    setDevelopRedo([]);
    setDevelopState(next);
  };
  const undoDevelop = () => {
    if (!developHistory.length) return;
    setDevelopState(developHistory.at(-1) ?? DEFAULT_DEVELOP);
    setDevelopHistory((previous) => previous.slice(0, -1));
    setDevelopRedo((previous) => [...previous.slice(-19), develop]);
  };
  const redoDevelop = () => {
    if (!developRedo.length) return;
    setDevelopState(developRedo.at(-1) ?? DEFAULT_DEVELOP);
    setDevelopRedo((previous) => previous.slice(0, -1));
    setDevelopHistory((previous) => [...previous.slice(-19), develop]);
  };
  const resetDevelop = () => setDevelop(DEFAULT_DEVELOP);

  useEffect(() => {
    if (source !== 'scene3d') return;
    let current = true;
    void getOfflineSceneProgress().then((progress) => {
      if (current) setOfflinePack((state) => ({ ...state, ...progress, error: false }));
    }).catch(() => {
      if (current) setOfflinePack((state) => ({ ...state, error: true }));
    });
    return () => { current = false; };
  }, [source]);

  const saveOfflineScenes = async () => {
    const controller = new AbortController();
    abortOfflinePack.current = controller;
    setOfflinePack((state) => ({ ...state, downloading: true, error: false, saved: 0 }));
    try {
      const total = await downloadOfflineScenes(controller.signal, (saved, count) => {
        setOfflinePack((state) => ({ ...state, saved, total: count }));
      });
      setOfflinePack({ ready: true, saved: total, total, downloading: false, error: false });
      setNotice(t('offline3dSaved', '3D scenes saved for offline use.'));
    } catch (error) {
      const cancelled = error instanceof DOMException && error.name === 'AbortError';
      setOfflinePack((state) => ({ ...state, ready: false, downloading: false, error: !cancelled }));
      if (!cancelled) setNotice(t('offline3dError', 'Could not save the full 3D scene pack. Check your connection or available storage and retry.'));
    } finally {
      if (abortOfflinePack.current === controller) abortOfflinePack.current = null;
    }
  };

  useEffect(() => {
    void i18n.changeLanguage(language);
    const localized = language === 'zh' ? 'zh-Hant' : language === 'ja' ? 'ja' : 'en';
    document.documentElement.lang = localized;
  }, [language]);
  useEffect(() => {
    void listCaptures().then((stored) => { setCaptures(stored); setActiveRecord((current) => current ?? stored[0] ?? null); });
    const page = window.location.hash.replace('#/', '');
    if (page === 'shoot' || page === 'playback' || page === 'edit') setWorkspace(page);
  }, [setWorkspace]);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;
    const checkForWaitingWorker = () => {
      if (!disposed && navigator.serviceWorker.controller && registration?.waiting) {
        updateRegistration.current = registration;
        setUpdateReady(true);
      }
    };
    const handleControllerChange = () => { if (updateConfirmed.current) window.location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((result) => {
      registration = result;
      checkForWaitingWorker();
      result.addEventListener('updatefound', () => result.installing?.addEventListener('statechange', checkForWaitingWorker));
    }).catch(() => undefined);
    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);
  useEffect(() => { window.history.replaceState(null, '', `#/${workspace}`); }, [workspace]);
  useEffect(() => {
    const stop = () => { if (stream) stream.getTracks().forEach((track) => track.stop()); };
    window.addEventListener('beforeunload', stop);
    return () => window.removeEventListener('beforeunload', stop);
  }, [stream]);
  useEffect(() => () => { stream?.getTracks().forEach((track) => track.stop()); if (videoRef.current) videoRef.current.srcObject = null; }, [stream]);
  useEffect(() => () => { if (customImageUrl.current) URL.revokeObjectURL(customImageUrl.current); }, []);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setCompare(null); setMobilePanelOpen(false); abortCapture.current?.abort(); return; }
      const target = event.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName) || target.isContentEditable) return;
      if (event.code === 'Space' && workspace === 'shoot' && !isExposing) { event.preventDefault(); document.querySelector<HTMLButtonElement>('[data-shutter]')?.click(); }
      if (event.key.toLowerCase() === 'f') { event.preventDefault(); document.querySelector<HTMLButtonElement>('[data-autofocus]')?.click(); }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [workspace, isExposing]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const startCamera = async (requestedFacing: 'environment' | 'user' = facing) => {
    setCameraPermissionError(false); setCameraStarting(true);
    if (!navigator.mediaDevices?.getUserMedia) { setCameraPermissionError(true); setCameraStarting(false); return; }
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: requestedFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      setStream((previous) => { previous?.getTracks().forEach((track) => track.stop()); return next; });
      if (videoRef.current) { videoRef.current.srcObject = next; void videoRef.current.play().catch(() => undefined); }
      setCameraPermissionError(false);
    } catch { setCameraPermissionError(true); }
    finally { setCameraStarting(false); }
  };

  const setWorkspaceRoute = (next: Workspace) => { setWorkspace(next); setMobilePanelOpen(false); };
  const stopCameraStream = () => {
    if (videoRef.current) videoRef.current.srcObject = null;
    setStream((previous) => { previous?.getTracks().forEach((track) => track.stop()); return null; });
  };
  const chooseSource = (next: SourceKind) => {
    if (next !== 'camera') {
      stopCameraStream();
      setCameraPermissionError(false);
    }
    if (next !== 'upload' && customImageUrl.current) {
      uploadSequence.current += 1;
      URL.revokeObjectURL(customImageUrl.current); customImageUrl.current = null; setCustomImage(null);
    }
    setSource(next);
    if (next === 'upload') fileInput.current?.click();
  };

  const loadImage = async (file: File) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setImportError(t('unsupportedImage', 'Unsupported image type. Choose a JPEG, PNG or WebP photo.')); return; }
    if (file.size > 40 * 1024 * 1024) { setImportError(t('imageTooLarge', 'This image is over 40 MB. Choose a smaller file.')); return; }
    setImportError('');
    const objectUrl = URL.createObjectURL(file);
    const sequence = ++uploadSequence.current;
    try {
      const image = await imageFromUrl(objectUrl);
      if (sequence !== uploadSequence.current) { URL.revokeObjectURL(objectUrl); return; }
      if (customImageUrl.current) URL.revokeObjectURL(customImageUrl.current);
      customImageUrl.current = objectUrl;
      setCustomImage(image); setSource('upload'); setWorkspaceRoute('shoot');
    } catch { URL.revokeObjectURL(objectUrl); if (sequence === uploadSequence.current) setImportError(t('imageDecodeError', 'The chosen photo could not be decoded.')); }
  };

  const meterFocus = (x: number, y: number) => {
    update('focusDistance', Number((0.7 + clamp(1 - y, 0, 1) * 8).toFixed(1)));
    if (camera.metering === 'spot') update('exposureCompensation', Number(clamp((0.5 - x) * 0.5, -3, 3).toFixed(1)));
  };
  const autofocus = () => {
    update('autofocus', true);
    setNotice(t('focusMark', 'Autofocus acquired'));
  };

  const activeImageSource = async (): Promise<CanvasImageSource> => {
    if (source === 'camera') {
      const video = videoRef.current;
      if (!video || !stream || video.readyState < 2) throw new Error(t('cameraError', 'Camera is not ready.'));
      return video;
    }
    if (source === 'upload') {
      if (!customImage) throw new Error(t('uploadGuide', 'Choose a photo first.'));
      return customImage;
    }
    if (source === 'scene3d') {
      const renderedStage = document.querySelector<HTMLCanvasElement>('.three-stage canvas');
      if (renderedStage?.width && renderedStage.height) return renderedStage;
      return imageFromUrl(scene.stageImage);
    }
    return imageFromUrl(scene.image);
  };

  const capture = async () => {
    if (isExposing) { abortCapture.current?.abort(); return; }
    const snapshot = useStudioStore.getState().camera;
    const snapshotScene = SCENES.find((item) => item.id === useStudioStore.getState().sceneId) ?? SCENES[0];
    const snapshotExposure = resolveExposure(snapshot, snapshotScene.lightEv);
    let sourceImage: CanvasImageSource;
    try { sourceImage = await activeImageSource(); } catch (error) { setNotice(error instanceof Error ? error.message : t('cameraError')); return; }
    const dimensions = getImageDimensions(sourceImage);
    const [width, height] = dimensions;
    if (!width || !height) { setNotice(t('cameraError')); return; }
    const controller = new AbortController(); abortCapture.current = controller;
    setIsExposing(true); setCaptureProgress(0);
    try {
      const rendered = renderDevelopedImage(sourceImage, width, height, snapshot, snapshotExposure, DEFAULT_DEVELOP, 'capture');
      // A slow shutter uses capped temporal samples to suggest motion while keeping capture bounded.
      if ((snapshotScene.moving || source === 'camera') && snapshotExposure.shutter > 1 / 30) {
        const count = shutterProgressSamples(snapshotExposure.shutter);
        const blur = document.createElement('canvas'); blur.width = rendered.width; blur.height = rendered.height;
        const ctx = blur.getContext('2d');
        if (ctx) {
          ctx.globalAlpha = 1 / Math.min(6, count);
          for (let n = 0; n < Math.min(6, count); n++) ctx.drawImage(rendered, n * rendered.width * 0.003 * Math.log2(snapshotExposure.shutter * 30), 0);
          rendered.width = blur.width; rendered.height = blur.height;
          rendered.getContext('2d')?.drawImage(blur, 0, 0);
        }
      }
      const start = performance.now(); const duration = snapshotExposure.shutter * 1000;
      while (performance.now() - start < duration) {
        await new Promise<void>((resolve, reject) => {
          let timeout = 0;
          const onAbort = () => { clearTimeout(timeout); controller.signal.removeEventListener('abort', onAbort); reject(new DOMException('Capture cancelled.', 'AbortError')); };
          controller.signal.addEventListener('abort', onAbort, { once: true });
          timeout = window.setTimeout(() => { controller.signal.removeEventListener('abort', onAbort); resolve(); }, Math.min(100, duration - (performance.now() - start)));
        });
        setCaptureProgress(clamp((performance.now() - start) / Math.max(1, duration), 0, 1));
      }
      if (controller.signal.aborted) throw new DOMException('Capture cancelled.', 'AbortError');
      const image = rendered.toDataURL('image/jpeg', 0.92);
      const thumbnailCanvas = document.createElement('canvas'); thumbnailCanvas.width = 320;
      thumbnailCanvas.height = Math.round(320 * rendered.height / rendered.width);
      thumbnailCanvas.getContext('2d')?.drawImage(rendered, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
      const now = Date.now();
      const record: CaptureRecord = {
        id: uid(), image, thumbnail: thumbnailCanvas.toDataURL('image/jpeg', 0.72), settings: snapshot, exposure: snapshotExposure,
        source, createdAt: now, sceneId: source === 'scene2d' || source === 'scene3d' ? snapshotScene.id : undefined,
      };
      try {
        await saveCapture(record);
        const next = [record, ...captures]; setCaptures(next); setActiveRecord(record);
        setNotice(t('saved', 'Photo saved.'));
      } catch {
        setActiveRecord(record); setNotice(t('storageError', 'Photo could not be added to your library; you can still download it.'));
      }
      setWorkspaceRoute('playback');
      setDevelopState(DEFAULT_DEVELOP);
      setDevelopHistory([]); setDevelopRedo([]);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice(error instanceof Error ? error.message : 'The exposure failed.');
      else setNotice(t('captureCancelled', 'Exposure cancelled.'));
    } finally {
      setIsExposing(false); setCaptureProgress(0); abortCapture.current = null;
    }
  };

  const makeCurrentImage = async (record: CaptureRecord | null = activeRecord) => {
    if (!record) return null;
    const image = await imageFromUrl(record.image);
    return renderDevelopedImage(image, image.naturalWidth, image.naturalHeight, record.settings, { ...record.exposure, deviation: 0, outOfRange: false }, develop, 'capture', true);
  };
  const downloadCurrent = async (format: 'image/png' | 'image/jpeg' = 'image/jpeg') => {
    if (!activeRecord) {
      try {
        const raw = await activeImageSource();
        const [width, height] = getImageDimensions(raw);
        const current = renderDevelopedImage(raw, width, height, camera, exposure, develop, 'capture');
        downloadImage(current, format, longEdge, watermark);
      } catch { setNotice(t('cameraError')); }
      return;
    }
    const canvas = await makeCurrentImage();
    if (canvas) downloadImage(canvas, format, longEdge, watermark);
  };

  const exportSettings = () => {
    const payload = { schemaVersion: 1 as const, exportedAt: new Date().toISOString(), settings: useStudioStore.getState().camera, source, sceneId };
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })); anchor.download = 'stillframe-settings-v1.json'; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  };
  const importSettings = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const document = parseSettingsDocument(JSON.parse(await file.text()));
      const imported = document.settings;
      if (!SCENES.some((item) => item.id === document.sceneId)) throw new Error(t('unsupportedSettings'));
      for (const key of Object.keys(DEFAULT_CAMERA) as Array<keyof CameraSettings>) if (key in imported) update(key, imported[key] as never);
      useStudioStore.getState().setScene(SCENES.find((item) => item.id === document.sceneId)!);
      if (document.source === 'scene2d' || document.source === 'scene3d') useStudioStore.getState().setSource(document.source);
      setImportError(''); setNotice(t('ready', 'Settings restored.'));
    } catch (error) { const message = error instanceof Error ? error.message : ''; setImportError(message === 'SETTINGS_INVALID' ? t('unsupportedSettings') : message || t('unsupportedSettings')); }
    event.target.value = '';
  };

  const displayRecord = activeRecord;
  const displayScene = scene;
  const shownHistogram = workspace === 'playback' || workspace === 'edit' ? displayRecord?.image ?? null : source === 'upload' ? customImage?.src ?? null : displayScene.image;
  const currentExposure = workspace === 'playback' && activeRecord ? activeRecord.exposure : exposure;

  return <main className="studio-shell">
    <header className="topbar">
      <a className="brand-lockup" href="#/shoot" onClick={() => setWorkspaceRoute('shoot')} aria-label="Stillframe camera studio home"><span className="brand-icon"><Aperture size={21} strokeWidth={1.6} /></span><span className="brand-text"><strong>STILLFRAME</strong><small>CAMERA STUDIO</small></span></a>
      <div className="topbar-center"><span className="system-status"><i /> {t('ready', 'STUDIO READY')}</span><span className="system-divider" /><span className="active-location"><span className="location-dot" /> {scene.location[language]} <ChevronDown size={12} /></span></div>
      <div className="topbar-actions"><label className="language-picker"><Languages size={14} /><select aria-label="Language" value={language} onChange={(event) => setLanguage(event.target.value as 'zh' | 'en' | 'ja')}>{Object.entries(labels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><button className="topbar-icon" title={t('importSettings', 'Import settings')} onClick={() => settingsFileInput.current?.click()}><Upload size={15} /></button><button className="topbar-icon" title={t('exportSettings', 'Export settings')} onClick={exportSettings}><ArrowDownToLine size={15} /></button></div>
      <input ref={settingsFileInput} type="file" className="visually-hidden" accept="application/json,.json" onChange={importSettings} />
    </header>

    {updateReady && <div className="inline-alert update-alert" role="status"><span>{t('updateAvailable', 'A new version is ready.')}</span><div><button className="update-later" onClick={() => setUpdateReady(false)}>{t('updateLater', 'Later')}</button><button className="update-now" onClick={() => { updateConfirmed.current = true; updateRegistration.current?.waiting?.postMessage({ type: 'stillframe-activate-update' }); }}>{t('updateNow', 'Reload to update')}</button></div></div>}
    {importError && <div className="inline-alert" role="alert">{importError}<button onClick={() => setImportError('')}><X size={14} /></button></div>}
    <div className="workspace-bar">
      <div className="source-switcher">
        <span className="section-label">{t('sourceMode', 'SOURCE')}</span>
        <button className={`source-button ${source === 'scene2d' ? 'active' : ''}`} onClick={() => chooseSource('scene2d')} disabled={isExposing}><span className="source-icon scene-icon" /><span>{t('twoD', 'SCENE SET')}</span></button>
        <button className={`source-button ${source === 'scene3d' ? 'active' : ''}`} onClick={() => chooseSource('scene3d')} disabled={isExposing}><span className="source-icon depth-icon" /><span>{t('threeD', 'DEPTH STAGE')}</span></button>
        <button className={`source-button ${source === 'upload' ? 'active' : ''}`} onClick={() => chooseSource('upload')} disabled={isExposing}><Upload size={14} /><span>{t('upload', 'IMPORT PHOTO')}</span></button>
        <button className={`source-button ${source === 'camera' ? 'active' : ''}`} onClick={() => chooseSource('camera')} disabled={isExposing}><Camera size={14} /><span>{t('camera', 'LIVE CAMERA')}</span></button>
      </div>
      <div className="workspace-tabs" role="tablist" aria-label="Studio workspaces">
        {([['shoot', 'photo'], ['playback', 'playback'], ['edit', 'develop']] as Array<[Workspace, string]>).map(([key, label]) => <button key={key} role="tab" aria-selected={workspace === key} className={`workspace-tab ${workspace === key ? 'active' : ''}`} onClick={() => setWorkspaceRoute(key)}><span>{t(label, label)}</span>{key === 'playback' && captures.length > 0 && <small>{captures.length}</small>}</button>)}
      </div>
    </div>

    <div className="app-body">
      <aside className="scene-rail">
        <div className="rail-title"><span className="eyebrow">SCENES</span><span>03</span></div>
        <div className="scene-stack">{SCENES.map((item, index) => <button key={item.id} className={`scene-card ${item.id === scene.id ? 'active' : ''}`} onClick={() => { setScene(item); if (source === 'upload' || source === 'camera') chooseSource('scene2d'); }} title={item.title[language]}><span className="scene-thumb" style={{ backgroundImage: `url("${item.image}")` }}><span className="scene-index">0{index + 1}</span>{item.moving && <span className="movement-symbol"><AudioLines size={15} /></span>}{index === 1 && <span className="scene-depth"><Aperture size={13} /></span>}</span><span className="scene-name">{item.title[language]}</span><span className="scene-condition">{item.lightEv.toFixed(1)} EV · {item.moving ? 'MOTION' : index === 1 ? 'DAYLIGHT' : 'LOW LIGHT'}</span></button>)}</div>
        <div className="rail-bottom"><span className="rail-rule" /><button title={t('importSettings', 'Import settings')} onClick={() => setGuideOpen((previous) => !previous)}><CircleHelp size={15} /><span>HOW TO SHOOT</span></button></div>
      </aside>

      <section className="view-column">
        <div className="mobile-scenes" aria-label={t('scene', 'Scenes')}>{SCENES.map((item, index) => <button key={item.id} aria-pressed={item.id === scene.id} className={item.id === scene.id ? 'active' : ''} onClick={() => { setScene(item); if (source === 'upload' || source === 'camera') chooseSource('scene2d'); }}><span className="mobile-scene-image" style={{ backgroundImage: `url("${item.image}")` }} /><span><small>0{index + 1} · {item.lightEv.toFixed(1)} EV</small><strong>{item.title[language]}</strong></span><ChevronDown size={13} /></button>)}</div>
        <div className="view-toolbar"><div className="toolbar-heading"><span className="eyebrow">{workspace === 'shoot' ? '01 / EXPOSURE PRACTICE' : workspace === 'playback' ? '02 / IMAGE REVIEW' : '03 / COLOR ROOM'}</span><h1>{workspace === 'shoot' ? scene.title[language] : workspace === 'playback' ? t('playback', 'Review photographs') : t('color', 'Develop image')}</h1><p>{workspace === 'shoot' ? scene.location[language] : workspace === 'playback' ? `${captures.length} ${t('captures', 'captures')}` : 'Tone, texture, and finish'}</p></div>
        <div className="view-tools"><div className="ratio-control"><span className="eyebrow">ASPECT</span><button title="Aspect ratio" aria-expanded={ratioOpen} onClick={() => setRatioOpen((value) => !value)}><span /> {camera.aspectRatio === 1.5 ? '3:2' : camera.aspectRatio === 1.3333333333333333 ? '4:3' : camera.aspectRatio === 1.7777777777777777 ? '16:9' : '1:1'} <ChevronDown size={11} /></button>{ratioOpen && <div className="ratio-menu">{([{ label: '3:2', value: 1.5 }, { label: '4:3', value: 1.3333333333333333 }, { label: '16:9', value: 1.7777777777777777 }, { label: '1:1', value: 1 }] as const).map((option) => <button key={option.label} className={camera.aspectRatio === option.value ? 'active' : ''} onClick={() => { update('aspectRatio', option.value); setRatioOpen(false); }}>{option.label}</button>)}</div>}</div><button className={`view-tool ${camera.showHistogram ? 'selected' : ''}`} aria-label="Toggle histogram" onClick={() => update('showHistogram', !camera.showHistogram)}><Histogram size={16} /></button><button className="view-tool" aria-label="Autofocus (F)" data-autofocus onClick={autofocus}><Focus size={16} /></button><button className="view-tool edit-crops" aria-label="Edit photo" onClick={() => setWorkspaceRoute('edit')}><SlidersHorizontal size={16} /></button>{workspace === 'playback' && activeRecord && captures.length > 1 && <button className="view-tool" aria-label={t('compare', 'Compare photos')} title={t('compare', 'Compare photos')} onClick={() => setCompare(activeRecord)}><ArrowLeftRight size={15} /></button>}{workspace === 'playback' && activeRecord && <button className="view-tool" aria-label={t('delete', 'Delete photo')} title={t('delete', 'Delete photo')} onClick={async () => { await deleteCapture(activeRecord.id); const next = captures.filter((item) => item.id !== activeRecord.id); setCaptures(next); setActiveRecord(next[0] ?? null); }}><X size={14} /></button>}</div></div>

        {source === 'scene3d' && workspace === 'shoot' && <div className="offline-pack-row" aria-live="polite">
          <button type="button" data-offline-pack onClick={() => offlinePack.downloading ? abortOfflinePack.current?.abort() : void saveOfflineScenes()} disabled={offlinePack.ready}>
            <Download size={13} />
            {offlinePack.downloading ? `${t('offline3dProgress', 'Preparing 3D scenes for offline use')} · ${offlinePack.saved}/${offlinePack.total || offlinePack.saved}` : offlinePack.ready ? t('offline3dSaved', '3D scenes saved for offline use') : t('offline3dDownload', 'Download 3D scenes for offline use')}
          </button>
          {offlinePack.downloading && <progress max={offlinePack.total || 1} value={offlinePack.saved} aria-label={t('offline3dProgress', '3D download progress')} />}
          {offlinePack.downloading && <button type="button" className="offline-pack-cancel" onClick={() => abortOfflinePack.current?.abort()}>{t('offline3dCancel', 'Cancel')}</button>}
          {offlinePack.error && <span role="alert">{t('offline3dError', 'Could not save the full 3D scene pack. Check your connection or available storage and retry.')}</span>}
        </div>}

        {workspace !== 'shoot' && activeRecord && <button className="mobile-export-action" onClick={() => setExportOptionsOpen(true)}><ArrowDownToLine size={14} /> {t('download', 'Save photo')}</button>}
        {guideOpen && <div className="learning-card"><span className="learning-mark"><Aperture size={17} /></span><div><strong>{t('settingsHelp', 'Change aperture in A mode to explore exposure and depth of field.')}</strong><span>Try f/2.8 · 1/500 · ISO 200, then compare with f/11 · 1/30 · ISO 800.</span></div><button className="icon-button tiny" onClick={() => setGuideOpen(false)} aria-label="Close guide"><X size={14} /></button></div>}

        <div className={`viewfinder-wrap ${workspace === 'playback' ? 'review-mode' : ''}`}>
          {camera.showHistogram && <div className="histogram-overlay"><span>Y · HISTOGRAM</span><HistogramLine image={shownHistogram} /></div>}
          {workspace === 'playback' && activeRecord ? <div className="review-image-wrap"><img className="review-image" src={activeRecord.image} alt={`Photograph captured ${new Date(activeRecord.createdAt).toLocaleString()}`} /><div className="review-frame-data"><span>{activeRecord.exposure.aperture} · {formatShutter(activeRecord.exposure.shutter)} · ISO {activeRecord.exposure.iso}</span><span>{new Date(activeRecord.createdAt).toLocaleString(language === 'zh' ? 'zh-TW' : language === 'ja' ? 'ja-JP' : 'en-US')}</span></div></div>
            : workspace === 'playback' && !activeRecord ? <div className="empty-library"><span className="empty-camera"><Camera size={28} strokeWidth={1.35} /></span><h2>{t('empty', 'Your next photograph starts here.')}</h2><p>Choose a scene, set the exposure and press the shutter.</p><button className="outline-action" onClick={() => setWorkspaceRoute('shoot')}>{t('takeAgain', 'Back to shooting')}</button></div>
              : workspace === 'edit' ? <div className="review-image-wrap">{displayRecord ? <DevelopedPhoto src={displayRecord.image} camera={displayRecord.settings} exposure={{ ...displayRecord.exposure, deviation: 0 }} develop={develop} preserveCapturedBase className="review-image" alt="Selected photograph with current edits" /> : <div className="empty-library"><SlidersHorizontal size={28} /><p>{t('selectCompare', 'Select a photo to edit')}</p><button className="outline-action" onClick={() => setWorkspaceRoute('playback')}>{t('playback', 'View photos')}</button></div>}</div>
                : <Viewfinder scene={displayScene} source={source} customImage={customImage} videoRef={videoRef} stream={stream} camera={camera} exposure={exposure} develop={DEFAULT_DEVELOP} language={language} pause3dRendering={isExposing || offlinePack.downloading} onFocus={meterFocus} onUpload={(file) => void loadImage(file)} onUseScene={() => chooseSource('scene2d')} onAF={autofocus} onStartCamera={() => void startCamera()} cameraStarting={cameraStarting} cameraError={cameraPermissionError} />}
        </div>

        {source === 'camera' && stream && <div className="camera-access-bar connected"><span className="live-indicator" /><span>DEVICE CAMERA · {facing === 'user' ? 'FRONT' : 'REAR'}</span><button className="quiet-button" onClick={() => { const next = facing === 'user' ? 'environment' : 'user'; setFacing(next); stopCameraStream(); window.setTimeout(() => void startCamera(next), 80); }}><ArrowLeftRight size={13} /> FLIP</button><button className="quiet-button subdued" onClick={stopCameraStream}>STOP</button></div>}
        <div className="capture-toolbar">
          <div className="capture-summary"><div className="capture-mode"><span>{camera.mode}</span><span>MODE</span></div><div><span className="eyebrow">{t('sensor', 'SENSOR')}</span><strong>{camera.sensor === 'full-frame' ? 'FULL FRAME' : 'APS-C'} <small>· {camera.focalLength} mm</small></strong></div><span className="capture-divider" /><div><span className="eyebrow">{t('match', 'METER')}</span><strong className={currentExposure.outOfRange ? 'meter-alert' : ''}>{currentExposure.deviation > 0 ? '+' : ''}{currentExposure.deviation.toFixed(1)} EV</strong></div></div>
          <div className="capture-actions"><button className="focus-action" data-autofocus onClick={autofocus} disabled={workspace !== 'shoot' || isExposing}><span><Focus size={16} /></span><span>{t('focusButton', 'HALF-PRESS AF')}<small>KEY F</small></span></button><button data-shutter className={`shutter-action ${isExposing ? 'is-exposing' : ''}`} onClick={() => void capture()} disabled={workspace !== 'shoot' && !isExposing}><span className="shutter-outer"><span className="shutter-inner">{isExposing ? <X size={17} /> : <Camera size={19} />}</span>{isExposing && <i style={{ '--capture-progress': `${captureProgress * 100}%` } as React.CSSProperties} />}</span><span className="shutter-copy">{isExposing ? <><strong>{t('processing', 'EXPOSING')}</strong><small>{`${Math.round(captureProgress * 100)}% · ESC TO CANCEL`}</small></> : <><strong>{t('shutterButton', 'CAPTURE')}</strong><small>SPACE BAR</small></>}</span></button><button className="download-action" onClick={() => setExportOptionsOpen(true)}><ArrowDownToLine size={15} /><span>{t('download', 'Save photo')}</span></button></div>
        </div>

        <section className="photo-roll" aria-label="Photo library"><div className="roll-heading"><div><span className="eyebrow">LOCAL LIBRARY</span><span className="roll-count">{captures.length.toString().padStart(2, '0')} / {t('captures', 'frames')}</span></div><div className="roll-actions"><span className="storage-note"><i /> {t('notice', 'Saved on this device')}</span><label className="import-photo-action"><Upload size={13} /><span>{t('uploadAction', 'Import photo')}</span><input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadImage(file); event.target.value = ''; }} /></label><button className="quiet-button clear-library" onClick={async () => { if (captures.length && window.confirm(t('confirm', 'Clear all photos?'))) { await clearCaptures(); setCaptures([]); setActiveRecord(null); } }} disabled={!captures.length}>{t('clear', 'Clear')}</button></div></div>
          <div className="filmstrip">{captures.length ? captures.slice(0, 12).map((item, index) => <button key={item.id} className={`film-frame ${activeRecord?.id === item.id ? 'selected' : ''}`} onClick={() => { setActiveRecord(item); setWorkspaceRoute('playback'); }} onContextMenu={async (event) => { event.preventDefault(); await deleteCapture(item.id); const next = captures.filter((record) => record.id !== item.id); setCaptures(next); if (activeRecord?.id === item.id) setActiveRecord(next[0] ?? null); }} title={`${item.exposure.aperture} · ${formatShutter(item.exposure.shutter)} · ISO ${item.exposure.iso} · Right click to delete`}><img src={item.thumbnail} alt={`Photo ${index + 1}`} /><span className="frame-number">{String(captures.length - index).padStart(2, '0')}</span><span className="frame-select-check"><Check size={12} /></span><span className="frame-spec">f/{item.exposure.aperture} · {formatShutter(item.exposure.shutter)}</span></button>) : <button className="filmstrip-empty" onClick={() => setWorkspaceRoute('shoot')}><span>＋</span><strong>{t('empty', 'Your next photograph starts here.')}</strong><small>PRESS SPACE TO CAPTURE</small></button>}</div></section>
      </section>

      <aside className={`settings-rail ${mobilePanelOpen ? 'mobile-open' : ''}`}><div className="mobile-panel-grab"><span /><button aria-expanded={mobilePanelOpen} onClick={() => setMobilePanelOpen((value) => !value)}>{mobilePanelOpen ? 'CAMERA SETTINGS' : `f/${exposure.aperture} · ${formatShutter(exposure.shutter)} · ISO ${exposure.iso}`}<ChevronDown size={13} /></button></div><Sidebar camera={camera} update={update} exposure={currentExposure} language={language} workspace={workspace} activeRecord={activeRecord} develop={develop} setDevelop={setDevelop} undo={undoDevelop} redo={redoDevelop} reset={resetDevelop} historyAvailable={developHistory.length > 0} redoAvailable={developRedo.length > 0} showEdit={workspace === 'edit'} locked={isExposing} /><div className="settings-footer"><span><i /> {t('ready', 'READY')}</span><span>STILLFRAME 1.0 <span className="footer-separator">·</span> © 2026</span></div><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadImage(file); event.target.value = ''; }} /></aside>
    </div>

    <footer className="app-footer"><span><Aperture size={13} /> <b>STILLFRAME</b> <i /> An instrument for learning to see.</span><span>ALL IMAGES STAY ON YOUR DEVICE <span className="footer-separator">·</span> NO ACCOUNT NEEDED</span></footer>
    {notice && <div className="toast" role="status"><Check size={15} /> {notice} <button onClick={() => setNotice('')} aria-label="Dismiss"><X size={13} /></button></div>}
    {exportOptionsOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setExportOptionsOpen(false); }}><section className="export-modal" role="dialog" aria-modal="true" aria-label={t('download', 'Export image')}><header><div><span className="eyebrow">EXPORT PHOTOGRAPH</span><h2>{t('download', 'Save photo')}</h2></div><button className="icon-button" onClick={() => setExportOptionsOpen(false)} aria-label={t('close', 'Close')}><X size={17} /></button></header><label className="select-field"><span>FILE FORMAT</span><select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as typeof exportFormat)}><option value="image/jpeg">JPEG · smaller file</option><option value="image/png">PNG · lossless</option></select></label><label className="select-field"><span>{t('downloadSize', 'Export resolution')} · {t('longEdge', 'Long edge')}</span><select value={longEdge} onChange={(event) => setLongEdge(Number(event.target.value) as typeof longEdge)}><option value={1280}>1280 px</option><option value={1920}>1920 px</option><option value={3840}>3840 px</option></select></label><label className="select-field"><span>{t('watermark', 'Watermark · optional')}</span><input value={watermark} maxLength={80} onChange={(event) => setWatermark(event.target.value)} placeholder="" /></label><div className="export-note"><span className="eyebrow">{camera.aspectRatio === 1.5 ? '3:2' : camera.aspectRatio === 1.3333333333333333 ? '4:3' : camera.aspectRatio === 1.7777777777777777 ? '16:9' : '1:1'}</span><span>Captured settings are baked into the image. This file is created locally in your browser.</span></div><div className="export-buttons"><button className="outline-action" onClick={() => setExportOptionsOpen(false)}>{t('cancel', 'Cancel')}</button><button className="export-submit" onClick={() => { setExportOptionsOpen(false); void downloadCurrent(exportFormat); }}><ArrowDownToLine size={14} /> {t('download', 'Export image')}</button></div></section></div>}
    {compare && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCompare(null); }}><section className="compare-modal" role="dialog" aria-modal="true" aria-label={t('compareTitle', 'Compare photos')}><header><div><span className="eyebrow">IMAGE COMPARISON</span><h2>{t('compareTitle', 'Side-by-side comparison')}</h2></div><button className="icon-button" onClick={() => setCompare(null)} aria-label={t('close', 'Close')}><X size={18} /></button></header><div className="comparison-images"><figure><img src={compare.image} alt="First capture" /><figcaption>f/{compare.exposure.aperture} · {formatShutter(compare.exposure.shutter)} · ISO {compare.exposure.iso}</figcaption></figure><label className="compare-select"><span>{t('selectCompare', 'Select a photo to compare')}</span><select defaultValue="" onChange={(event) => { const found = captures.find((record) => record.id === event.target.value); if (found) setCompare(found); }}><option value="" disabled>{t('selectCompare', 'Select a photo')}</option>{captures.filter((item) => item.id !== compare.id).map((item) => <option key={item.id} value={item.id}>{new Date(item.createdAt).toLocaleString()} · ISO {item.exposure.iso}</option>)}</select>{compare.id !== activeRecord?.id && <img src={activeRecord?.image} alt="Comparison photograph" />}</label></div></section></div>}
  </main>;
}
