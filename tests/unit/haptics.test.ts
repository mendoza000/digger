import { expect, test } from "@playwright/test";
import { vibrateForTouch, type HapticsPreference } from "@/lib/haptics";

test("haptics are disabled by default and vibrate only when enabled", () => {
  const calls: number[] = [];
  const api = { vibrate: (duration: number) => { calls.push(duration); return true; } };
  expect(vibrateForTouch(undefined, api)).toBe(false);
  expect(vibrateForTouch({ enabled: true }, api)).toBe(true);
  expect(calls).toEqual([10]);
});

test("unavailable and throwing vibration APIs silently no-op", () => {
  const enabled: HapticsPreference = { enabled: true };
  expect(vibrateForTouch(enabled, undefined)).toBe(false);
  expect(vibrateForTouch(enabled, { vibrate: () => { throw new Error("denied"); } })).toBe(false);
});
