import { PALETTE, type PaletteColor } from "./palette";
import { CELL_SIZE } from "./constants";
import type { CellState, Grid } from "./grid";
import type { Enemy } from "./enemies";
import type { Item } from "./items";
import type { Bullet } from "./bullets";
import type { GoldBag } from "./goldBags";
import type { PlayerState } from "./player";

// Matriz de píxeles: cada string es una fila, cada carácter una celda.
// "." = transparente, cualquier otro carácter se resuelve vía colorMap.
export type SpriteMatrix = string[];

export const PLAYER_SPRITE: SpriteMatrix = [
  "..000..",
  ".01110.",
  "0111110",
  "0121210",
  "0111110",
  "..0.0..",
  ".0...0.",
];

const PLAYER_COLOR_MAP: Record<string, PaletteColor> = {
  "0": "playerDark",
  "1": "player",
  "2": "playerDetail",
};

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteMatrix,
  originX: number,
  originY: number,
  pixelSize: number,
  colorMap: Record<string, PaletteColor>
): void {
  for (let row = 0; row < sprite.length; row++) {
    const line = sprite[row];
    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      if (char === ".") continue;

      const colorKey = colorMap[char];
      if (!colorKey) continue;

      ctx.fillStyle = PALETTE[colorKey];
      ctx.fillRect(
        originX + col * pixelSize,
        originY + row * pixelSize,
        pixelSize,
        pixelSize
      );
    }
  }
}

export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  pixelSize: number
): void {
  drawSprite(ctx, PLAYER_SPRITE, originX, originY, pixelSize, PLAYER_COLOR_MAP);
}

export function drawPlayerAtCell(
  ctx: CanvasRenderingContext2D,
  player: PlayerState
): void {
  drawPlayerSprite(ctx, player.x * CELL_SIZE + 1, player.y * CELL_SIZE + 1, 2);
}

// --- Grilla ---

export const CELL_COLOR: Record<CellState, PaletteColor> = {
  dirt: "dirt",
  tunnel: "tunnel",
  wall: "wall",
};

export function drawGrid(ctx: CanvasRenderingContext2D, grid: Grid): void {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      ctx.fillStyle = PALETTE[CELL_COLOR[grid[y][x]]];
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

// --- Enemigos ---

const ENEMY_SPRITE: SpriteMatrix = [
  "..000..",
  ".01110.",
  "0111110",
  "0122210",
  "0111110",
  "..0.0..",
  ".0...0.",
];

const NOBBIN_COLOR_MAP: Record<string, PaletteColor> = {
  "0": "black",
  "1": "enemyNobbin",
  "2": "black",
};

const HOBBIN_COLOR_MAP: Record<string, PaletteColor> = {
  "0": "black",
  "1": "enemyHobbin",
  "2": "black",
};

export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
  const colorMap = enemy.type === "nobbin" ? NOBBIN_COLOR_MAP : HOBBIN_COLOR_MAP;
  drawSprite(
    ctx,
    ENEMY_SPRITE,
    enemy.x * CELL_SIZE + 1,
    enemy.y * CELL_SIZE + 1,
    2,
    colorMap
  );
}

// --- Ítems ---

const EMERALD_SPRITE: SpriteMatrix = ["..0..", ".000.", "00000", ".000.", "..0.."];
// La moneda mantiene el amarillo brillante y suma un brillito blanco: se
// lee como "moneda" y no como una bolsa (formas y colores distintos).
const GOLD_SPRITE: SpriteMatrix = [".000.", "00100", "00000", "00000", ".000."];

const EMERALD_COLOR_MAP: Record<string, PaletteColor> = { "0": "emerald" };
const GOLD_COLOR_MAP: Record<string, PaletteColor> = { "0": "gold", "1": "bullet" };

const ITEM_INSET = (CELL_SIZE - 5 * 2) / 2;

export function drawItem(ctx: CanvasRenderingContext2D, item: Item): void {
  const sprite = item.type === "emerald" ? EMERALD_SPRITE : GOLD_SPRITE;
  const colorMap = item.type === "emerald" ? EMERALD_COLOR_MAP : GOLD_COLOR_MAP;
  drawSprite(
    ctx,
    sprite,
    item.x * CELL_SIZE + ITEM_INSET,
    item.y * CELL_SIZE + ITEM_INSET,
    2,
    colorMap
  );
}

// --- Bala ---

const BULLET_SPRITE: SpriteMatrix = ["11", "11"];
const BULLET_COLOR_MAP: Record<string, PaletteColor> = { "1": "bullet" };
const BULLET_INSET = (CELL_SIZE - 2 * 4) / 2;

export function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet): void {
  drawSprite(
    ctx,
    BULLET_SPRITE,
    bullet.x * CELL_SIZE + BULLET_INSET,
    bullet.y * CELL_SIZE + BULLET_INSET,
    4,
    BULLET_COLOR_MAP
  );
}

// --- Bolsa de oro ---

// Silueta de saco atado (cuello angosto arriba, cuerpo redondeado abajo)
// en tonos bronce/marrón — distinta en forma Y color de la moneda, para
// que no se confundan de un vistazo.
const GOLD_BAG_SPRITE: SpriteMatrix = [
  "..111..",
  "..000..",
  ".00000.",
  "0000000",
  "0000000",
  ".00000.",
  "..000..",
];
const GOLD_BAG_COLOR_MAP: Record<string, PaletteColor> = {
  "0": "playerDark",
  "1": "dirtDark",
};

export function drawGoldBag(ctx: CanvasRenderingContext2D, bag: GoldBag): void {
  drawSprite(
    ctx,
    GOLD_BAG_SPRITE,
    bag.x * CELL_SIZE + 1,
    bag.y * CELL_SIZE + 1,
    2,
    GOLD_BAG_COLOR_MAP
  );
}
