import { lazy, Suspense, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Aperture, Focus, Upload } from 'lucide-react';
import type { CameraSettings, ResolvedExposure, SceneDefinition, SourceKind } from '../camera/types';
import { formatShutter } from '../camera/exposure';
import { isoNoiseAmount, makeImageFilter, type DevelopSettings } from '../camera/processor';
import { imageFromUrl } from '../camera/scenes';
import { LayeredSceneCanvas } from './LayeredSceneCanvas';

const ThreePhotoStage = lazy(() => import('./ThreePhotoStage').then((module) => ({ default: module.ThreePhotoStage })));

interface Props {
  scene: SceneDefinition; source: SourceKind; customImage: HTMLImageElement | null; videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null; camera: CameraSettings; exposure: ResolvedExposure; develop: DevelopSettings; language: 'zh' | 'en' | 'ja';
  pause3dRendering: boolean;
  onFocus: (x: number, y: number) => void; onUpload: (file: File) => void; onUseScene: () => void; onAF: () => void;
  onStartCamera: () => void; cameraStarting: boolean; cameraError: boolean;
}

export function Viewfinder({ scene, source, customImage, videoRef, stream, camera, exposure, develop, language, pause3dRendering, onFocus, onUpload, onUseScene, onAF, onStartCamera, cameraStarting, cameraError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [sceneImage, setSceneImage] = useState<{ key: string; image: HTMLImageElement } | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [focusPoint, setFocusPoint] = useState({ x: 0.5, y: 0.5 });
  const [focusAcquired, setFocusAcquired] = useState(false);
  const [highlightMask, setHighlightMask] = useState('');
  const text = language === 'zh'
      ? { hint: '點選畫面設定對焦點', scene: '場景取景模擬', upload: '將照片拖放在這裡', open: '選擇照片', camera: '授權相機後即可開始拍攝', retry: '改用內建場景', focus: '對焦完成', meter: '測光', start: '啟動相機' }
    : language === 'ja'
        ? { hint: '画面をタップしてフォーカス', scene: 'シーン撮影シミュレーション', upload: '写真をここにドロップ', open: '写真を選ぶ', camera: 'カメラを許可して撮影を開始', retry: '内蔵シーンを使う', focus: '合焦', meter: '測光', start: 'カメラを起動' }
      : { hint: 'Tap or click to place focus', scene: 'Scene viewfinder simulation', upload: 'Drop a photo here', open: 'Choose a photo', camera: 'Allow camera access to start shooting', retry: 'Use a built-in scene', focus: 'In focus', meter: 'METER', start: 'Start camera' };

  useEffect(() => {
    if (source !== 'scene2d' && source !== 'scene3d') return;
    let active = true;
    const key = `${source}:${scene.id}`;
    setSceneImage(null);
    void imageFromUrl(scene.stageImage).then((image) => { if (active) setSceneImage({ key, image }); }).catch(() => setError('Could not load this scene.'));
    return () => { active = false; };
  }, [scene, source]);

  const image = source === 'upload' ? customImage : sceneImage?.key === `${source}:${scene.id}` ? sceneImage.image : null;
  const filter = useMemo(() => makeImageFilter(camera, exposure, develop), [camera, exposure, develop]);
  const isScene = source === 'scene2d' || source === 'scene3d';

  useEffect(() => {
    setHighlightMask('');
    if (!camera.highlightWarning || (!image && source !== 'camera')) return;
    let active = true;
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 213;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    const updateMask = () => {
      const input: CanvasImageSource | null = source === 'camera'
        ? (videoRef.current && videoRef.current.readyState >= 2 ? videoRef.current : null)
        : source === 'scene2d' ? document.querySelector<HTMLCanvasElement>('.layered-scene') ?? image : image;
      if (!input) return;
      try {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(input, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const clipped = Math.max(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]) > 248;
          pixels.data[i] = 255; pixels.data[i + 1] = 76; pixels.data[i + 2] = 54; pixels.data[i + 3] = clipped ? 122 : 0;
        }
        context.putImageData(pixels, 0, 0);
        if (active) setHighlightMask(canvas.toDataURL('image/png'));
      } catch { if (active) setHighlightMask(''); }
    };
    updateMask();
    const timer = source === 'camera' ? window.setInterval(updateMask, 500) : undefined;
    return () => { active = false; if (timer !== undefined) clearInterval(timer); };
  }, [camera.highlightWarning, image, source, stream, videoRef]);
  const selectFocus = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!(source === 'scene2d' || source === 'scene3d')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
    setFocusPoint(point);
    onFocus(point.x, point.y);
    if (camera.autofocus) {
      setFocusAcquired(true);
      window.setTimeout(() => setFocusAcquired(false), 1200);
    }
  };
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  return (
    <div className={`viewfinder-area ${dragging ? 'is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
      <div className="photo-frame" ref={frameRef} style={{ aspectRatio: camera.aspectRatio }} onClick={selectFocus} role="img" aria-label={isScene ? scene.title[language] : source === 'camera' ? 'Device camera viewfinder' : 'Photo viewfinder'}>
        <div className="photo-image" style={image ? { filter, backgroundImage: `url("${image.src}")` } : undefined}>
          {source === 'scene3d' && image && <Suspense fallback={<div className="scene-stage-loading" aria-label="Loading the 3D viewfinder" />}><ThreePhotoStage image={image} sceneId={scene.id} focalLength={camera.focalLength} sensor={camera.sensor} aperture={exposure.aperture} focusDistance={camera.focusDistance} language={language} pauseRendering={pause3dRendering} onFallback={onUseScene} /></Suspense>}
          {source === 'camera' && <video className="live-video" ref={videoRef} playsInline muted autoPlay style={{ filter }} />}
          {source === 'camera' && !stream && <div className="media-message"><span className="message-glyph"><Focus size={24} /></span><p>{cameraError ? 'Camera access is unavailable. Upload a photo or use a practice scene.' : text.camera}</p><button className="quiet-button" onClick={(event) => { event.stopPropagation(); onStartCamera(); }} disabled={cameraStarting}>{cameraStarting ? '…' : text.start}</button><button className="quiet-button" onClick={(event) => { event.stopPropagation(); onUseScene(); }}>{text.retry}</button></div>}
          {source === 'upload' && !customImage && <div className="media-message"><span className="message-glyph"><Upload size={24} /></span><p>{text.upload}</p><button className="quiet-button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }}>{text.open}</button></div>}
          {source === 'upload' && customImage && <img className="upload-photo" src={customImage.src} alt="Uploaded photo to simulate a camera image" style={{ filter, transform: `scale(${Math.max(1, camera.focalLength / 50 * (camera.sensor === 'aps-c' ? 1.5 : 1))})` }} />}
          {isScene && !image && <div className="media-message"><span className="loading-dot" /><p>{error || text.scene}</p></div>}
          {isScene && source === 'scene2d' && image && <LayeredSceneCanvas scene={scene} background={image} camera={camera} pauseRendering={pause3dRendering} zoom={Math.max(1, camera.focalLength / 50 * (camera.sensor === 'aps-c' ? 1.5 : 1))} />}
          <div className="scene-shade" />
          <div className="iso-noise" style={{ opacity: Math.min(0.18, camera.filmGrain / 200 + isoNoiseAmount(exposure.iso) * 0.006) }} aria-hidden="true" />
          {highlightMask && <img className="highlight-mask" src={highlightMask} alt="" aria-hidden="true" />}
        </div>
        {camera.showGrid && <div className="composition-grid" aria-hidden="true"><span /><span /><i /><i /></div>}
        {(source === 'scene2d' || source === 'scene3d') && <button className={`focus-target ${focusAcquired ? 'focused' : ''}`} style={{ left: `${focusPoint.x * 100}%`, top: `${focusPoint.y * 100}%` }} aria-label="Move autofocus point" onClick={(event) => { event.stopPropagation(); onAF(); }}><span /></button>}
        {source === 'scene3d' && <div className="stage-note"><Aperture size={12} /> 3D PHOTO STAGE</div>}
        <div className="exposure-warning" aria-live="polite">{exposure.outOfRange ? (exposure.deviation > 0 ? 'OVER + ' : 'UNDER − ') + Math.abs(exposure.deviation).toFixed(1) + ' EV' : text.focus}</div>
        <div className="viewfinder-chrome top-left"><span className="live-indicator" /> {source === 'camera' ? 'REC' : isScene ? 'SIM' : 'PHOTO'}</div>
        <div className="viewfinder-chrome top-right">{camera.focalLength} mm <span className="chroma-line">/</span> f {exposure.aperture}</div>
        <div className="viewfinder-chrome bottom-left">{camera.sensor === 'full-frame' ? '35 mm' : 'APS-C'} <span className="chroma-line">·</span> ISO {exposure.iso}</div>
        <div className="viewfinder-chrome bottom-right">{formatShutter(exposure.shutter)} <span className="chroma-line">·</span> {exposure.deviation >= 0 ? '+' : ''}{exposure.deviation.toFixed(1)} EV</div>
        {dragging && <div className="drop-shade"><Upload size={30} /><span>{text.upload}</span></div>}
        {error && source === 'upload' && <div className="source-warning">{error}<button onClick={(event) => { event.stopPropagation(); onUseScene(); }}>{text.retry}</button></div>}
      </div>
      <div className="frame-caption">
        <div className="frame-caption-location"><span className="eyebrow">{isScene ? text.scene : source === 'camera' ? 'LIVE INPUT' : 'IMAGE EFFECTS'}</span><span className="location-name">{isScene ? scene.location[language] : source === 'camera' ? 'Device camera' : 'Local photo'}</span></div>
        <div className="caption-divider" />
        <div className="meter-pill"><span>{text.meter}</span><strong className={exposure.outOfRange ? 'meter-alert' : ''}>{exposure.deviation > 0 ? '+' : ''}{exposure.deviation.toFixed(1)} <small>EV</small></strong></div>
        <div className="meter-scale"><span /><b /></div>
        <button className="focus-pill" onClick={onAF}><Focus size={13} /><span>AF-S</span></button>
        <span className="frame-hint">{text.hint}</span>
      </div>
      <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a photo" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = ''; }} />
    </div>
  );
}
