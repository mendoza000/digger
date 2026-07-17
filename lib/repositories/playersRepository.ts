import type Database from "better-sqlite3";
import { getDb } from "@/lib/db";

export interface Player {
  id: number;
  nombre_usuario: string;
  fecha_registro: string;
  avatar_url: string | null;
}

export interface PlayersRepository {
  findByUsername(username: string): Player | undefined;
  create(username: string): Player;
  findOrCreate(username: string): { player: Player; isNew: boolean };
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,50}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username.trim());
}

// Repository: abstrae el acceso a la tabla `jugadores` detrás de una
// interfaz, para poder testear con un mock en vez de tocar SQLite real.
function createPlayersRepository(db: Database.Database): PlayersRepository {
  const findByUsername = (username: string): Player | undefined => {
    return db
      .prepare<[string], Player>(
        "SELECT * FROM jugadores WHERE nombre_usuario = ? COLLATE NOCASE"
      )
      .get(username.trim());
  };

  const create = (username: string): Player => {
    const trimmed = username.trim();
    const { lastInsertRowid } = db
      .prepare("INSERT INTO jugadores (nombre_usuario) VALUES (?)")
      .run(trimmed);
    return db
      .prepare<[number | bigint], Player>("SELECT * FROM jugadores WHERE id = ?")
      .get(lastInsertRowid)!;
  };

  const findOrCreate = (username: string): { player: Player; isNew: boolean } => {
    const existing = findByUsername(username);
    if (existing) {
      return { player: existing, isNew: false };
    }
    return { player: create(username), isNew: true };
  };

  return { findByUsername, create, findOrCreate };
}

export function getPlayersRepository(): PlayersRepository {
  return createPlayersRepository(getDb());
}
