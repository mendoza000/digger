import { digAt, isTunnel, isWalkable, type Grid } from "./grid";
import type { PlayerState } from "./player";

export type EnemyType = "nobbin" | "hobbin";

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
}

export const ENEMY_POINTS: Record<EnemyType, number> = {
  nobbin: 100,
  hobbin: 200,
};

interface EnemyBehavior {
  canDig: boolean;
}

// Nobbin cava tierra al avanzar (igual que el jugador); hobbin solo puede
// moverse por túneles ya cavados.
const ENEMY_BEHAVIOR: Record<EnemyType, EnemyBehavior> = {
  nobbin: { canDig: true },
  hobbin: { canDig: false },
};

// Factory Method: centraliza cómo se construye cada tipo de enemigo, así
// el engine no ramifica con ifs cada vez que necesita crear uno.
export const EnemyFactory = {
  create(id: number, type: EnemyType, x: number, y: number): Enemy {
    return { id, type, x, y };
  },
};

function canEnter(type: EnemyType, grid: Grid, x: number, y: number): boolean {
  return ENEMY_BEHAVIOR[type].canDig
    ? isWalkable(grid, x, y)
    : isTunnel(grid, x, y);
}

// Persecución voraz (sin pathfinding real): intenta cerrar primero el eje
// con mayor distancia al jugador; si ese paso está bloqueado, prueba el
// otro eje. Suficiente para el alcance del proyecto.
export function moveEnemyTowardPlayer(
  enemy: Enemy,
  grid: Grid,
  player: PlayerState
): Enemy {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;

  const stepX = { x: enemy.x + Math.sign(dx), y: enemy.y };
  const stepY = { x: enemy.x, y: enemy.y + Math.sign(dy) };

  const candidates =
    Math.abs(dx) >= Math.abs(dy) ? [stepX, stepY] : [stepY, stepX];

  for (const step of candidates) {
    if (step.x === enemy.x && step.y === enemy.y) continue;
    if (!canEnter(enemy.type, grid, step.x, step.y)) continue;

    if (ENEMY_BEHAVIOR[enemy.type].canDig) {
      digAt(grid, step.x, step.y);
    }
    return { ...enemy, x: step.x, y: step.y };
  }

  return enemy;
}
