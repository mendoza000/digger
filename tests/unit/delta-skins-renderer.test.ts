import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { computeSkinScreenStyle, bundledSkinStatusMessage, unsupportedSkinOperations } from '../../components/retro-console/DeltaSkinRenderer';
import { isTouchCompactViewport, selectSkinConfiguration } from '../../lib/delta-skins/orientation';

test('bundled Candybar metadata uses exact orientation screen frames and bundled PNG variants', () => {
  const info = JSON.parse(readFileSync('public/skins/candybar/info.json', 'utf8'));
  const portrait = info.representations.iphone.edgeToEdge.portrait;
  const landscape = info.representations.iphone.edgeToEdge.landscape;
  expect(portrait.mappingSize).toEqual({ width: 1320, height: 2868 });
  expect(portrait.screens[0].outputFrame).toEqual({ x: 180, y: 454, width: 960, height: 864 });
  expect(landscape.screens[0].outputFrame).toEqual({ x: 874, y: 144, width: 1120, height: 1008 });
  expect(new Set(Object.values(portrait.assets))).toEqual(new Set(['iphone_edgetoedge_portrait.png']));
});

test('screen placement scales metadata coordinates uniformly and identifies unsupported Candybar actions', () => {
  expect(computeSkinScreenStyle({ x: 180, y: 454, width: 960, height: 864 }, { width: 1320, height: 2868 })).toEqual({ left: '13.636%', top: '15.83%', width: '72.727%', height: '30.126%' });
  expect(unsupportedSkinOperations(['up', 'start', 'select', 'menu', 'quickSave', 'fastForward'])).toEqual(['start', 'select', 'menu', 'quickSave', 'fastForward']);
});

test('bundled status message reports every unsupported Candybar input in both orientations', () => {
  const info = JSON.parse(readFileSync('public/skins/candybar/info.json', 'utf8'));
  for (const orientation of ['portrait', 'landscape']) {
    const config = info.representations.iphone.edgeToEdge[orientation];
    const inputs = config.items.flatMap((item: { inputs: string[] | Record<string, string | string[]> }) => Array.isArray(item.inputs) ? item.inputs : Object.values(item.inputs).flatMap(value => Array.isArray(value) ? value : [value]));
    const unsupported = unsupportedSkinOperations(inputs);
    const message = bundledSkinStatusMessage(config);
    expect(unsupported).toEqual(expect.arrayContaining(['start', 'select', 'menu', 'quickSave', 'quickLoad', 'fastForward', 'toggleFastForward']));
    for (const operation of ['start', 'select', 'menu', 'quickSave', 'quickLoad', 'fastForward', 'toggleFastForward']) {
      expect(message).toMatch(new RegExp(`\\b${operation}\\b`));
    }
    for (const operation of ['up', 'down', 'left', 'right', 'a', 'b']) {
      expect(message).not.toMatch(new RegExp(`\\b${operation}\\b`));
    }
  }
});

test('touch skin gate requires touch and the existing compact breakpoints', () => {
  expect(isTouchCompactViewport(0, 390, 844)).toBe(false);
  expect(isTouchCompactViewport(0, 1200, 500)).toBe(false);
  expect(isTouchCompactViewport(1, 390, 844)).toBe(true);
  expect(isTouchCompactViewport(1, 844, 390)).toBe(true);
  expect(isTouchCompactViewport(1, 900, 700)).toBe(false);
});

test('missing imported landscape uses bundled landscape and reports fallback', () => {
  const bundled = JSON.parse(readFileSync('public/skins/candybar/info.json', 'utf8')).representations.iphone.edgeToEdge;
  const importedPortrait = { 'iphone.edgeToEdge.portrait': bundled.portrait };
  const selected = selectSkinConfiguration(importedPortrait, bundled, 'landscape');
  expect(selected.config).toBe(bundled.landscape);
  expect(selected.fallback).toBe(true);
  expect(selected.fallbackMessage).toBe('Landscape unavailable; using Candybar landscape layout.');
});

test('desktop HUD centers within the full-width game stage', () => {
  const css = readFileSync('app/globals.css', 'utf8');
  const hudRule = css.match(/\.game-hud\s*\{([^}]+)\}/)?.[1] ?? '';
  expect(hudRule.replace(/\\s/g, '')).toMatch(/margin-inline:auto|margin:\\s*[^;]*auto/);
});

test('mobile console fills viewport by cropping only the proportionally scaled outer skin', () => {
  const css = readFileSync('app/globals.css', 'utf8');
  const consoleRule = css.match(/\.play-page\.touch-skin-enabled \.game-console\s*\{([^}]+)\}/)?.[1] ?? '';
  expect(consoleRule).toContain('width:max(100vw,var(--skin-fit-width))');
  expect(consoleRule).toContain('aspect-ratio:var(--skin-width) / var(--skin-height)');
  expect(consoleRule).not.toContain('max-height:100dvh');
  const mobileRule = css.match(/\.game-screen\s*\{([^}]+)\}/g)?.at(-1);
  expect(mobileRule).toContain('object-fit: contain');
  expect(mobileRule).toContain('object-position: center');
  expect(mobileRule).toContain('background: #000');
});
