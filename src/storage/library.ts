import type { CaptureRecord } from '../camera/types';

const DB_NAME = 'stillframe-studio';
const STORE_NAME = 'captures';
const MEMORY_FALLBACK: CaptureRecord[] = [];

function openDb(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB is unavailable.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the photo library.'));
  });
}

export async function saveCapture(record: CaptureRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Storage is full or unavailable.'));
    tx.onabort = () => reject(tx.error ?? new Error('The photo could not be saved.'));
  }).finally(() => db.close());
}

export async function listCaptures(): Promise<CaptureRecord[]> {
  try {
    const db = await openDb();
    return await new Promise<CaptureRecord[]>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve((request.result as CaptureRecord[]).sort((a, b) => b.createdAt - a.createdAt));
      request.onerror = () => reject(request.error);
    }).finally(() => db.close());
  } catch { return MEMORY_FALLBACK.slice(); }
}

export async function deleteCapture(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite'); tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  }).finally(() => db.close());
}

export async function clearCaptures(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite'); tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  }).finally(() => db.close());
}
