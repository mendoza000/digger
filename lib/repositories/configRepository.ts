import type Database from "better-sqlite3";
import { getDb } from "@/lib/db";

export interface PlayerConfig {
  id: number;
  jugador_id: number;
  dificultad_preferida: string;
  sonido_activo: number;
  controles_personalizados: string | null;
}

export interface UpsertConfigInput {
  dificultadPreferida: string;
  sonidoActivo: boolean;
}

export interface ConfigRepository {
  getByPlayerId(jugadorId: number): PlayerConfig | undefined;
  upsert(jugadorId: number, input: UpsertConfigInput): PlayerConfig;
}

// Repository sobre `configuraciones`. La tabla no tiene UNIQUE en
// jugador_id (así quedó definida en la Semana 1, no se toca el schema a
// mitad de proyecto), así que "una fila por jugador" es una convención de
// esta capa: getByPlayerId ordena por id DESC para quedarse con la más
// reciente, y upsert hace SELECT-y-decide en vez de confiar en ON CONFLICT.
function createConfigRepository(db: Database.Database): ConfigRepository {
  const getByPlayerId = (jugadorId: number): PlayerConfig | undefined => {
    return db
      .prepare<[number], PlayerConfig>(
        "SELECT * FROM configuraciones WHERE jugador_id = ? ORDER BY id DESC LIMIT 1"
      )
      .get(jugadorId);
  };

  const upsert = (jugadorId: number, input: UpsertConfigInput): PlayerConfig => {
    const existing = getByPlayerId(jugadorId);

    if (existing) {
      db.prepare(
        "UPDATE configuraciones SET dificultad_preferida = ?, sonido_activo = ? WHERE id = ?"
      ).run(input.dificultadPreferida, input.sonidoActivo ? 1 : 0, existing.id);
      return getByPlayerId(jugadorId)!;
    }

    const { lastInsertRowid } = db
      .prepare(
        "INSERT INTO configuraciones (jugador_id, dificultad_preferida, sonido_activo) VALUES (?, ?, ?)"
      )
      .run(jugadorId, input.dificultadPreferida, input.sonidoActivo ? 1 : 0);
    return db
      .prepare<[number | bigint], PlayerConfig>(
        "SELECT * FROM configuraciones WHERE id = ?"
      )
      .get(lastInsertRowid)!;
  };

  return { getByPlayerId, upsert };
}

export function getConfigRepository(): ConfigRepository {
  return createConfigRepository(getDb());
}
