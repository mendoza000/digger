"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ScoreboardEntry } from "@/lib/repositories/scoreRepository";

export default function LeaderboardPage() {
  const [scores, setScores] = useState<ScoreboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/scores")
      .then((res) => res.json())
      .then((data: { scores: ScoreboardEntry[] }) => setScores(data.scores))
      .catch(() => setError("no se pudo cargar el leaderboard"));
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-950 px-6 py-12 font-mono text-zinc-100">
      <h1 className="text-3xl font-bold text-amber-400">Leaderboard</h1>

      {error && <p className="text-red-400">{error}</p>}

      {!error && !scores && <p className="text-zinc-400">cargando...</p>}

      {scores && scores.length === 0 && (
        <p className="text-zinc-400">todavía no hay partidas guardadas</p>
      )}

      {scores && scores.length > 0 && (
        <table className="w-full max-w-md text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="py-2">#</th>
              <th className="py-2">jugador</th>
              <th className="py-2">puntaje</th>
              <th className="py-2">nivel</th>
              <th className="py-2">dificultad</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((entry, index) => (
              <tr key={entry.id} className="border-b border-zinc-900">
                <td className="py-2">{index + 1}</td>
                <td className="py-2 text-amber-400">{entry.nombre_usuario}</td>
                <td className="py-2">{entry.puntuacion}</td>
                <td className="py-2">{entry.nivel_alcanzado}</td>
                <td className="py-2">{entry.dificultad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Link href="/" className="text-sm text-zinc-400 underline hover:text-amber-400">
        volver al inicio
      </Link>
    </div>
  );
}
