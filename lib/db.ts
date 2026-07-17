import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "digger.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS jugadores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  avatar_url VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS partidas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jugador_id INTEGER REFERENCES jugadores(id),
  puntuacion INTEGER NOT NULL DEFAULT 0,
  nivel_alcanzado INTEGER DEFAULT 1,
  duracion_segundos INTEGER,
  dificultad VARCHAR(20) DEFAULT 'medio',
  fecha_partida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finalizada BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS configuraciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jugador_id INTEGER REFERENCES jugadores(id),
  dificultad_preferida VARCHAR(20) DEFAULT 'medio',
  sonido_activo BOOLEAN DEFAULT TRUE,
  controles_personalizados TEXT
);
`;

function createConnection(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  return db;
}

// Singleton: guardamos la instancia en globalThis para que sobreviva
// al hot-reload de Next.js en dev (si no, cada reload de un módulo que
// importa este archivo abriría una conexión nueva).
declare global {
  var __digger_db__: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!global.__digger_db__) {
    global.__digger_db__ = createConnection();
  }
  return global.__digger_db__;
}
