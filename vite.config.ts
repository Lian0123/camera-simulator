import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const offlineShellPlugin: Plugin = {
  name: 'stillframe-offline-shell',
  apply: 'build',
  async writeBundle(options) {
    const output = resolve(options.dir ?? 'dist');
    const html = await readFile(resolve(output, 'index.html'), 'utf8');
    const assets = [...html.matchAll(/(?:src|href)="([^\"]+\.(?:js|css))"/g)].map((match) => new URL(match[1], 'https://pages.invalid').pathname);
    if (assets.length < 2) throw new Error('Could not find the built JavaScript and CSS needed for offline use.');
    const cacheHash = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 12);
    const swPath = resolve(output, 'sw.js');
    const sw = await readFile(swPath, 'utf8');
    await writeFile(swPath, sw.replace('__APP_CACHE_NAME__', `stillframe-${cacheHash}`).replace('__APP_ASSETS__', JSON.stringify(assets)));
  },
};

export default defineConfig({
  base: '/camera-simulator/',
  plugins: [react(), offlineShellPlugin],
  test: { environment: 'jsdom', setupFiles: ['./src/testSetup.ts'], restoreMocks: true, exclude: ['e2e/**', 'node_modules/**', 'dist/**'] },
});
