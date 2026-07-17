export type GameEvent =
  | { type: "score"; points: number; total: number; source: "item" | "enemy" }
  | { type: "collision"; cause: "enemy" | "goldBag" }
  | { type: "livesChanged"; lives: number }
  | { type: "levelComplete"; level: number }
  | { type: "gameOver"; score: number; level: number; durationSeconds: number }
  | { type: "shoot" };

export type GameEventListener = (event: GameEvent) => void;

// Observer: el engine emite eventos y quien esté interesado (HUD, guardado
// de partida, futuro sonido) se suscribe sin conocerse entre sí.
export class GameEventEmitter {
  private listeners = new Set<GameEventListener>();

  on(listener: GameEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: GameEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
