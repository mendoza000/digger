import { NextRequest, NextResponse } from "next/server";
import {
  getPlayersRepository,
  isValidUsername,
} from "@/lib/repositories/playersRepository";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "cuerpo inválido" }, { status: 400 });
  }

  const username =
    typeof body === "object" && body !== null && "username" in body
      ? (body as { username: unknown }).username
      : undefined;

  if (typeof username !== "string" || !isValidUsername(username)) {
    return NextResponse.json(
      {
        error:
          "el nombre de usuario debe tener entre 3 y 50 caracteres alfanuméricos (o _ y -)",
      },
      { status: 400 }
    );
  }

  try {
    const repository = getPlayersRepository();
    const { player, isNew } = await repository.findOrCreate(username);
    return NextResponse.json({
      id: player.id,
      username: player.nombre_usuario,
      isNew,
    });
  } catch {
    // Dos requests simultáneos para el mismo username nuevo pueden chocar
    // contra el UNIQUE; en ese caso el registro ya existe, lo devolvemos.
    const existing = await getPlayersRepository().findByUsername(username);
    if (existing) {
      return NextResponse.json({
        id: existing.id,
        username: existing.nombre_usuario,
        isNew: false,
      });
    }
    return NextResponse.json({ error: "error interno" }, { status: 500 });
  }
}
