export const CANVAS_WIDTH = 256;
export const CANVAS_HEIGHT = 224;
export const CELL_SIZE = 16;
export const GRID_COLS = CANVAS_WIDTH / CELL_SIZE;
export const GRID_ROWS = CANVAS_HEIGHT / CELL_SIZE;
export const SCALE = 4;

// Paso fijo por celda del jugador: es independiente de la dificultad
// (la dificultad solo afecta la velocidad de los enemigos, ver
// difficultyStrategy.ts).
export const PLAYER_STEP_MS = 150;
