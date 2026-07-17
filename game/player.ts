import { digAt, isWalkable, type Grid } from "./grid";

export type Direction = "up" | "down" | "left" | "right";

export interface PlayerState {
  x: number;
  y: number;
  direction: Direction;
}

export function createPlayer(x: number, y: number): PlayerState {
  return { x, y, direction: "down" };
}

const DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

// Función pura: dado el estado actual y la grilla, devuelve el nuevo
// estado del jugador. La grilla se muta (cavar es un efecto de moverse
// sobre tierra), pero el jugador nunca se muta in-place.
export function movePlayer(
  state: PlayerState,
  grid: Grid,
  direction: Direction
): PlayerState {
  const { dx, dy } = DELTA[direction];
  const targetX = state.x + dx;
  const targetY = state.y + dy;

  if (!isWalkable(grid, targetX, targetY)) {
    return { ...state, direction };
  }

  digAt(grid, targetX, targetY);
  return { x: targetX, y: targetY, direction };
}
