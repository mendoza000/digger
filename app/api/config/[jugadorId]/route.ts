import { NextRequest, NextResponse } from "next/server";
import { getConfigRepository } from "@/lib/repositories/configRepository";
import { isValidDifficulty } from "@/game/difficultyStrategy";

const DEFAULT_CONFIG = { dificultad_preferida: "medio", sonido_activo: true };

function parseJugadorId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jugadorId: string }> }
) {
  const { jugadorId: raw } = await params;
  const jugadorId = parseJugadorId(raw);
  if (jugadorId === null) {
    return NextResponse.json({ error: "jugadorId inválido" }, { status: 400 });
  }

  const config = getConfigRepository().getByPlayerId(jugadorId);
  if (!config) {
    return NextResponse.json(DEFAULT_CONFIG);
  }

  return NextResponse.json({
    dificultad_preferida: config.dificultad_preferida,
    sonido_activo: Boolean(config.sonido_activo),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jugadorId: string }> }
) {
  const { jugadorId: raw } = await params;
  const jugadorId = parseJugadorId(raw);
  if (jugadorId === null) {
    return NextResponse.json({ error: "jugadorId inválido" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "cuerpo inválido" }, { status: 400 });
  }

  const dificultadPreferida =
    typeof body === "object" && body !== null && "dificultadPreferida" in body
      ? (body as { dificultadPreferida: unknown }).dificultadPreferida
      : undefined;
  const sonidoActivo =
    typeof body === "object" && body !== null && "sonidoActivo" in body
      ? (body as { sonidoActivo: unknown }).sonidoActivo
      : undefined;

  if (
    typeof dificultadPreferida !== "string" ||
    !isValidDifficulty(dificultadPreferida) ||
    typeof sonidoActivo !== "boolean"
  ) {
    return NextResponse.json(
      { error: "configuración inválida" },
      { status: 400 }
    );
  }

  try {
    const config = getConfigRepository().upsert(jugadorId, {
      dificultadPreferida,
      sonidoActivo,
    });
    return NextResponse.json({
      dificultad_preferida: config.dificultad_preferida,
      sonido_activo: Boolean(config.sonido_activo),
    });
  } catch {
    // jugadorId no existe en `jugadores` (violación de FK) u otro error.
    return NextResponse.json({ error: "jugadorId inválido" }, { status: 400 });
  }
}
