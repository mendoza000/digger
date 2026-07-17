// Paleta fija de ~16 colores, reutilizada en todo el juego.
// Es la pieza clave del look retro: nada de gradientes ni colores libres.
export const PALETTE = {
  background: "#0a0a1a",
  dirt: "#8b5a2b",
  dirtDark: "#6b4423",
  tunnel: "#1a1a2e",
  wall: "#2e2e3e",
  player: "#f4c430",
  playerDark: "#c99a1e",
  playerDetail: "#2a2a2a",
  emerald: "#2ecc71",
  gold: "#ffd700",
  enemyNobbin: "#e74c3c",
  enemyHobbin: "#9b59b6",
  bullet: "#ffffff",
  hudText: "#f4c430",
  hudBackground: "#000000",
  black: "#000000",
} as const;

export type PaletteColor = keyof typeof PALETTE;
