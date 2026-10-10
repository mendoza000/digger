import { getDb } from "@/lib/db";

export interface Partida {
  id: number;
  jugador_id: number | null;
  puntuacion: number;
  nivel_alcanzado: number;
  duracion_segundos: number | null;
  dificultad: string;
  fecha_partida: string;
  finalizada: boolean;
}

export interface ScoreboardEntry {
  id: number;
  nombre_usuario: string;
  puntuacion: number;
  nivel_alcanzado: number;
  dificultad: string;
  fecha_partida: string;
}

export interface CreateScoreInput {
  jugadorId: number;
  puntuacion: number;
  nivelAlcanzado: number;
  duracionSegundos: number;
  dificultad: string;
  finalizada: boolean;
}

export interface ScoreRepository {
  create(input: CreateScoreInput): Promise<Partida>;
  topScores(limit: number): Promise<ScoreboardEntry[]>;
}

export function createScoreRepository(
  db: ReturnType<typeof getDb>,
): ScoreRepository {

  const create = async (input: CreateScoreInput): Promise<Partida> => {
    const rows = await db<Partida[]>`INSERT INTO partidas
      (jugador_id, puntuacion, nivel_alcanzado, duracion_segundos, dificultad, finalizada)
      VALUES (${input.jugadorId}, ${input.puntuacion}, ${input.nivelAlcanzado},
        ${input.duracionSegundos}, ${input.dificultad}, ${input.finalizada}) RETURNING *`;
    return rows[0];
  };

  const topScores = async (limit: number): Promise<ScoreboardEntry[]> => {
    return db<ScoreboardEntry[]>`WITH ranked_scores AS (
      SELECT p.id, p.jugador_id, p.puntuacion, p.nivel_alcanzado,
        p.dificultad, p.fecha_partida,
        ROW_NUMBER() OVER (
          PARTITION BY p.jugador_id
          ORDER BY p.puntuacion DESC, p.fecha_partida DESC, p.id DESC
        ) AS score_rank
      FROM partidas p
    )
    SELECT best.id, j.nombre_usuario, best.puntuacion,
      best.nivel_alcanzado, best.dificultad, best.fecha_partida
    FROM ranked_scores best
    JOIN jugadores j ON j.id = best.jugador_id
    WHERE best.score_rank = 1
    ORDER BY best.puntuacion DESC, best.fecha_partida DESC, best.id DESC
    LIMIT ${limit}`;
  };

  return { create, topScores };
}

export function getScoreRepository(): ScoreRepository {
  return createScoreRepository(getDb());
}
