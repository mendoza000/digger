"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,50}$/;

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clientError = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    if (!USERNAME_PATTERN.test(trimmed)) {
      return "3-50 caracteres: letras, números, _ o -";
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = username.trim();
    const validationError = clientError(trimmed) ?? (trimmed.length === 0 ? "ingresá un nombre de usuario" : null);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "no se pudo iniciar sesión");
        return;
      }

      sessionStorage.setItem(
        "digger.player",
        JSON.stringify({ id: data.id, username: data.username })
      );
      router.push("/play");
    } catch {
      setError("no se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-950 font-mono text-zinc-100">
      <main className="flex w-full max-w-sm flex-col gap-6 px-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-amber-400">
            DIGGER
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            ingresá tu nombre de usuario para jugar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setError(null);
            }}
            placeholder="nombre_usuario"
            maxLength={50}
            autoFocus
            disabled={loading}
            className="rounded border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-lg text-zinc-100 outline-none focus:border-amber-400 disabled:opacity-50"
          />
          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-amber-500 px-4 py-3 font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "entrando..." : "jugar"}
          </button>
        </form>
      </main>
    </div>
  );
}
