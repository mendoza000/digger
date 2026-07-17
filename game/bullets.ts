import { isTunnel, type Grid } from "./grid";
import type { Direction } from "./player";

export interface Bullet {
  x: number;
  y: number;
  direction: Direction;
}

const DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export function createBullet(x: number, y: number, direction: Direction): Bullet {
  return { x, y, direction };
}

// Avanza una celda; devuelve null si el siguiente paso no es túnel ya
// cavado (la bala se destruye contra tierra o pared — disparar nunca cava,
// eso es exclusivo de moverse).
export function advanceBullet(bullet: Bullet, grid: Grid): Bullet | null {
  const { dx, dy } = DELTA[bullet.direction];
  const nextX = bullet.x + dx;
  const nextY = bullet.y + dy;
  if (!isTunnel(grid, nextX, nextY)) return null;
  return { ...bullet, x: nextX, y: nextY };
}
