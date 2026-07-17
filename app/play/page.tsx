"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GameCanvas from "@/components/GameCanvas";
import HUD from "@/components/HUD";
import HowToPlay from "@/components/HowToPlay";
import PauseMenu from "@/components/PauseMenu";
import ScreenGameOver from "@/components/ScreenGameOver";
import type { Difficulty } from "@/game/difficultyStrategy";
import type { GameOverResult, HudState } from "@/game/engine";
import { setSoundEnabled, unlockAudio } from "@/game/audio";

interface StoredPlayer {
  id: number;
  username: string;
}

function readStoredPlayer(): StoredPlayer | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("digger.player");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPlayer>;
    if (typeof parsed.id !== "number" || typeof parsed.username !== "string") {
      return null;
    }
    return { id: parsed.id, username: parsed.username };
  } catch {
    return null;
  }
}

type Screen = "menu" | "playing" | "gameOver";

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facil: "Fácil",
  medio: "Medio",
  dificil: "Difícil",
};

const DIFFICULTY_OPTIONS: Difficulty[] = ["facil", "medio", "dificil"];

const COLLISION_MESSAGE: Record<"enemy" | "goldBag", string> = {
  enemy: "¡Te atrapó un enemigo!",
  goldBag: "¡Te aplastó una bolsa de oro!",
};

const TOAST_DURATION_MS = 1600;

interface Toast {
  message: string;
  kind: "danger" | "success";
}

export default function PlayPage() {
  const router = useRouter();
  const [player] = useState(readStoredPlayer);
  const [screen, setScreen] = useState<Screen>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("medio");
  const [soundOn, setSoundOn] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [hud, setHud] = useState<HudState>({ score: 0, lives: 3, level: 1 });
  const [gameOverResult, setGameOverResult] = useState<GameOverResult | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!player) router.replace("/");
  }, [player, router]);

  useEffect(() => {
    if (!player) return;
    fetch(`/api/config/${player.id}`)
      .then((res) => res.json())
      .then((data: { dificultad_preferida?: string; sonido_activo?: boolean }) => {
        if (
          data.dificultad_preferida === "facil" ||
          data.dificultad_preferida === "medio" ||
          data.dificultad_preferida === "dificil"
        ) {
          setDifficulty(data.dificultad_preferida);
        }
        if (typeof data.sonido_activo === "boolean") {
          setSoundOn(data.sonido_activo);
          setSoundEnabled(data.sonido_activo);
        }
      })
      .catch(() => {})
      .finally(() => setConfigLoaded(true));
  }, [player]);

  const saveConfig = (nextDifficulty: Difficulty, nextSoundOn: boolean) => {
    if (!player) return;
    fetch(`/api/config/${player.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dificultadPreferida: nextDifficulty,
        sonidoActivo: nextSoundOn,
      }),
    }).catch(() => {});
  };

  const handleSelectDifficulty = (value: Difficulty) => {
    setDifficulty(value);
    saveConfig(value, soundOn);
  };

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    saveConfig(difficulty, next);
  };

  const handleStart = () => {
    unlockAudio(); // gesto del usuario: acá es donde el navegador permite arrancar audio
    setHud({ score: 0, lives: 3, level: 1 });
    setGameOverResult(null);
    setPaused(false);
    setSessionKey((key) => key + 1);
    setScreen("playing");
  };

  const handleEscape = useCallback(() => setPaused((p) => !p), []);
  const handleResume = () => setPaused(false);
  const handleQuitToMenu = () => {
    setPaused(false);
    setScreen("menu");
  };

  const handleHudChange = useCallback((next: HudState) => {
    setHud(next);
  }, []);

  const showToast = useCallback((toastToShow: Toast) => {
    setToast(toastToShow);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  const handleCollision = useCallback(
    (cause: "enemy" | "goldBag") =>
      showToast({ message: COLLISION_MESSAGE[cause], kind: "danger" }),
    [showToast]
  );

  const handleLevelComplete = useCallback(
    (completedLevel: number) => {
      showToast({
        message: `¡Nivel ${completedLevel} completado! Vas al ${completedLevel + 1}`,
        kind: "success",
      });
    },
    [showToast]
  );

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const handleGameOver = useCallback(
    (result: GameOverResult) => {
      setGameOverResult(result);
      setScreen("gameOver");

      if (!player) return;
      fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jugadorId: player.id,
          puntuacion: result.score,
          nivelAlcanzado: result.level,
          duracionSegundos: result.durationSeconds,
          dificultad: difficulty,
          finalizada: true,
        }),
      }).catch(() => {});
    },
    [player, difficulty]
  );

  if (!player) return null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-950 py-8 font-mono text-zinc-100">
      <p className="text-sm text-zinc-400">
        jugando como <span className="text-amber-400">{player.username}</span>
      </p>

      {screen === "menu" && (
        <div className="flex w-full max-w-sm flex-col gap-4 rounded border border-zinc-800 p-6">
          <h2 className="text-center text-lg text-amber-400">Elegí dificultad</h2>
          <div className="flex flex-col gap-2">
            {DIFFICULTY_OPTIONS.map((value) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded border border-zinc-700 px-3 py-2"
              >
                <input
                  type="radio"
                  name="difficulty"
                  checked={difficulty === value}
                  disabled={!configLoaded}
                  onChange={() => handleSelectDifficulty(value)}
                />
                {DIFFICULTY_LABEL[value]}
              </label>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded border border-zinc-700 px-3 py-2">
            <input
              type="checkbox"
              checked={soundOn}
              disabled={!configLoaded}
              onChange={handleToggleSound}
            />
            🔊 Sonido y música
          </label>
          <button
            type="button"
            disabled={!configLoaded}
            onClick={handleStart}
            className="rounded bg-amber-500 px-4 py-3 font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            Jugar
          </button>
        </div>
      )}

      {screen === "menu" && <HowToPlay />}

      {screen === "playing" && (
        <>
          <HUD score={hud.score} lives={hud.lives} level={hud.level} />
          <div className="relative">
            {toast && (
              <p
                className={`absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-3 py-1 text-sm ${
                  toast.kind === "danger"
                    ? "bg-red-950/90 text-red-300"
                    : "bg-emerald-950/90 text-emerald-300"
                }`}
              >
                {toast.message}
              </p>
            )}
            <GameCanvas
              key={sessionKey}
              difficulty={difficulty}
              paused={paused}
              onHudChange={handleHudChange}
              onGameOver={handleGameOver}
              onCollision={handleCollision}
              onLevelComplete={handleLevelComplete}
              onEscape={handleEscape}
            />
            {paused && (
              <PauseMenu
                onResume={handleResume}
                onRestart={handleStart}
                onQuit={handleQuitToMenu}
              />
            )}
          </div>
        </>
      )}

      {screen === "gameOver" && gameOverResult && (
        <ScreenGameOver
          result={gameOverResult}
          onRestart={() => setScreen("menu")}
        />
      )}
    </div>
  );
}
