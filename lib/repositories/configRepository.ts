import { getDb } from "@/lib/db";

export interface PlayerConfig {
  id: number;
  jugador_id: number;
  dificultad_preferida: string;
  sonido_activo: boolean;
  controles_personalizados: string | null;
}

export interface UpsertConfigInput {
  dificultadPreferida: string;
  sonidoActivo: boolean;
}

export interface ConfigRepository {
  getByPlayerId(jugadorId: number): Promise<PlayerConfig | undefined>;
  upsert(jugadorId: number, input: UpsertConfigInput): Promise<PlayerConfig>;
}

export function getConfigRepository(): ConfigRepository {
  const db = getDb();

  const getByPlayerId = async (jugadorId: number): Promise<PlayerConfig | undefined> => {
    const rows = await db<PlayerConfig[]>`SELECT * FROM configuraciones
      WHERE jugador_id = ${jugadorId} ORDER BY id DESC LIMIT 1`;
    return rows[0];
  };

  const upsert = async (jugadorId: number, input: UpsertConfigInput): Promise<PlayerConfig> => {
    const existing = await getByPlayerId(jugadorId);
    if (existing) {
      const rows = await db<PlayerConfig[]>`UPDATE configuraciones
        SET dificultad_preferida = ${input.dificultadPreferida}, sonido_activo = ${input.sonidoActivo}
        WHERE id = ${existing.id}
        RETURNING *`;
      return rows[0];
    }
    const rows = await db<PlayerConfig[]>`INSERT INTO configuraciones
      (jugador_id, dificultad_preferida, sonido_activo)
      VALUES (${jugadorId}, ${input.dificultadPreferida}, ${input.sonidoActivo}) RETURNING *`;
    return rows[0];
  };

  return { getByPlayerId, upsert };
}
