import { expect, test } from '@playwright/test';
import { zipSync } from 'fflate';

async function start(page: import('@playwright/test').Page) {
  await page.addInitScript(() => sessionStorage.setItem('digger.player', JSON.stringify({ id: 1, username: 'tester' })));
  await page.route('**/api/config/**', route => route.fulfill({ json: { dificultad_preferida: 'medio', sonido_activo: false } }));
  await page.goto('/play');
  await page.getByRole('button', { name: 'Jugar' }).click();
  await expect(page.locator('.game-screen')).toBeVisible();
}

test('mobile viewport enables safe-area display', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile viewport metadata');
  await page.goto('/play');
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/);
});

test('mobile renderer uses orientation metadata without replacing the game canvas', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile emulation only');
  await page.addInitScript(() => sessionStorage.setItem('digger.player', JSON.stringify({ id: 1, username: 'tester' })));
  await page.route('**/api/config/**', route => route.fulfill({ json: { dificultad_preferida: 'medio', sonido_activo: false } }));
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/play');
  await expect(page.getByRole('status')).toContainText('Candybar');
  await expect(page.getByRole('status')).toContainText('toggleFastForward, fastForward, quickSave, quickLoad');
  await page.getByRole('button', { name: 'Jugar' }).click();
  await expect(page.locator('.game-screen')).toBeVisible();
  await expect(page.locator('.play-page')).toHaveClass(/touch-skin-enabled/);
  await expect(page.locator('.game-controls')).toBeVisible();
  const canvas = page.locator('.game-screen');
  const renderer = page.getByTestId('delta-skin-renderer');
  const frame = page.locator('.delta-skin-screen-frame');
  const controls = page.locator('.game-touch-button');
  const assertNonzeroBounds = async () => {
    for (const locator of [renderer, frame, canvas, controls.first()]) {
      const bounds = await locator.boundingBox();
      expect(bounds?.width).toBeGreaterThan(0);
      expect(bounds?.height).toBeGreaterThan(0);
    }
  };
  const assertArtworkCoversStage = async (skinWidth: number, skinHeight: number) => {
    const artwork = await renderer.boundingBox();
    const stage = await page.locator('.game-stage').boundingBox();
    expect(artwork).not.toBeNull();
    expect(stage).not.toBeNull();
    expect(artwork!.width / artwork!.height).toBeCloseTo(skinWidth / skinHeight, 3);
    expect(artwork!.x).toBeLessThanOrEqual(stage!.x + 1);
    expect(artwork!.y).toBeLessThanOrEqual(stage!.y + 1);
    expect(artwork!.x + artwork!.width).toBeGreaterThanOrEqual(stage!.x + stage!.width - 1);
    expect(artwork!.y + artwork!.height).toBeGreaterThanOrEqual(stage!.y + stage!.height - 1);
  };
  await assertNonzeroBounds();
  await assertArtworkCoversStage(1320, 2868);
  const continuityToken = `canvas-${Date.now()}`;
  await canvas.evaluate((node, token) => { node.dataset.continuity = token; }, continuityToken);
  const dimensions = await canvas.evaluate(node => ({ width: (node as HTMLCanvasElement).width, height: (node as HTMLCanvasElement).height }));
  await expect(page.getByTestId('delta-skin-renderer')).toHaveAttribute('data-mapping-width', '1320');
  await expect(canvas).toHaveCSS('object-fit', 'contain');
  await expect(canvas).toHaveCSS('object-position', '50% 50%');
  await expect(canvas).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(renderer).not.toHaveCSS('background-image', 'none');
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId('delta-skin-renderer')).toHaveAttribute('data-mapping-width', '2868');
  await assertNonzeroBounds();
  await assertArtworkCoversStage(2868, 1320);
  await expect(canvas).toHaveAttribute('data-continuity', continuityToken);
  expect(await canvas.evaluate(node => ({ width: (node as HTMLCanvasElement).width, height: (node as HTMLCanvasElement).height }))).toEqual(dimensions);
});

test('imported portrait-only skin falls back to bundled landscape without rotating portrait art', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile skin fallback');
  await page.addInitScript(() => sessionStorage.setItem('digger.player', JSON.stringify({ id: 1, username: 'tester' })));
  await page.route('**/api/config/**', route => route.fulfill({ json: {} }));
  await page.goto('/play');
  const portraitConfig = { name: 'Portrait', mappingSize: { width: 320, height: 640 }, assets: { large: 'portrait.png' }, items: [], screens: [], extendedEdges: {} };
  const info = JSON.stringify({ representations: { iphone: { edgeToEdge: { portrait: portraitConfig } } } });
  const archive = zipSync({ 'info.json': new TextEncoder().encode(info), 'portrait.png': new Uint8Array([1, 2, 3]) });
  await page.getByLabel('Import Delta skin').setInputFiles({ name: 'portrait-only.deltaskin', mimeType: 'application/zip', buffer: Buffer.from(archive) });
  await expect(page.getByRole('status')).toContainText('Skin imported.');
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByRole('status')).toContainText('Landscape unavailable; using Candybar landscape layout.');
  await page.getByRole('button', { name: 'Jugar' }).click();
  await expect(page.getByTestId('delta-skin-renderer')).toHaveAttribute('data-mapping-width', '2868');
  await expect(page.getByTestId('delta-skin-renderer')).toHaveAttribute('aria-label', 'Candybar (landscape fallback) game console');
  await expect(page.getByTestId('delta-skin-renderer')).toHaveCSS('background-image', /candybar/);
});

test('explicit PDF feedback survives an orientation change', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile emulation only');
  await page.addInitScript(() => sessionStorage.setItem('digger.player', JSON.stringify({ id: 1, username: 'tester' })));
  await page.route('**/api/config/**', route => route.fulfill({ json: { dificultad_preferida: 'medio', sonido_activo: false } }));
  await page.goto('/play');
  await page.getByLabel('Import Delta skin').setInputFiles({ name: 'invalid.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });
  await expect(page.getByRole('status')).toContainText('PDF Delta skins are not supported');
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByRole('status')).toHaveText('PDF Delta skins are not supported. Import a PNG-based .deltaskin archive.');
});

test('compact desktop without touch keeps the unskinned canvas presentation', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop no-touch regression');
  await page.setViewportSize({ width: 640, height: 900 });
  await start(page);
  await expect(page.locator('.play-page')).not.toHaveClass(/touch-skin-enabled/);
  await expect(page.locator('.game-controls')).toBeHidden();
  await expect(page.getByTestId('delta-skin-renderer')).toHaveCSS('background-image', 'none');
  const canvasBox = await page.locator('.game-screen').boundingBox();
  const hudBox = await page.locator('.game-hud').boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(hudBox).not.toBeNull();
  expect(canvasBox!.width).toBeLessThanOrEqual(640);
  expect(canvasBox!.height).toBeLessThanOrEqual(900);
  expect(canvasBox!.width / canvasBox!.height).toBeCloseTo(8 / 7, 2);
  expect(Math.abs((canvasBox!.x + canvasBox!.width / 2) - (hudBox!.x + hudBox!.width / 2))).toBeLessThanOrEqual(1);
});

test('desktop keeps the existing unskinned canvas presentation', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop presentation regression');
  await page.setViewportSize({ width: 1920, height: 1400 });
  await start(page);
  await expect(page.getByTestId('delta-skin-renderer')).toHaveCSS('display', 'flex');
  await expect(page.getByTestId('delta-skin-renderer')).toHaveCSS('background-image', 'none');
  await expect(page.locator('.game-screen')).toHaveAttribute('width', '256');
  await expect(page.locator('.game-screen')).toHaveAttribute('height', '224');
  const canvasBox = await page.locator('.game-screen').boundingBox();
  const hudBox = await page.locator('.game-hud').boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(hudBox).not.toBeNull();
  expect(canvasBox!.width).toBeGreaterThan(1024);
  expect(canvasBox!.width / canvasBox!.height).toBeCloseTo(8 / 7, 2);
  expect(canvasBox!.x).toBeGreaterThanOrEqual(0);
  expect(canvasBox!.x + canvasBox!.width).toBeLessThanOrEqual(1920);
  expect(Math.abs((canvasBox!.x + canvasBox!.width / 2) - (hudBox!.x + hudBox!.width / 2))).toBeLessThanOrEqual(1);
});
