# Plan de Desarrollo — Clon de Digger (Proyecto Web)

## 0. Contexto del proyecto académico

- **Asignatura**: Programación Web / Bases de Datos I (Proyecto Integrador)
- **Equipo**: 2 estudiantes
- **Duración**: 3 semanas (cronograma sugerido de la guía referencia semanas de calendario académico 19, 22, 24)
- **Entregables**: repo GitHub, README completo, video demo (3-5 min), presentación en clase (15 min), poster, URL de despliegue (valorado)
- **Rúbrica clave**: Funcionalidad (25%), Arquitectura/Código (15%), Base de Datos (15%), Frontend/UX (15%), Backend/API (10%), Documentación (5%), Presentación (5%). Extra: patrones de diseño (+15), WebAssembly (+10, **no lo vamos a implementar**, se prioriza simplicidad).

---

## 1. Decisión tecnológica

**Stack: Next.js full-stack** (React + API Routes en un solo proyecto)

| Requisito de la guía | Cómo lo cumplimos |
|---|---|
| Frontend web interactivo | Next.js (React) + Canvas API para el juego |
| Backend con API REST | API Routes de Next.js (`/app/api/...` o `/pages/api/...`) |
| Base de datos relacional | SQLite (vía `better-sqlite3` o `Prisma`) |
| Arquitectura cliente-servidor | El componente de juego (cliente) llama por `fetch` a las API Routes (servidor) — mismo repo, misma app, pero comunicación HTTP real |
| Despliegue | Vercel (nativo para Next.js) |

**Se descarta**: Electron (no aporta nada al requisito "web", complica el empaquetado sin necesidad) y WebAssembly/Pyodide (puntos extra interesantes pero agregan complejidad no justificada para el alcance de 3 semanas con equipo de 2).

Instalación:
```bash
npx create-next-app@latest digger-web --typescript --tailwind --app
cd digger-web
npm install better-sqlite3
```

---

## 2. Concepto del juego (referencia: Digger, 1983)

- El jugador controla un vehículo que **cava túneles** en un mapa de tierra.
- Recoge **esmeraldas** (puntos) y **oro** (más puntos).
- Hay **monstruos** (nobbins/hobbins) que persiguen al jugador por los túneles.
- Existen **bolsas de oro** que, si se dejan caer sobre un monstruo, lo aplastan.
- El jugador puede **disparar** en línea recta para eliminar monstruos.
- Se pierde una vida al chocar con un monstruo.
- El nivel termina al recolectar todos los objetos; hay progresión de dificultad (fácil/medio/difícil, afecta velocidad de enemigos).

---

## 3. Identidad visual — pixel art retro 100% por código

Mismo enfoque que definimos antes, adaptado a Canvas API (funciona igual o mejor que en Pygame):

### 3.1 Canvas de baja resolución + escalado sin suavizado
- Se dibuja todo en un `<canvas>` interno pequeño (ej. `256x224`).
- Se muestra escalado con CSS `image-rendering: pixelated` (o `crisp-edges`), sin usar `ctx.imageSmoothingEnabled` (ponerlo en `false`).

```css
canvas {
  width: 1024px;   /* factor x4 */
  height: 896px;
  image-rendering: pixelated;
}
```

### 3.2 Sprites como matrices de píxeles en código (sin imágenes)
```javascript
const PLAYER_SPRITE = [
  "..000..",
  ".01110.",
  "0111110",
  "0111110",
  "..0.0..",
  ".0...0.",
];
// se recorre y se dibuja un ctx.fillRect(1x1) por cada carácter no vacío
```
- 2-3 frames por animación (caminar, cavar, morir), guardados como arrays de matrices.

### 3.3 Paleta de colores fija (~12-16 colores)
- Definida en un módulo `palette.ts`, reutilizada en todo el juego. Esto es lo que más vende el look retro.

### 3.4 Efectos "juicy" baratos
- Partículas de tierra al cavar, screen shake al aplastar enemigos, flash de impacto, squash al recoger ítems, scanlines opcionales (overlay CSS o dibujado en canvas).

### 3.5 Variación por nivel
- Cambiar paleta de tierra/fondo cada 2-3 niveles reutilizando los mismos sprites.

---

## 4. Arquitectura y estructura de carpetas

```
digger-web/
├── app/
│   ├── page.tsx                 # pantalla de inicio / login por nombre
│   ├── play/page.tsx            # pantalla de juego (monta el Canvas)
│   ├── leaderboard/page.tsx     # tabla de clasificación
│   └── api/
│       ├── players/route.ts     # POST registrar/login por nombre
│       ├── scores/route.ts      # GET top 10, POST nueva puntuación
│       └── config/route.ts      # GET/POST configuración del jugador
├── components/
│   ├── GameCanvas.tsx           # loop principal del juego, monta el <canvas>
│   ├── HUD.tsx
│   └── ScreenGameOver.tsx
├── game/                        # lógica pura del juego (independiente de React)
│   ├── grid.ts
│   ├── player.ts
│   ├── enemies.ts               # incluye EnemyFactory (Factory Method)
│   ├── items.ts
│   ├── collisions.ts
│   ├── difficultyStrategy.ts    # Strategy: EasyStrategy/MediumStrategy/HardStrategy
│   ├── gameEvents.ts            # Observer: emisor de eventos (score, colisión, game over)
│   ├── palette.ts
│   ├── sprites.ts
│   └── fx.ts
├── lib/
│   ├── db.ts                    # Singleton: conexión única a SQLite
│   └── repositories/
│       └── scoreRepository.ts   # Repository: abstrae acceso a datos de puntuaciones
└── plan.md
```

**Separación de responsabilidades (MVC/MVVM)**: la carpeta `game/` es el **modelo** (lógica pura, sin saber nada de React ni de DOM), `components/` es la **vista** (React + Canvas), y los hooks de `GameCanvas.tsx` actúan como **controlador** (conectan input del usuario con el modelo y disparan renders).

---

## 5. Modelo de datos (SQLite)

Basado en el modelo sugerido de la guía:

```sql
CREATE TABLE jugadores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  avatar_url VARCHAR(255)
);

CREATE TABLE partidas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jugador_id INTEGER REFERENCES jugadores(id),
  puntuacion INTEGER NOT NULL DEFAULT 0,
  nivel_alcanzado INTEGER DEFAULT 1,
  duracion_segundos INTEGER,
  dificultad VARCHAR(20) DEFAULT 'medio',
  fecha_partida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finalizada BOOLEAN DEFAULT FALSE
);

CREATE TABLE configuraciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jugador_id INTEGER REFERENCES jugadores(id),
  dificultad_preferida VARCHAR(20) DEFAULT 'medio',
  sonido_activo BOOLEAN DEFAULT TRUE,
  controles_personalizados TEXT -- JSON con teclas
);
```

---

## 6. API REST (Next.js API Routes)

| Endpoint | Método | Función |
|---|---|---|
| `/api/players` | POST | Registrar/loguear jugador por nombre de usuario |
| `/api/players/:id/stats` | GET | Estadísticas del jugador (partidas jugadas, mejor puntuación, tiempo total) |
| `/api/scores` | GET | Top 10 puntuaciones globales |
| `/api/scores` | POST | Guardar una partida finalizada |
| `/api/config/:jugadorId` | GET / POST | Leer/guardar configuración (dificultad, sonido, controles) |

Validación de datos en ambos lados (formulario en el cliente antes de enviar, y validación de tipos/rangos en cada `route.ts` antes de tocar la base).

---

## 7. Patrones de diseño (puntos extra — hasta +15)

| Patrón | Dónde se aplica |
|---|---|
| **Singleton** | `lib/db.ts` — una única conexión a SQLite reutilizada en toda la app |
| **Factory Method** | `game/enemies.ts` — `EnemyFactory.create("nobbin")` vs `EnemyFactory.create("hobbin")` |
| **Observer** | `game/gameEvents.ts` — el motor emite eventos (`onScore`, `onCollision`, `onGameOver`) y HUD/sonido/persistencia se suscriben sin acoplarse entre sí |
| **Strategy** | `game/difficultyStrategy.ts` — `EasyStrategy`, `MediumStrategy`, `HardStrategy` cambian velocidad de enemigos y frecuencia de spawns |
| **Repository** | `lib/repositories/scoreRepository.ts` — abstrae el acceso a `partidas`, facilita testear con un mock en vez de tocar SQLite real |
| **MVC/MVVM** | Separación `game/` (modelo) / `components/` (vista) / hooks del `GameCanvas` (controlador), como se explicó en la sección 4 |

Documentar cada patrón aplicado con un comentario breve en el código + una sección en el README (para maximizar los puntos extra, ya que la guía pide que estén "documentados").

---

## 8. Fases de desarrollo (3 semanas)

### Semana 1 — Diseño y esqueleto
- Setup del proyecto Next.js, estructura de carpetas.
- Modelo de datos y conexión SQLite (Singleton).
- `GameCanvas.tsx` con el pipeline de renderizado pixel art (canvas baja resolución + escalado).
- Movimiento del jugador y cavado de túneles (lógica en `game/`, sin persistencia todavía).
- Pantalla de inicio con registro/login por nombre de usuario.

### Semana 2 — Juego funcional + Backend conectado
- Ítems (esmeraldas, oro), enemigos con `EnemyFactory`, colisiones, disparo, bolsas de oro.
- Sistema de vidas, puntaje, niveles, pantalla de Game Over.
- API Routes: `/api/players`, `/api/scores`, `/api/config`.
- Conectar frontend-backend: guardar partida al finalizar, mostrar leaderboard, guardar/leer configuración de dificultad.
- Aplicar `Strategy` (dificultad) y `Observer` (eventos del juego).

### Semana 3 — Pulido y presentación
- Efectos "juicy" (partículas, screen shake, flash, scanlines).
- Perfil de jugador con estadísticas personales.
- Aplicar `Repository` si no se hizo antes; revisar que todos los patrones estén documentados.
- README completo (descripción, stack, diagrama de arquitectura, instalación/ejecución).
- Deploy en Vercel (URL de despliegue).
- Preparar poster, video demo y presentación.

---

## 9. Checklist de entregables

- [ ] Repositorio GitHub con commits frecuentes de ambos integrantes
- [ ] README.md (descripción, stack, diagrama de arquitectura, instalación)
- [ ] Video demo (3-5 min)
- [ ] Presentación en clase (15 min)
- [ ] Poster
- [ ] URL de despliegue en Vercel
- [ ] Patrones de diseño documentados en el código y en el README

---

## 10. Siguientes pasos inmediatos

1. `npx create-next-app@latest` y armar la estructura de carpetas de la sección 4.
2. Definir la paleta de colores fija en `game/palette.ts`.
3. Montar `GameCanvas.tsx` con el canvas de baja resolución escalado (validar que el pixel art se vea bien antes de seguir).
4. Crear las 3 tablas en SQLite y el Singleton de conexión en `lib/db.ts`.
