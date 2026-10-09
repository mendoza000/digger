CREATE TABLE IF NOT EXISTS jugadores (
  id SERIAL PRIMARY KEY,
  nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  avatar_url VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS partidas (
  id SERIAL PRIMARY KEY,
  jugador_id INTEGER REFERENCES jugadores(id),
  puntuacion INTEGER NOT NULL DEFAULT 0,
  nivel_alcanzado INTEGER DEFAULT 1,
  duracion_segundos INTEGER,
  dificultad VARCHAR(20) DEFAULT 'medio',
  fecha_partida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finalizada BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS configuraciones (
  id SERIAL PRIMARY KEY,
  jugador_id INTEGER REFERENCES jugadores(id),
  dificultad_preferida VARCHAR(20) DEFAULT 'medio',
  sonido_activo BOOLEAN DEFAULT TRUE,
  controles_personalizados TEXT
);
