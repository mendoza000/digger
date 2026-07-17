export type ItemType = "emerald" | "gold";

export interface Item {
  id: number;
  type: ItemType;
  x: number;
  y: number;
  collected: boolean;
}

export const ITEM_POINTS: Record<ItemType, number> = {
  emerald: 50,
  gold: 150,
};

// Marca como recolectados los ítems que coinciden con (x, y) y devuelve
// solo los que recién se recolectaron en esta llamada (para que el
// engine sepa cuántos puntos otorgar sin volver a contarlos).
export function collectItemsAt(items: Item[], x: number, y: number): Item[] {
  const newlyCollected: Item[] = [];
  for (const item of items) {
    if (!item.collected && item.x === x && item.y === y) {
      item.collected = true;
      newlyCollected.push(item);
    }
  }
  return newlyCollected;
}
