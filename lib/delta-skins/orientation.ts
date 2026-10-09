import type { SkinConfig } from "./index";

export function isTouchCompactViewport(touchPoints: number, width: number, height: number): boolean {
  return touchPoints > 0 && (width <= 700 || (width > height && height <= 600));
}

export function selectSkinConfiguration(
  imported: Record<string, SkinConfig> | null,
  bundled: Record<"portrait" | "landscape", SkinConfig>,
  orientation: "portrait" | "landscape",
) {
  const key = `iphone.edgeToEdge.${orientation}`;
  const importedConfig = imported?.[key];
  const fallback = orientation === "landscape" && !!imported && !importedConfig;
  return {
    config: importedConfig ?? (fallback ? bundled.landscape : orientation === "landscape" ? bundled.landscape : bundled.portrait),
    fallback,
    fallbackMessage: fallback ? "Landscape unavailable; using Candybar landscape layout." : null,
  };
}
