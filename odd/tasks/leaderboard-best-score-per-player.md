# Leaderboard: one best score per player

## Objective
Show at most one leaderboard row per player, using that player's highest recorded score.

## Decisions and scope
- Deduplicate by stable `jugador_id`, not display name.
- Keep the game row with greatest `puntuacion` across all difficulties. For equal scores, prefer latest `fecha_partida`, then highest `id` for deterministic output. Display level and difficulty from the selected row.
- Rank the deduplicated player rows by score descending (then date and id descending) and apply the requested limit after per-player selection.
- No UI redesign or difficulty-specific leaderboard. Preserve unrelated user work and protected untracked `bun.lock`/`test-results/`; no commit/push unless asked.

## Tasks
- [x] LB-1 — Add a deterministic repository-query regression first. Added an injectable repository factory and fake tagged SQL client; expected RED observed at the missing `ROW_NUMBER()` assertion.
- [x] LB-2 — Updated `topScores` with per-`jugador_id` row ranking, deterministic score/date/id tie-breaks, rank-1 selection, and final ordering/limit.
- [x] LB-3 — Independent verification passed: 20 unit tests, TypeScript, lint, and diff check; unrelated worktree changes remained unstaged. No configured test database exists, so PostgreSQL integration was not run.

## Validation
- The Playwright unit suite passed all 20 tests, including the SQL contract regression for player partitioning, per-player score/date/id ordering, rank-1 filtering, final winner ordering, and bound `limit`.
- `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. No PostgreSQL test database was configured; the test uses a fake tagged SQL client and does not execute against a real database.

## Progress
- Read-only exploration found `GET /api/scores` delegates to `ScoreRepository.topScores(limit)`. Current SQL selects every `partidas` row and applies only `ORDER BY puntuacion DESC LIMIT`; the UI simply displays returned rows.
- Added `createScoreRepository(db)` as a minimal test seam while preserving `getScoreRepository()` as its normal production wrapper. The fake tagged client avoids any database connection.
- Initial RED attempt used `bun:test` and stopped at module resolution; corrected the import to this repository's `@playwright/test` runner. The focused regression then compiled and failed as expected because the existing query lacks `ROW_NUMBER()`.
- The screenshot shows repeated rows for `Mendoza000`; the data model joins by `jugador_id`, which is the correct identity to deduplicate.
- LB-2's SQL ranks all game rows by `ROW_NUMBER() OVER (PARTITION BY p.jugador_id ORDER BY p.puntuacion DESC, p.fecha_partida DESC, p.id DESC)`, selects rank 1, joins the winner to the player's username, then orders and limits the distinct players.
- The full unit suite passed (20 tests), `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. The fake SQL client avoids connecting to a database; PostgreSQL integration remains unverified because no test database is configured.
