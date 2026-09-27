import { useEffect, useRef, useState } from 'react';
import type { CameraSettings, ResolvedExposure } from '../camera/types';
import { imageFromUrl } from '../camera/scenes';
import { renderDevelopedImage, type DevelopSettings } from '../camera/processor';

export function DevelopedPhoto({ src, camera, exposure, develop, className = '', alt = '', preserveCapturedBase = false }: {
  src: string; camera: CameraSettings; exposure: ResolvedExposure; develop: DevelopSettings; className?: string; alt?: string; preserveCapturedBase?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    void imageFromUrl(src).then((image) => {
      if (!active || !canvasRef.current) return;
      const output = renderDevelopedImage(image, image.naturalWidth, image.naturalHeight, camera, { ...exposure, deviation: 0, outOfRange: false }, develop, 'preview', preserveCapturedBase);
      const canvas = canvasRef.current; canvas.width = output.width; canvas.height = output.height;
      const context = canvas.getContext('2d'); context?.drawImage(output, 0, 0);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [camera, develop, exposure, preserveCapturedBase, src]);
  return failed ? <img src={src} alt={alt} className={className} /> : <canvas ref={canvasRef} aria-label={alt || 'Developed photograph preview'} role="img" className={className} />;
}
