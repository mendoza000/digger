import { GRID_COLS, GRID_ROWS, PLAYER_STEP_MS } from "./constants";
import { createGrid, type Grid } from "./grid";
import { createPlayer, movePlayer, type Direction, type PlayerState } from "./player";
import {
  EnemyFactory,
  ENEMY_POINTS,
  moveEnemyTowardPlayer,
  type Enemy,
  type EnemyType,
} from "./enemies";
import { ITEM_POINTS, collectItemsAt, type Item, type ItemType } from "./items";
import { advanceBullet, createBullet, type Bullet } from "./bullets";
import { createGoldBag, updateGoldBag, type GoldBag } from "./goldBags";
import { bagHitsEntity, bulletHitsEnemy, enemyHitsPlayer } from "./collisions";
import {
  createDifficultyStrategy,
  type Difficulty,
  type DifficultyStrategy,
} from "./difficultyStrategy";
import { GameEventEmitter } from "./gameEvents";
import {
  drawBullet,
  drawEnemy,
  drawGoldBag,
  drawGrid,
  drawItem,
  drawPlayerAtCell,
} from "./sprites";

// Si el tab pierde foco, requestAnimationFrame puede reportar un deltaMs de
// varios segundos en el frame siguiente. Sin este clamp, cada acumulador
// (jugador, enemigos, spawns) ejecutaría cientos de pasos de golpe.
const MAX_DELTA_MS = 250;
const STARTING_LIVES = 3;
const INVULNERABILITY_MS = 750;
const MAX_BULLETS_IN_FLIGHT = 1;

// Distancia mínima (Chebyshev) entre el jugador y un enemigo recién
// aparecido, para darle chance al jugador antes de que lo alcance.
const MIN_ENEMY_SPAWN_DISTANCE = 5;

export interface HudState {
  score: number;
  lives: number;
  level: number;
}

export interface GameOverResult {
  score: number;
  level: number;
  durationSeconds: number;
}

export interface GameEngine {
  handleInput(direction: Direction | null, shootRequested: boolean): void;
  tick(deltaMs: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  getHud(): HudState;
  events: GameEventEmitter;
}

export function createGameEngine(difficulty: Difficulty): GameEngine {
  const events = new GameEventEmitter();
  const strategy: DifficultyStrategy = createDifficultyStrategy(difficulty);

  let idCounter = 1;
  const nextId = () => idCounter++;

  let grid: Grid;
  let player: PlayerState;
  let enemies: Enemy[] = [];
  let items: Item[] = [];
  let goldBags: GoldBag[] = [];
  let bullets: Bullet[] = [];

  let score = 0;
  let lives = STARTING_LIVES;
  let level = 1;
  let elapsedMs = 0;
  let gameOver = false;
  let invulnerableUntilMs = 0;

  let playerAccumulator = 0;
  let enemyAccumulator = 0;
  let spawnAccumulator = 0;
  let pendingDirection: Direction | null = null;
  let shootRequested = false;

  function spawnPoint(): { x: number; y: number } {
    return { x: Math.floor(GRID_COLS / 2), y: Math.floor(GRID_ROWS / 2) };
  }

  // Elige una celda interior (nunca el borde, que siempre es wall) al azar,
  // evitando las celdas ya ocupadas y las que no cumplan `isValid` (ej.
  // demasiado cerca del jugador). El tope de intentos es una salvaguarda
  // teórica: con ~150 celdas interiores y pocas posiciones a repartir,
  // nunca debería agotarse en la práctica.
  function randomInteriorPosition(
    taken: Set<string>,
    isValid: (x: number, y: number) => boolean = () => true
  ): { x: number; y: number } {
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = 1 + Math.floor(Math.random() * (GRID_COLS - 2));
      const y = 1 + Math.floor(Math.random() * (GRID_ROWS - 2));
      const key = `${x},${y}`;
      if (taken.has(key) || !isValid(x, y)) continue;
      taken.add(key);
      return { x, y };
    }
    return { x: 1, y: 1 };
  }

  function createItemsForLevel(taken: Set<string>): Item[] {
    const types: ItemType[] = ["emerald", "emerald", "emerald", "gold", "emerald"];
    return types.map((type) => {
      const { x, y } = randomInteriorPosition(taken);
      return { id: nextId(), type, x, y, collected: false };
    });
  }

  function createGoldBagsForLevel(taken: Set<string>): GoldBag[] {
    const { x, y } = randomInteriorPosition(taken);
    return [createGoldBag(nextId(), x, y)];
  }

  function spawnEnemy(): void {
    if (enemies.length >= strategy.maxEnemies) return;

    const occupied = new Set<string>();
    for (const item of items) {
      if (!item.collected) occupied.add(`${item.x},${item.y}`);
    }
    for (const bag of goldBags) occupied.add(`${bag.x},${bag.y}`);
    for (const other of enemies) occupied.add(`${other.x},${other.y}`);

    const { x, y } = randomInteriorPosition(
      occupied,
      (cx, cy) =>
        Math.max(Math.abs(cx - player.x), Math.abs(cy - player.y)) >=
        MIN_ENEMY_SPAWN_DISTANCE
    );

    const type: EnemyType = enemies.length % 2 === 0 ? "nobbin" : "hobbin";
    enemies.push(EnemyFactory.create(nextId(), type, x, y));
  }

  function setupLevel(): void {
    grid = createGrid(GRID_COLS, GRID_ROWS);
    const start = spawnPoint();
    player = createPlayer(start.x, start.y);
    enemies = [];
    bullets = [];
    playerAccumulator = 0;
    enemyAccumulator = 0;
    spawnAccumulator = 0;

    // Ítems y bolsa de oro en posiciones aleatorias cada nivel, evitando
    // pisarse entre sí o aparecer justo donde arranca el jugador. Van
    // antes que el enemigo para que spawnEnemy() pueda evitarlos también.
    const taken = new Set<string>([`${start.x},${start.y}`]);
    items = createItemsForLevel(taken);
    goldBags = createGoldBagsForLevel(taken);

    // Sembrar un enemigo de inmediato: si esperáramos el primer
    // spawnIntervalMs (hasta 8s en fácil) la grilla se vería vacía al entrar.
    spawnEnemy();
  }

  function emitHud(): void {
    events.emit({ type: "livesChanged", lives });
  }

  function killEnemy(enemy: Enemy): void {
    enemies = enemies.filter((e) => e.id !== enemy.id);
    const points = ENEMY_POINTS[enemy.type];
    score += points;
    events.emit({ type: "score", points, total: score, source: "enemy" });
  }

  function triggerGameOver(): void {
    gameOver = true;
    events.emit({
      type: "gameOver",
      score,
      level,
      durationSeconds: Math.round(elapsedMs / 1000),
    });
  }

  function handlePlayerHit(cause: "enemy" | "goldBag"): void {
    if (elapsedMs < invulnerableUntilMs) return;

    lives -= 1;
    events.emit({ type: "collision", cause });
    events.emit({ type: "livesChanged", lives });

    if (lives <= 0) {
      triggerGameOver();
      return;
    }

    const start = spawnPoint();
    player = createPlayer(start.x, start.y);
    invulnerableUntilMs = elapsedMs + INVULNERABILITY_MS;
  }

  function completeLevel(): void {
    // Mutar el estado ANTES de emitir: si un listener llama a getHud()
    // durante el evento, debe ver el nivel ya actualizado, no el viejo.
    const completedLevel = level;
    level += 1;
    setupLevel();
    events.emit({ type: "levelComplete", level: completedLevel });
  }

  function checkPlayerEnemyCollision(): void {
    const enemy = enemyHitsPlayer(enemies, player);
    if (enemy) handlePlayerHit("enemy");
  }

  function checkLevelComplete(): void {
    if (items.length > 0 && items.every((item) => item.collected)) {
      completeLevel();
    }
  }

  function stepBullets(): void {
    const survivors: Bullet[] = [];
    for (const bullet of bullets) {
      const advanced = advanceBullet(bullet, grid);
      if (!advanced) continue; // se destruyó contra tierra o pared

      const hitEnemy = bulletHitsEnemy(advanced, enemies);
      if (hitEnemy) {
        killEnemy(hitEnemy);
        continue; // la bala se consume al impactar
      }
      survivors.push(advanced);
    }
    bullets = survivors;
  }

  function stepGoldBags(): void {
    const previous = goldBags;
    goldBags = previous.map((bag) => updateGoldBag(bag, grid, previous));

    for (const bag of goldBags) {
      // Una bolsa en reposo es inofensiva (se puede caminar cerca/sobre
      // ella); solo aplasta mientras está activamente cayendo.
      if (!bag.falling) continue;
      const impact = bagHitsEntity(bag, enemies, player);
      if (impact.enemy) killEnemy(impact.enemy);
      if (impact.hitsPlayer) handlePlayerHit("goldBag");
    }
  }

  function stepPlayer(): void {
    if (pendingDirection) {
      player = movePlayer(player, grid, pendingDirection);
    }

    const collected = collectItemsAt(items, player.x, player.y);
    for (const item of collected) {
      const points = ITEM_POINTS[item.type];
      score += points;
      events.emit({ type: "score", points, total: score, source: "item" });
    }

    if (shootRequested) {
      shootRequested = false;
      if (bullets.length < MAX_BULLETS_IN_FLIGHT) {
        bullets.push(createBullet(player.x, player.y, player.direction));
        events.emit({ type: "shoot" });
      }
    }

    stepBullets();
    stepGoldBags();
    checkPlayerEnemyCollision();
    checkLevelComplete();
  }

  function stepEnemies(): void {
    enemies = enemies.map((enemy) => moveEnemyTowardPlayer(enemy, grid, player));
    checkPlayerEnemyCollision();
  }

  function handleInput(direction: Direction | null, shoot: boolean): void {
    pendingDirection = direction;
    if (shoot) shootRequested = true;
  }

  function tick(rawDeltaMs: number): void {
    if (gameOver) return;
    const deltaMs = Math.min(rawDeltaMs, MAX_DELTA_MS);
    elapsedMs += deltaMs;

    playerAccumulator += deltaMs;
    while (playerAccumulator >= PLAYER_STEP_MS) {
      playerAccumulator -= PLAYER_STEP_MS;
      stepPlayer();
      if (gameOver) return;
    }

    enemyAccumulator += deltaMs;
    while (enemyAccumulator >= strategy.enemyStepMs) {
      enemyAccumulator -= strategy.enemyStepMs;
      stepEnemies();
      if (gameOver) return;
    }

    spawnAccumulator += deltaMs;
    while (spawnAccumulator >= strategy.spawnIntervalMs) {
      spawnAccumulator -= strategy.spawnIntervalMs;
      spawnEnemy();
    }
  }

  function draw(ctx: CanvasRenderingContext2D): void {
    drawGrid(ctx, grid);
    for (const item of items) {
      if (!item.collected) drawItem(ctx, item);
    }
    for (const bag of goldBags) drawGoldBag(ctx, bag);
    for (const enemy of enemies) drawEnemy(ctx, enemy);
    for (const bullet of bullets) drawBullet(ctx, bullet);
    drawPlayerAtCell(ctx, player);
  }

  function getHud(): HudState {
    return { score, lives, level };
  }

  setupLevel();
  emitHud();

  return { handleInput, tick, draw, getHud, events };
}
