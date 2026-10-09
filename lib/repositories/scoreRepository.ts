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

export function getScoreRepository(): ScoreRepository {
  const db = getDb();

  const create = async (input: CreateScoreInput): Promise<Partida> => {
    const rows = await db<Partida[]>`INSERT INTO partidas
      (jugador_id, puntuacion, nivel_alcanzado, duracion_segundos, dificultad, finalizada)
      VALUES (${input.jugadorId}, ${input.puntuacion}, ${input.nivelAlcanzado},
        ${input.duracionSegundos}, ${input.dificultad}, ${input.finalizada}) RETURNING *`;
    return rows[0];
  };

  const topScores = async (limit: number): Promise<ScoreboardEntry[]> => {
    return db<ScoreboardEntry[]>`SELECT p.id, j.nombre_usuario, p.puntuacion,
      p.nivel_alcanzado, p.dificultad, p.fecha_partida
      FROM partidas p JOIN jugadores j ON j.id = p.jugador_id
      ORDER BY p.puntuacion DESC LIMIT ${limit}`;
  };

  return { create, topScores };
}
