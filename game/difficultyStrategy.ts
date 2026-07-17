export type Difficulty = "facil" | "medio" | "dificil";

// Strategy: cada dificultad encapsula sus propios parámetros de enemigos
// (velocidad, cadencia de aparición, cantidad máxima) sin que el engine
// tenga que ramificar con ifs por cada nivel de dificultad.
export interface DifficultyStrategy {
  readonly name: Difficulty;
  readonly enemyStepMs: number;
  readonly spawnIntervalMs: number;
  readonly maxEnemies: number;
}

class EasyStrategy implements DifficultyStrategy {
  readonly name = "facil" as const;
  readonly enemyStepMs = 500;
  readonly spawnIntervalMs = 8000;
  readonly maxEnemies = 3;
}

class MediumStrategy implements DifficultyStrategy {
  readonly name = "medio" as const;
  readonly enemyStepMs = 350;
  readonly spawnIntervalMs = 6000;
  readonly maxEnemies = 4;
}

class HardStrategy implements DifficultyStrategy {
  readonly name = "dificil" as const;
  readonly enemyStepMs = 220;
  readonly spawnIntervalMs = 4000;
  readonly maxEnemies = 6;
}

const STRATEGIES: Record<Difficulty, DifficultyStrategy> = {
  facil: new EasyStrategy(),
  medio: new MediumStrategy(),
  dificil: new HardStrategy(),
};

export function createDifficultyStrategy(difficulty: Difficulty): DifficultyStrategy {
  return STRATEGIES[difficulty];
}

export function isValidDifficulty(value: string): value is Difficulty {
  return value === "facil" || value === "medio" || value === "dificil";
}
