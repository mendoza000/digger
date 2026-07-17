import Link from "next/link";
import type { GameOverResult } from "@/game/engine";

interface ScreenGameOverProps {
  result: GameOverResult;
  onRestart: () => void;
}

export default function ScreenGameOver({ result, onRestart }: ScreenGameOverProps) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded border border-zinc-800 p-6 text-center">
      <h2 className="text-2xl font-bold text-amber-400">Game Over</h2>
      <p className="text-zinc-300">
        Puntaje final: <span className="text-amber-400">{result.score}</span>
      </p>
      <p className="text-sm text-zinc-400">Nivel alcanzado: {result.level}</p>
      <p className="text-sm text-zinc-400">Duración: {result.durationSeconds}s</p>
      <button
        type="button"
        onClick={onRestart}
        className="w-full rounded bg-amber-500 px-4 py-3 font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
      >
        Jugar de nuevo
      </button>
      <Link
        href="/leaderboard"
        className="text-sm text-zinc-400 underline hover:text-amber-400"
      >
        Ver leaderboard
      </Link>
    </div>
  );
}
