import { expect, test } from "@playwright/test";
import { activeDirection, clearInput, createInputState, releaseOwner, setAction, setDirection } from "@/lib/game-input";

test.describe("game input ownership", () => {
  test("lets the latest active direction win and falls back on release", () => {
    const state = createInputState();
    setDirection(state, "key-up", "up");
    setDirection(state, 1, "left");
    expect(activeDirection(state)).toBe("left");
    releaseOwner(state, 1);
    expect(activeDirection(state)).toBe("up");
  });
  test("keeps an unchanged direction owner in its existing priority position", () => {
    const state = createInputState();
    setDirection(state, "older-pointer", "up");
    setDirection(state, "newer-pointer", "left");
    setDirection(state, "older-pointer", "up");
    expect(activeDirection(state)).toBe("left");
    setDirection(state, "older-pointer", "down");
    expect(activeDirection(state)).toBe("down");
  });
  test("preserves another owner's direction when one owner releases", () => {
    const state = createInputState();
    setDirection(state, "key", "right");
    setDirection(state, 4, "down");
    releaseOwner(state, 4);
    expect(activeDirection(state)).toBe("right");
  });
  test("updates a pointer's direction as it moves", () => {
    const state = createInputState();
    setDirection(state, 7, "up");
    setDirection(state, 7, "right");
    expect(activeDirection(state)).toBe("right");
    setDirection(state, 7, null);
    expect(activeDirection(state)).toBeNull();
  });
  test("tracks A/B ownership and clears all inputs", () => {
    const state = createInputState();
    expect(setAction(state, 1, "shootA", true)).toBe(true);
    setAction(state, 2, "shootB", true);
    releaseOwner(state, 1);
    expect(state.actions).toEqual(new Set(["2:shootB"]));
    setDirection(state, "key", "down");
    clearInput(state);
    expect(activeDirection(state)).toBeNull();
    expect(state.actions.size).toBe(0);
  });
});
