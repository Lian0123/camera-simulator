import { SCENES } from '../camera/scenes';

export const SCENE_PACK_CACHE = 'scene-packs-v1';

const scenePackFiles = [...new Set(SCENES.flatMap((scene) => [scene.stageImage, ...scene.stageFiles]))];

export async function getOfflineSceneProgress() {
  if (!('caches' in globalThis)) return { ready: false, saved: 0, total: scenePackFiles.length };
  const cache = await caches.open(SCENE_PACK_CACHE);
  const matches = await Promise.all(scenePackFiles.map((url) => cache.match(new URL(url, document.baseURI).href)));
  const saved = matches.filter(Boolean).length;
  return { ready: saved === scenePackFiles.length, saved, total: scenePackFiles.length };
}

export async function downloadOfflineScenes(signal: AbortSignal, onProgress: (saved: number, total: number) => void) {
  if (!('caches' in globalThis)) throw new Error('OFFLINE_CACHE_UNAVAILABLE');
  const cache = await caches.open(SCENE_PACK_CACHE);
  let saved = 0;
  let nextFile = 0;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort, { once: true });
  const worker = async () => {
    while (true) {
      controller.signal.throwIfAborted();
      const index = nextFile++;
      if (index >= scenePackFiles.length) return;
      const absoluteUrl = new URL(scenePackFiles[index], document.baseURI).href;
      const existing = await cache.match(absoluteUrl);
      if (!existing) {
        const response = await fetch(absoluteUrl, { signal: controller.signal, credentials: 'same-origin' });
        if (!response.ok) throw new Error('OFFLINE_DOWNLOAD_FAILED');
        await cache.put(absoluteUrl, response);
      }
      saved += 1;
      onProgress(saved, scenePackFiles.length);
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(4, scenePackFiles.length) }, worker));
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    signal.removeEventListener('abort', abort);
  }
  return scenePackFiles.length;
}
