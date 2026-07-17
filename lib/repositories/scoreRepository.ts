import type Database from "better-sqlite3";
import { getDb } from "@/lib/db";

export interface Partida {
  id: number;
  jugador_id: number | null;
  puntuacion: number;
  nivel_alcanzado: number;
  duracion_segundos: number | null;
  dificultad: string;
  fecha_partida: string;
  finalizada: number;
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
  create(input: CreateScoreInput): Partida;
  topScores(limit: number): ScoreboardEntry[];
}

// Repository: abstrae el acceso a `partidas` (mismo patrón que
// playersRepository con `jugadores`) para poder testear con un mock en
// vez de tocar SQLite real.
function createScoreRepository(db: Database.Database): ScoreRepository {
  const create = (input: CreateScoreInput): Partida => {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO partidas (jugador_id, puntuacion, nivel_alcanzado, duracion_segundos, dificultad, finalizada)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.jugadorId,
        input.puntuacion,
        input.nivelAlcanzado,
        input.duracionSegundos,
        input.dificultad,
        input.finalizada ? 1 : 0
      );
    return db
      .prepare<[number | bigint], Partida>("SELECT * FROM partidas WHERE id = ?")
      .get(lastInsertRowid)!;
  };

  const topScores = (limit: number): ScoreboardEntry[] => {
    return db
      .prepare<[number], ScoreboardEntry>(
        `SELECT p.id, j.nombre_usuario, p.puntuacion, p.nivel_alcanzado, p.dificultad, p.fecha_partida
         FROM partidas p
         JOIN jugadores j ON j.id = p.jugador_id
         ORDER BY p.puntuacion DESC
         LIMIT ?`
      )
      .all(limit);
  };

  return { create, topScores };
}

export function getScoreRepository(): ScoreRepository {
  return createScoreRepository(getDb());
}
