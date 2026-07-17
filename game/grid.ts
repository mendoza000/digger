export type CellState = "dirt" | "tunnel" | "wall";

export type Grid = CellState[][];

export function createGrid(width: number, height: number): Grid {
  const grid: Grid = [];
  for (let y = 0; y < height; y++) {
    const row: CellState[] = [];
    for (let x = 0; x < width; x++) {
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      row.push(isBorder ? "wall" : "dirt");
    }
    grid.push(row);
  }
  return grid;
}

export function inBounds(grid: Grid, x: number, y: number): boolean {
  return y >= 0 && y < grid.length && x >= 0 && x < grid[0].length;
}

export function digAt(grid: Grid, x: number, y: number): void {
  if (!inBounds(grid, x, y)) return;
  if (grid[y][x] === "dirt") {
    grid[y][x] = "tunnel";
  }
}

export function isWalkable(grid: Grid, x: number, y: number): boolean {
  if (!inBounds(grid, x, y)) return false;
  return grid[y][x] !== "wall";
}

// Distinto de isWalkable: dirt también es "walkable" (el jugador cava al
// pisarlo), pero hobbins/balas/bolsas de oro necesitan saber si una celda
// es específicamente túnel YA cavado, sin confundirlo con tierra sin cavar.
export function isTunnel(grid: Grid, x: number, y: number): boolean {
  if (!inBounds(grid, x, y)) return false;
  return grid[y][x] === "tunnel";
}
