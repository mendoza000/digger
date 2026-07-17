import type { Enemy } from "./enemies";
import type { PlayerState } from "./player";
import type { Bullet } from "./bullets";
import type { GoldBag } from "./goldBags";

export function enemyHitsPlayer(
  enemies: Enemy[],
  player: PlayerState
): Enemy | undefined {
  return enemies.find((enemy) => enemy.x === player.x && enemy.y === player.y);
}

export function bulletHitsEnemy(
  bullet: Bullet,
  enemies: Enemy[]
): Enemy | undefined {
  return enemies.find((enemy) => enemy.x === bullet.x && enemy.y === bullet.y);
}

export interface GoldBagImpact {
  enemy?: Enemy;
  hitsPlayer: boolean;
}

export function bagHitsEntity(
  bag: GoldBag,
  enemies: Enemy[],
  player: PlayerState
): GoldBagImpact {
  const enemy = enemies.find((e) => e.x === bag.x && e.y === bag.y);
  const hitsPlayer = bag.x === player.x && bag.y === player.y;
  return { enemy, hitsPlayer };
}
