import { expect, test } from '@playwright/test';
import { zipSync } from 'fflate';
import { extendedHitbox, mapSkinInputs, parseDeltaSkin, scaleFrame, type SkinFrame } from '../../lib/delta-skins';

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
function orientation(landscapeMode: boolean) {
  return {
    assets: { small: landscapeMode ? 'iphone_edgetoedge_landscape.png' : 'iphone_edgetoedge_portrait.png', medium: landscapeMode ? 'iphone_edgetoedge_landscape.png' : 'iphone_edgetoedge_portrait.png', large: landscapeMode ? 'iphone_edgetoedge_landscape.png' : 'iphone_edgetoedge_portrait.png' },
    items: Array.from({ length: 13 }, (_, index) => ({ inputs: index === 0 ? { up: 'up', down: 'down', left: 'left', right: 'right' } : [index === 3 ? 'a' : 'b'], frame: { x: 20 + index, y: 30, width: 100, height: 80 }, extendedEdges: { top: 2 } })),
    screens: [{ inputFrame: { x: 0, y: 0, width: 160, height: 144 }, outputFrame: landscapeMode ? { x: 874, y: 144, width: 1120, height: 1008 } : { x: 180, y: 454, width: 960, height: 864 } }],
    mappingSize: landscapeMode ? { width: 2868, height: 1320 } : { width: 1320, height: 2868 }, extendedEdges: { top: 0, bottom: 0, left: 0, right: 0 }, translucent: false,
  };
}
const portrait = orientation(false);
const landscape = orientation(true);
function archive(info: unknown, entries: Record<string, Uint8Array> = {}): Uint8Array {
  return zipSync({ 'info.json': new TextEncoder().encode(JSON.stringify(info)), 'iphone_edgetoedge_portrait.png': png, 'iphone_edgetoedge_landscape.png': png, ...entries });
}
function duplicateZipEntry(): Uint8Array {
  const bytes = zipSync({ 'aa.png': png, 'bb.png': png });
  const result = bytes.slice();
  const from = new TextEncoder().encode('bb.png'); const to = new TextEncoder().encode('aa.png');
  for (let i = 0; i <= result.length - from.length; i++) if (from.every((byte, index) => result[i + index] === byte)) result.set(to, i);
  return result;
}
function validInfo() {
  return { representations: { iphone: { edgeToEdge: { portrait, landscape } } } };
}
const frame: SkinFrame = { x: 10, y: 20, width: 100, height: 50 };

test('rejects invalid ZIP and malformed JSON independently', async () => {
  await expect(parseDeltaSkin(new Uint8Array([1, 2, 3]))).rejects.toThrow(/zip/i);
  await expect(parseDeltaSkin(zipSync({ 'info.json': new TextEncoder().encode('{') }))).rejects.toThrow(/json/i);
});

test('parses real-format archive metadata and resolves device and orientation', async () => {
  const skin = await parseDeltaSkin(archive(validInfo()));
  expect(skin.configurationFor('iphone', 'edgeToEdge', 'portrait').mappingSize).toEqual({ width: 1320, height: 2868 });
  expect(skin.configurationFor('iphone', 'edgeToEdge', 'landscape').mappingSize).toEqual({ width: 2868, height: 1320 });
  expect(skin.assets).toEqual(expect.arrayContaining(['iphone_edgetoedge_portrait.png', 'iphone_edgetoedge_landscape.png']));
  const p = skin.configurationFor('iphone', 'edgeToEdge', 'portrait');
  const l = skin.configurationFor('iphone', 'edgeToEdge', 'landscape');
  expect(p.screens[0]).toMatchObject({ inputFrame: { x: 0, y: 0, width: 160, height: 144 }, outputFrame: { x: 180, y: 454, width: 960, height: 864 } });
  expect(l.screens[0].outputFrame).toEqual({ x: 874, y: 144, width: 1120, height: 1008 });
  expect(p.items).toHaveLength(13);
  expect(p.items[0].inputs).toEqual({ up: 'up', down: 'down', left: 'left', right: 'right' });
  expect(extendedHitbox(p.items[0].frame, { top: 4 }, p.extendedEdges)).toEqual({ x: p.items[0].frame.x, y: p.items[0].frame.y - 4, width: p.items[0].frame.width, height: p.items[0].frame.height + 4 });
  await expect(parseDeltaSkin(archive({ representations: { iphone: { edgeToEdge: { portrait } } } })).then(s => s.configurationFor('iphone', 'edgeToEdge', 'landscape'))).rejects.toThrow(/missing/i);
});

test('rejects duplicate ZIP names and unsupported image formats', async () => {
  await expect(parseDeltaSkin(duplicateZipEntry())).rejects.toThrow(/duplicate/i);
  const pdf = orientation(false);
  pdf.assets.small = 'skin.pdf';
  await expect(parseDeltaSkin(archive({ representations: { iphone: { edgeToEdge: { portrait: pdf } } }, })).then(() => undefined)).rejects.toThrow(/unsupported asset format/i);
});

test('scales frames uniformly and fits inside target preserving aspect ratio', () => {
  expect(scaleFrame(frame, 400, 300)).toEqual({ x: 40, y: 80, width: 400, height: 200 });
  expect(scaleFrame({ x: 0, y: 0, width: 160, height: 144 }, 300, 300)).toEqual({ x: 0, y: 0, width: 300, height: 270 });
});

test('item extended edges override orientation defaults and preserve unspecified sides', () => {
  expect(extendedHitbox(frame, { top: 5, left: 2 }, { top: 9, right: 4, bottom: 3, left: 1 })).toEqual({ x: 8, y: 15, width: 106, height: 58 });
});

test('retains single, combined, and directional input mappings', () => {
  expect(mapSkinInputs(['a'])).toEqual(['a']);
  expect(mapSkinInputs(['a', 'b'])).toEqual(['a', 'b']);
  expect(mapSkinInputs({ up: ['up', 'upLeft'], down: ['down', 'downRight'] })).toEqual({ up: ['up', 'upLeft'], down: ['down', 'downRight'] });
});
