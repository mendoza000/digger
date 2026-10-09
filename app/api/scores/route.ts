import { NextRequest, NextResponse } from "next/server";
import { getScoreRepository } from "@/lib/repositories/scoreRepository";
import { isValidDifficulty } from "@/game/difficultyStrategy";

const DEFAULT_LIMIT = 10;

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : DEFAULT_LIMIT;

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    return NextResponse.json({ error: "limit inválido" }, { status: 400 });
  }

  let scores;
  try {
    scores = await getScoreRepository().topScores(limit);
  } catch {
    return NextResponse.json({ error: "error interno" }, { status: 500 });
  }
  return NextResponse.json({ scores });
}

interface ScoreBody {
  jugadorId: unknown;
  puntuacion: unknown;
  nivelAlcanzado: unknown;
  duracionSegundos: unknown;
  dificultad: unknown;
  finalizada: unknown;
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "cuerpo inválido" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "cuerpo inválido" }, { status: 400 });
  }

  const {
    jugadorId,
    puntuacion,
    nivelAlcanzado,
    duracionSegundos,
    dificultad,
    finalizada,
  } = body as ScoreBody;

  if (
    !isNonNegativeInt(jugadorId) ||
    jugadorId <= 0 ||
    !isNonNegativeInt(puntuacion) ||
    !isNonNegativeInt(nivelAlcanzado) ||
    nivelAlcanzado < 1 ||
    !isNonNegativeInt(duracionSegundos) ||
    typeof dificultad !== "string" ||
    !isValidDifficulty(dificultad) ||
    typeof finalizada !== "boolean"
  ) {
    return NextResponse.json(
      { error: "datos de partida inválidos" },
      { status: 400 }
    );
  }

  try {
    const partida = await getScoreRepository().create({
      jugadorId,
      puntuacion,
      nivelAlcanzado,
      duracionSegundos,
      dificultad,
      finalizada,
    });
    return NextResponse.json({ id: partida.id });
  } catch {
    // jugadorId no existe en `jugadores` (violación de FK) u otro error.
    return NextResponse.json({ error: "jugadorId inválido" }, { status: 400 });
  }
}
