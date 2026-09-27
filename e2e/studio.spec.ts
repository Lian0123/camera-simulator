import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function openStudio(page: import('@playwright/test').Page) {
  await page.goto('/camera-simulator/');
  await page.getByLabel('Language').selectOption('en');
}

test('loads the camera studio at its GitHub Pages project path', async ({ page }, testInfo) => {
  await openStudio(page);
  await expect(page.getByRole('heading', { name: 'After the rain' })).toBeVisible();
  await expect(page.locator('[data-shutter]')).toBeEnabled();
  await expect(page.getByRole('slider', { name: 'Aperture' })).toBeVisible();
  if (testInfo.project.name === 'chromium') {
    await mkdir('docs/screenshots', { recursive: true });
    await page.screenshot({ path: 'docs/screenshots/desktop-studio.png', fullPage: true });
  }
});

test('switches between scene view and the camera settings panel', async ({ page }) => {
  await openStudio(page);
  if (await page.locator('.mobile-scenes button:visible').count()) await page.locator('.mobile-scenes button:visible').nth(1).click();
  else await page.locator('.scene-card').nth(1).click();
  await expect(page.getByRole('heading', { name: 'Window light' })).toBeVisible();
  await page.locator('.source-switcher .source-button').nth(1).click();
  await expect(page.locator('.three-stage')).toBeVisible();
  if (await page.locator('.mobile-panel-grab').isVisible()) {
    const panel = page.locator('.mobile-panel-grab button');
    if (await panel.getAttribute('aria-expanded') === 'false') await panel.click();
  }
  const manual = page.locator('.mode-segment button').nth(3);
  await manual.click();
  await expect(manual).toHaveAttribute('aria-pressed', 'true');
});

test('adapts the workbench to a mobile viewport', async ({ page, isMobile }) => {
  await openStudio(page);
  await expect(page.locator('[data-shutter]')).toBeVisible();
  if (isMobile) {
    const panel = page.locator('.mobile-panel-grab button');
    await panel.click();
    await expect(panel).toHaveAttribute('aria-expanded', 'true');
  }
});

test('captures, reviews, edits and exports an image locally', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The mobile capture and export entry point is exercised separately.');
  await openStudio(page);
  await page.locator('[data-shutter]').click();
  await expect(page.locator('.film-frame')).toHaveCount(1);
  await expect(page.locator('.review-image')).toBeVisible();
  await page.reload();
  await page.getByLabel('Language').selectOption('en');
  await expect(page.locator('.review-image')).toBeVisible();
  await page.getByRole('tab').nth(2).click();
  await expect(page.locator('.develop-panel')).toBeVisible();
  await page.locator('.preset-chip').nth(4).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled();
  await page.getByRole('button', { name: 'Redo' }).click();
  await page.getByRole('tab').nth(1).click();
  await page.locator('.download-action').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel(/Watermark/).locator('..').locator('input').fill('Stillframe test');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export image|Save photo/ }).last().click();
  expect((await download).suggestedFilename()).toMatch(/\.jpg$/);
});

test('a first online visit pre-caches the app and scene for offline use', async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== 'chromium' || isMobile, 'Offline service-worker smoke test runs once in desktop Chromium.');
  await openStudio(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'After the rain' })).toBeVisible();
});

test('uses the image picker locally and reports a damaged image', async ({ page }) => {
  await openStudio(page);
  const imageFile = { name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRysAAAAASUVORK5CYII=', 'base64') };
  const imageChooser = page.waitForEvent('filechooser');
  await page.locator('.source-switcher .source-button').nth(2).click();
  await (await imageChooser).setFiles(imageFile);
  await expect(page.locator('.upload-photo')).toBeVisible();
  const brokenChooser = page.waitForEvent('filechooser');
  await page.locator('.source-switcher .source-button').nth(2).click();
  await (await brokenChooser).setFiles({ ...imageFile, name: 'broken.png', buffer: Buffer.from('not a png') });
  await expect(page.getByRole('alert')).toContainText('could not be decoded');
});

test('shows a safe built-in scene fallback when camera permission is denied', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: async () => { throw new DOMException('Permission denied', 'NotAllowedError'); } },
  }));
  await openStudio(page);
  await page.locator('.source-switcher .source-button').nth(3).click();
  await page.getByRole('button', { name: 'Start camera' }).click();
  await expect(page.getByText(/Camera access is unavailable/)).toBeVisible();
  await page.getByRole('button', { name: 'Use a built-in scene' }).click();
  await expect(page.getByRole('heading', { name: 'After the rain' })).toBeVisible();
});

test('cancels a long exposure before it creates a photo', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Long-exposure cancellation is exercised on desktop.');
  await openStudio(page);
  await page.locator('.mode-segment button').nth(3).click();
  const shutterSpeed = page.getByRole('slider', { name: 'Shutter' });
  await shutterSpeed.focus();
  await shutterSpeed.press('End');
  await expect(page.getByText('30″', { exact: true })).toBeVisible();
  const shutter = page.locator('[data-shutter]');
  await shutter.click();
  await expect(shutter).toContainText('EXPOSING');
  await page.keyboard.press('Escape');
  await expect(page.locator('.toast[role="status"]')).toContainText('Exposure cancelled.');
  await expect(page.locator('.film-frame')).toHaveCount(0);
});

test('keeps the shutter visible without horizontal page overflow at 360 px', async ({ page, isMobile }) => {
  test.skip(!isMobile || page.viewportSize()?.width !== 360, 'This check targets the 360 px mobile project.');
  await openStudio(page);
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
    elements: Array.from(document.querySelectorAll<HTMLElement>('*')).map((node) => ({
      tag: node.tagName, className: String(node.className), left: Math.round(node.getBoundingClientRect().left), right: Math.round(node.getBoundingClientRect().right),
    })).filter((node) => node.left < -1 || node.right > document.documentElement.clientWidth + 1).slice(0, 12),
  }));
  expect(overflow.content, JSON.stringify(overflow.elements)).toBeLessThanOrEqual(overflow.viewport);
  await expect(page.locator('[data-shutter]')).toBeInViewport();
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/mobile-360.png', fullPage: true });
});

test('mobile can capture and open image export controls', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This check targets touch layouts.');
  await openStudio(page);
  await page.locator('[data-shutter]').click();
  await expect(page.locator('.review-image')).toBeVisible();
  await page.locator('.mobile-export-action').click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
