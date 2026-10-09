import { unzipSync } from 'fflate';

export type SkinFrame = { x: number; y: number; width: number; height: number };
export type SkinInput = string[] | Record<string, string | string[]>;
type EdgeSet = Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
type SkinItem = { inputs: SkinInput; frame: SkinFrame; asset?: string; extendedEdges?: EdgeSet; [key: string]: unknown };
type SkinScreen = { inputFrame: SkinFrame; outputFrame: SkinFrame; [key: string]: unknown };
export type SkinConfig = { name: string; mappingSize: { width: number; height: number }; assets: Record<string, string>; items: SkinItem[]; screens: SkinScreen[]; extendedEdges: EdgeSet; translucent?: boolean };
export type NormalizedSkin = { configurations: Record<string, SkinConfig>; assets: string[]; assetData: Record<string, Uint8Array>; configurationFor: (device: string, representation: string, orientation: 'portrait' | 'landscape') => SkinConfig };
type JsonObject = Record<string, unknown>;
const MAX_ARCHIVE_BYTES = 32 * 1024 * 1024;
const MAX_ENTRIES = 512;
const MAX_EXPANDED_BYTES = 64 * 1024 * 1024;
const isObject = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null && !Array.isArray(value);
function safeAsset(path: unknown): string {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') || path.includes(':') || path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error(`Unsafe or invalid asset path: ${String(path)}`);
  if (!path.toLowerCase().endsWith('.png')) throw new Error(`Unsupported asset format: ${path}`);
  return path;
}
function preflightZip(bytes: Uint8Array): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u32 = (offset: number) => view.getUint32(offset, true);
  let eocd = -1;
  for (let offset = Math.max(0, bytes.length - 65557); offset <= bytes.length - 22; offset++) if (u32(offset) === 0x06054b50) eocd = offset;
  if (eocd < 0) throw new Error('Invalid Delta skin ZIP archive');
  if (view.getUint16(eocd + 4, true) !== 0 || view.getUint16(eocd + 6, true) !== 0) throw new Error('Unsupported multi-disk ZIP archive');
  const count = view.getUint16(eocd + 10, true);
  const centralSize = u32(eocd + 12); const centralOffset = u32(eocd + 16);
  if (count === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw new Error('Unsupported ZIP64 Delta skin archive');
  if (count > MAX_ENTRIES) throw new Error('Delta skin archive has too many entries');
  if (centralOffset + centralSize > eocd || centralOffset + centralSize > bytes.length) throw new Error('Invalid ZIP central directory');
  let offset = centralOffset; let expanded = 0; const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (offset + 46 > centralOffset + centralSize || u32(offset) !== 0x02014b50) throw new Error('Invalid ZIP central directory entry');
    const compressed = u32(offset + 20); const uncompressed = u32(offset + 24);
    if (compressed === 0xffffffff || uncompressed === 0xffffffff) throw new Error('Unsupported ZIP64 Delta skin entry');
    const nameLength = view.getUint16(offset + 28, true); const extraLength = view.getUint16(offset + 30, true); const commentLength = view.getUint16(offset + 32, true);
    if (offset + 46 + nameLength + extraLength + commentLength > centralOffset + centralSize) throw new Error('Invalid ZIP central directory entry');
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (names.has(name)) throw new Error(`Duplicate ZIP entry: ${name}`);
    names.add(name);
    expanded += uncompressed;
    if (expanded > MAX_EXPANDED_BYTES) throw new Error('Delta skin archive expands beyond size limit');
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (offset !== centralOffset + centralSize) throw new Error('Invalid ZIP central directory size');
}
function finitePositive(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value > 0; }
function validFrame(value: unknown, label: string): SkinFrame {
  if (!isObject(value) || !['x', 'y', 'width', 'height'].every(key => typeof value[key] === 'number' && Number.isFinite(value[key])) || !finitePositive(value.width) || !finitePositive(value.height)) throw new Error(`Invalid ${label} frame`);
  return { x: value.x as number, y: value.y as number, width: value.width, height: value.height };
}
function parseEdges(value: unknown): EdgeSet {
  if (value === undefined) return {};
  if (!isObject(value)) throw new Error('Invalid extendedEdges');
  const result: EdgeSet = {};
  for (const side of ['top', 'right', 'bottom', 'left'] as const) if (value[side] !== undefined) {
    const amount = value[side];
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) throw new Error(`Invalid extendedEdges.${side}`);
    result[side] = amount;
  }
  return result;
}
function normalizeConfig(raw: unknown, name: string, files: Record<string, Uint8Array>): SkinConfig {
  if (!isObject(raw) || !isObject(raw.mappingSize) || !finitePositive(raw.mappingSize.width) || !finitePositive(raw.mappingSize.height) || !isObject(raw.assets) || !Array.isArray(raw.items) || !Array.isArray(raw.screens)) throw new Error(`Unsupported or malformed ${name} configuration`);
  const assets: Record<string, string> = {};
  for (const [variant, value] of Object.entries(raw.assets)) {
    const asset = safeAsset(value);
    if (!files[asset]) throw new Error(`Missing skin asset: ${asset}`);
    assets[variant] = asset;
  }
  const items = raw.items.map((value): SkinItem => {
    if (!isObject(value) || !Array.isArray(value.inputs) && !isObject(value.inputs)) throw new Error('Invalid item inputs');
    let inputs: SkinInput;
    if (Array.isArray(value.inputs)) {
      if (!value.inputs.every(input => typeof input === 'string')) throw new Error('Invalid input identifier');
      inputs = [...value.inputs] as string[];
    } else {
      const mapped: Record<string, string | string[]> = {};
      for (const [key, input] of Object.entries(value.inputs)) {
        if (typeof input === 'string') mapped[key] = input;
        else if (Array.isArray(input) && input.every(entry => typeof entry === 'string')) mapped[key] = [...input] as string[];
        else throw new Error(`Invalid directional input ${key}`);
      }
      inputs = mapped;
    }
    const itemAsset = value.asset === undefined ? undefined : safeAsset(value.asset);
    if (itemAsset && !files[itemAsset]) throw new Error(`Missing skin asset: ${itemAsset}`);
    return { ...value, inputs, frame: validFrame(value.frame, 'item'), asset: itemAsset, extendedEdges: parseEdges(value.extendedEdges) };
  });
  const screens = raw.screens.map((value): SkinScreen => {
    if (!isObject(value)) throw new Error('Invalid screen');
    return { ...value, inputFrame: validFrame(value.inputFrame, 'screen input'), outputFrame: validFrame(value.outputFrame, 'screen output') };
  });
  return { name, mappingSize: { width: raw.mappingSize.width, height: raw.mappingSize.height }, assets, items, screens, extendedEdges: parseEdges(raw.extendedEdges), translucent: typeof raw.translucent === 'boolean' ? raw.translucent : undefined };
}
export async function parseDeltaSkin(bytes: Uint8Array): Promise<NormalizedSkin> {
  if (bytes.byteLength > MAX_ARCHIVE_BYTES) throw new Error('Delta skin archive exceeds size limit');
  preflightZip(bytes);
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(bytes); } catch { throw new Error('Invalid Delta skin ZIP archive'); }
  for (const path of Object.keys(files)) {
    if (path.startsWith('__MACOSX/') || path === '.DS_Store' || path.endsWith('/.DS_Store')) continue;
    if (path.includes('\\') || path.startsWith('/') || path.split('/').some(part => part === '..' || part === '.')) throw new Error(`Unsafe archive entry: ${path}`);
  }
  const info = files['info.json'];
  if (!info) throw new Error('Delta skin ZIP is missing root info.json');
  let raw: unknown;
  try { raw = JSON.parse(new TextDecoder().decode(info)); } catch { throw new Error('Malformed Delta skin info.json'); }
  if (!isObject(raw) || !isObject(raw.representations)) throw new Error('Unsupported Delta skin format: missing representations');
  const configurations: Record<string, SkinConfig> = {}; const allAssets = new Set<string>();
  for (const [device, value] of Object.entries(raw.representations)) if (isObject(value)) for (const [representation, orientations] of Object.entries(value)) if (isObject(orientations)) {
    for (const orientation of ['portrait', 'landscape'] as const) if (orientations[orientation] !== undefined) {
      const config = normalizeConfig(orientations[orientation], `${device}.${representation}.${orientation}`, files);
      configurations[`${device}.${representation}.${orientation}`] = config;
      Object.values(config.assets).forEach(asset => allAssets.add(asset));
    }
  }
  return { configurations, assets: [...allAssets], assetData: Object.fromEntries([...allAssets].map(asset => [asset, files[asset]])), configurationFor: (device, representation, orientation) => {
    const config = configurations[`${device}.${representation}.${orientation}`];
    if (!config) throw new Error(`Missing ${orientation} configuration for ${device}.${representation}`);
    return config;
  } };
}
export function scaleFrame(frame: SkinFrame, width: number, height: number): SkinFrame {
  if (!finitePositive(width) || !finitePositive(height)) throw new Error('Target dimensions must be positive');
  const scale = Math.min(width / frame.width, height / frame.height);
  return { x: frame.x * scale, y: frame.y * scale, width: frame.width * scale, height: frame.height * scale };
}
export function extendedHitbox(frame: SkinFrame, itemEdges: EdgeSet = {}, orientationEdges: EdgeSet = {}): SkinFrame {
  const amount = (side: keyof EdgeSet) => itemEdges[side] ?? orientationEdges[side] ?? 0;
  const top = amount('top'); const right = amount('right'); const bottom = amount('bottom'); const left = amount('left');
  return { x: frame.x - left, y: frame.y - top, width: frame.width + left + right, height: frame.height + top + bottom };
}
export function mapSkinInputs(inputs: SkinInput): SkinInput { return Array.isArray(inputs) ? [...inputs] : Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value])); }
