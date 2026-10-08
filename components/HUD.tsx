interface HUDProps {
  score: number;
  lives: number;
  level: number;
}

export default function HUD({ score, lives, level }: HUDProps) {
  return (
    <div
      className="game-hud flex justify-between rounded border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-amber-400"
    >
      <span>Puntaje: {score}</span>
      <span>Vidas: {"♥".repeat(Math.max(lives, 0))}</span>
      <span>Nivel: {level}</span>
    </div>
  );
}
