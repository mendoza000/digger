"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import GameCanvas from "@/components/GameCanvas";
import HUD from "@/components/HUD";
import HowToPlay from "@/components/HowToPlay";
import PauseMenu from "@/components/PauseMenu";
import ScreenGameOver from "@/components/ScreenGameOver";
import type { Difficulty } from "@/game/difficultyStrategy";
import type { GameOverResult, HudState } from "@/game/engine";
import { setSoundEnabled, unlockAudio } from "@/game/audio";
import candybarInfo from "../../public/skins/candybar/info.json";
import { parseDeltaSkin, type NormalizedSkin, type SkinConfig } from "@/lib/delta-skins";
import { bundledSkinStatusMessage } from "@/components/retro-console/DeltaSkinRenderer";
import { isTouchCompactViewport, selectSkinConfiguration } from "@/lib/delta-skins/orientation";

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

const HAPTICS_EVENT = "digger-haptics-change";
function subscribeHaptics(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(HAPTICS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(HAPTICS_EVENT, callback);
  };
}
function getHapticsPreference() {
  try { return window.localStorage.getItem("digger.haptics") === "true"; } catch { return false; }
}

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
  const hapticsOn = useSyncExternalStore(subscribeHaptics, getHapticsPreference, () => false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [hud, setHud] = useState<HudState>({ score: 0, lives: 3, level: 1 });
  const [gameOverResult, setGameOverResult] = useState<GameOverResult | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [touchCompact, setTouchCompact] = useState(false);
  const [importedSkin, setImportedSkin] = useState<{ skin: NormalizedSkin; urls: Record<string, string>; name: string } | null>(null);
  const [skinMessageOverride, setSkinMessageOverride] = useState<string | null>(null);
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

  const handleToggleHaptics = () => {
    const next = !hapticsOn;
    try { window.localStorage.setItem("digger.haptics", String(next)); } catch { /* local preference is optional */ }
    window.dispatchEvent(new Event(HAPTICS_EVENT));
  };

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    saveConfig(difficulty, next);
  };

  useEffect(() => {
    const query = window.matchMedia("(orientation: landscape)");
    const update = () => {
      const nextOrientation = query.matches ? "landscape" : "portrait";
      setOrientation(nextOrientation);
      setTouchCompact(isTouchCompactViewport(navigator.maxTouchPoints, window.innerWidth, window.innerHeight));
    };
    update();
    window.addEventListener("resize", update);
    query.addEventListener("change", update);
    return () => { window.removeEventListener("resize", update); query.removeEventListener("change", update); };
  }, []);

  useEffect(() => () => {
    if (importedSkin) Object.values(importedSkin.urls).forEach(URL.revokeObjectURL);
  }, [importedSkin]);

  const handleSkinUpload = async (file?: File) => {
    if (!file) return;
    if (file.name.toLowerCase().endsWith(".pdf")) {
      setSkinMessageOverride("PDF Delta skins are not supported. Import a PNG-based .deltaskin archive.");
      return;
    }
    try {
      const parsed = await parseDeltaSkin(new Uint8Array(await file.arrayBuffer()));
      const urls = Object.fromEntries(Object.entries(parsed.assetData).map(([path, bytes]) => [path, URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "image/png" }))]));
      setImportedSkin({ skin: parsed, urls, name: file.name });
      setSkinMessageOverride("Skin imported.");
    } catch (error) {
      setImportedSkin(null);
      setSkinMessageOverride(error instanceof Error ? error.message : "Could not load this Delta skin.");
    }
  };

  const bundledConfigs = (candybarInfo as unknown as { representations: { iphone: { edgeToEdge: Record<"portrait" | "landscape", SkinConfig> } } }).representations.iphone.edgeToEdge;
  const selectedSkin = selectSkinConfiguration(importedSkin?.skin.configurations ?? null, bundledConfigs, orientation);
  const activeConfig = selectedSkin.config;
  const activeArtwork = selectedSkin.fallback ? `/skins/candybar/${activeConfig.assets.large}` : importedSkin?.urls[activeConfig.assets.large] ?? `/skins/candybar/${activeConfig.assets.large}`;
  const skinMessage = skinMessageOverride
    ? importedSkin && skinMessageOverride === "Skin imported."
      ? `${skinMessageOverride} ${selectedSkin.fallbackMessage ?? ""} ${bundledSkinStatusMessage(activeConfig)}`
      : skinMessageOverride
    : bundledSkinStatusMessage(activeConfig);

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
    <div className={`play-page flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-950 py-8 font-mono text-zinc-100 ${screen === "playing" ? "is-playing" : ""} ${touchCompact ? "touch-skin-enabled" : ""}`}>
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
          <label className="flex cursor-pointer items-center gap-2 rounded border border-zinc-700 px-3 py-2">
            <input type="checkbox" checked={hapticsOn} onChange={handleToggleHaptics} />
            📳 Haptics
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
      {screen === "menu" && <div className="skin-picker"><label>Console skin <input aria-label="Import Delta skin" type="file" accept=".deltaskin,application/zip" onChange={event => void handleSkinUpload(event.target.files?.[0])} /></label>{importedSkin && <button type="button" onClick={() => { setImportedSkin(null); setSkinMessageOverride(null); }}>Use bundled Candybar</button>}{skinMessage && <p role="status">{skinMessage}</p>}</div>}

      {screen === "playing" && (
        <>
          <div className="relative w-full game-stage">
            <HUD score={hud.score} lives={hud.lives} level={hud.level} />
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
              skinConfig={activeConfig}
              skinArtwork={activeArtwork}
              skinName={selectedSkin.fallback ? "Candybar (landscape fallback)" : importedSkin?.name ?? "Candybar"}
              hapticsEnabled={hapticsOn}
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
