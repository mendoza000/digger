import { getDb } from "@/lib/db";

export interface Player {
  id: number;
  nombre_usuario: string;
  fecha_registro: string;
  avatar_url: string | null;
}

export interface PlayersRepository {
  findByUsername(username: string): Promise<Player | undefined>;
  create(username: string): Promise<Player>;
  findOrCreate(username: string): Promise<{ player: Player; isNew: boolean }>;
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,50}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username.trim());
}

export function getPlayersRepository(): PlayersRepository {
  const db = getDb();

  const findByUsername = async (username: string): Promise<Player | undefined> => {
    const rows = await db<Player[]>`SELECT id, nombre_usuario, fecha_registro, avatar_url
      FROM jugadores WHERE lower(nombre_usuario) = lower(${username.trim()}) LIMIT 1`;
    return rows[0];
  };

  const create = async (username: string): Promise<Player> => {
    const rows = await db<Player[]>`INSERT INTO jugadores (nombre_usuario)
      VALUES (${username.trim()})
      RETURNING id, nombre_usuario, fecha_registro, avatar_url`;
    return rows[0];
  };

  const findOrCreate = async (username: string) => {
    const existing = await findByUsername(username);
    if (existing) return { player: existing, isNew: false };
    return { player: await create(username), isNew: true };
  };

  return { findByUsername, create, findOrCreate };
}
