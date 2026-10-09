import type { Direction } from "@/game/player";

export type Action = "shootA" | "shootB";
type Owner = string | number;

export interface InputState {
  directions: Map<Owner, Direction>;
  actions: Set<string>;
  order: string[];
}

export function createInputState(): InputState {
  return { directions: new Map(), actions: new Set(), order: [] };
}

export function setDirection(state: InputState, owner: Owner, direction: Direction | null): void {
  if (direction !== null && state.directions.get(owner) === direction) return;
  state.directions.delete(owner);
  if (direction) {
    state.directions.set(owner, direction);
    const key = String(owner);
    state.order = state.order.filter((item) => item !== key);
    state.order.push(key);
  } else {
    state.order = state.order.filter((item) => item !== String(owner));
  }
}

export function releaseOwner(state: InputState, owner: Owner): void {
  state.directions.delete(owner);
  for (const action of state.actions) {
    if (action.startsWith(`${String(owner)}:`)) state.actions.delete(action);
  }
  state.order = state.order.filter((item) => item !== String(owner));
}

export function setAction(state: InputState, owner: Owner, action: Action, pressed: boolean): boolean {
  const key = `${String(owner)}:${action}`;
  if (pressed) state.actions.add(key);
  else state.actions.delete(key);
  return pressed;
}

export function activeDirection(state: InputState): Direction | null {
  const owner = [...state.directions.keys()].at(-1);
  return owner === undefined ? null : state.directions.get(owner) ?? null;
}

export function clearInput(state: InputState): void {
  state.directions.clear();
  state.actions.clear();
  state.order = [];
}
