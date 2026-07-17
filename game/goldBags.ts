import { isTunnel, type Grid } from "./grid";

export interface GoldBag {
  id: number;
  x: number;
  y: number;
  falling: boolean;
}

export function createGoldBag(id: number, x: number, y: number): GoldBag {
  return { id, x, y, falling: false };
}

// Una bolsa empieza a caer recién cuando la celda de abajo es túnel real
// (no alcanza con "no es tierra": una pared debajo tampoco debe activarla).
// Mientras cae, baja una celda por tick hasta que abajo deja de ser túnel
// (aterriza) o hay otra bolsa ocupando esa celda (no se apilan).
export function updateGoldBag(
  bag: GoldBag,
  grid: Grid,
  otherBags: GoldBag[]
): GoldBag {
  const belowY = bag.y + 1;
  const belowIsTunnel = isTunnel(grid, bag.x, belowY);
  const belowOccupied = otherBags.some(
    (other) => other.id !== bag.id && other.x === bag.x && other.y === belowY
  );

  if (!belowIsTunnel || belowOccupied) {
    return bag.falling ? { ...bag, falling: false } : bag;
  }

  return { ...bag, falling: true, y: belowY };
}
