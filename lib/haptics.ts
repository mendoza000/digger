export interface HapticsPreference { enabled: boolean }

export function vibrateForTouch(preference: HapticsPreference | undefined, api: { vibrate: (duration: number) => boolean } | undefined): boolean {
  if (!preference?.enabled || !api || typeof api.vibrate !== "function") return false;
  try {
    return api.vibrate(10);
  } catch {
    return false;
  }
}
