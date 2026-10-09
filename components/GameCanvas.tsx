"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/game/constants";
import { createGameEngine, type GameEngine, type GameOverResult, type HudState } from "@/game/engine";
import type { Difficulty } from "@/game/difficultyStrategy";
import type { Direction } from "@/game/player";
import { activeDirection, clearInput, createInputState, releaseOwner, setDirection } from "@/lib/game-input";
import { vibrateForTouch } from "@/lib/haptics";
import type { SkinConfig } from "@/lib/delta-skins";
import DeltaSkinRenderer from "@/components/retro-console/DeltaSkinRenderer";
import {
  playEnemyDown,
  playGameOver,
  playHit,
  playLevelComplete,
  playPickup,
  playShoot,
  startMusic,
  stopMusic,
} from "@/game/audio";

const KEY_DIRECTION: Record<string, Direction> = {
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

const SHOOT_KEYS = new Set([" ", "spacebar"]);
interface PressButtonProps {
  label: string; className: string; pressed: boolean;
  direction?: Direction;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerFinish: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

function PressButton({ label, className, pressed, direction, onPointerDown, onPointerMove, onPointerFinish }: PressButtonProps) {
  return <button type="button" aria-label={label} aria-pressed={pressed} data-pressed={pressed ? "true" : undefined}
    data-direction={direction} className={className} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
    onPointerUp={onPointerFinish} onPointerCancel={onPointerFinish} onLostPointerCapture={onPointerFinish}>{label}</button>;
}

interface GameCanvasProps {
  difficulty: Difficulty;
  paused: boolean;
  onHudChange: (hud: HudState) => void;
  onGameOver: (result: GameOverResult) => void;
  onCollision?: (cause: "enemy" | "goldBag") => void;
  onLevelComplete?: (level: number) => void;
  onEscape?: () => void;
  skinConfig?: SkinConfig;
  skinArtwork?: string;
  skinName?: string;
  hapticsEnabled?: boolean;
}

// El estado del juego vive en el engine (game/engine.ts) y en refs, nunca
// en useState de React: así el loop de rAF puede mutar/leer cada frame
// sin disparar un re-render por cada movimiento, disparo o tecla.
//
// Nota: el engine se crea una sola vez con la `difficulty` del primer
// montaje. Si el padre necesita cambiar de dificultad, debe desmontar y
// volver a montar este componente (ej. cambiando un `key`), no esperar
// que reaccione a un cambio de prop en caliente.
export default function GameCanvas({
  difficulty,
  paused,
  onHudChange,
  onGameOver,
  onCollision,
  onLevelComplete,
  onEscape,
  skinConfig,
  skinArtwork,
  skinName = "Candybar",
  hapticsEnabled = false,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = createGameEngine(difficulty);
  }

  const inputRef = useRef(createInputState());
  const activePointersRef = useRef(new Map<number, HTMLButtonElement>());
  const [pressedPointers, setPressedPointers] = useState<Map<number, { direction?: Direction; action?: string }>>(new Map());
  const shootRequestedRef = useRef(false);

  const finishPointer = useCallback((pointerId: number, releaseCapture = true) => {
    const target = activePointersRef.current.get(pointerId);
    if (!target) return;
    activePointersRef.current.delete(pointerId);
    releaseOwner(inputRef.current, pointerId);
    setPressedPointers((current) => { const next = new Map(current); next.delete(pointerId); return next; });
    if (releaseCapture) {
      try {
        if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
      } catch { /* capture may already have been lost */ }
    }
  }, []);
  const clearActiveInput = useCallback(() => {
    for (const pointerId of [...activePointersRef.current.keys()]) finishPointer(pointerId);
    clearInput(inputRef.current);
    setPressedPointers(new Map());
    shootRequestedRef.current = false;
  }, [finishPointer]);

  // El loop de rAF (efecto A, deps []) no puede leer props directamente en
  // cada frame — se reflejan en refs, actualizadas vía efecto en cada
  // cambio (escribir un ref durante el render no está permitido).
  const pausedRef = useRef(paused);
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  // Efecto A (monta una vez): canvas, teclado, loop de rAF. No depende de
  // onHudChange/onGameOver, así el loop nunca se reinicia por eso.
  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (key === "escape") {
        onEscapeRef.current?.();
        event.preventDefault();
        return;
      }

      const direction = KEY_DIRECTION[key];
      if (direction) {
        if (!event.repeat) setDirection(inputRef.current, `key:${key}`, direction);
        event.preventDefault();
      } else if (SHOOT_KEYS.has(key)) {
        shootRequestedRef.current = true;
        event.preventDefault();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const direction = KEY_DIRECTION[event.key.toLowerCase()];
      if (direction) releaseOwner(inputRef.current, `key:${event.key.toLowerCase()}`);
    };
    const clearHeldInput = clearActiveInput;
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearHeldInput);
    document.addEventListener("visibilitychange", clearHeldInput);

    let rafId = 0;
    let lastTime = 0;

    const loop = (time: number) => {
      if (lastTime === 0) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;

      if (!pausedRef.current) {
        const direction = activeDirection(inputRef.current);
        const shoot = shootRequestedRef.current;
        shootRequestedRef.current = false;

        engine.handleInput(direction, shoot);
        engine.tick(delta);
      }
      // Se sigue dibujando aunque esté en pausa: el último frame queda
      // congelado en pantalla, en vez de quedar en blanco.
      engine.draw(ctx);

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearHeldInput);
      document.removeEventListener("visibilitychange", clearHeldInput);
      clearHeldInput();
    };
  }, [clearActiveInput]);

  // Efecto B: se suscribe al Observer del engine. Re-suscribirse cuando
  // cambia la identidad de los callbacks es barato y no toca el loop.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    onHudChange(engine.getHud());

    const unsubscribe = engine.events.on((event) => {
      if (
        event.type === "score" ||
        event.type === "livesChanged" ||
        event.type === "levelComplete"
      ) {
        onHudChange(engine.getHud());
      }
      if (event.type === "gameOver") {
        onGameOver({
          score: event.score,
          level: event.level,
          durationSeconds: event.durationSeconds,
        });
      }
      if (event.type === "collision") {
        onCollision?.(event.cause);
      }
      if (event.type === "levelComplete") {
        onLevelComplete?.(event.level);
      }
    });

    return unsubscribe;
  }, [onHudChange, onGameOver, onCollision, onLevelComplete]);

  // Efecto C: sonido. Es un suscriptor independiente del Observer del
  // engine, sin relación con el efecto B — ni el HUD sabe del sonido ni el
  // sonido sabe del HUD, cada uno reacciona a los mismos eventos por su
  // cuenta. También maneja el ciclo de vida de la música de fondo.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const unsubscribe = engine.events.on((event) => {
      switch (event.type) {
        case "score":
          if (event.source === "item") playPickup();
          else playEnemyDown();
          break;
        case "collision":
          playHit();
          break;
        case "shoot":
          playShoot();
          break;
        case "levelComplete":
          playLevelComplete();
          break;
        case "gameOver":
          playGameOver();
          stopMusic();
          break;
      }
    });

    return () => {
      unsubscribe();
      stopMusic();
    };
  }, []);

  // Efecto D: la música sigue el estado de pausa. Al pausar también se
  // limpian teclas/disparo pendientes para que no se disparen solos apenas
  // se reanuda.
  useEffect(() => {
    const cleanupTimer = paused ? window.setTimeout(clearActiveInput, 0) : undefined;
    if (paused) stopMusic();
    else startMusic();

    return () => {
      if (cleanupTimer !== undefined) window.clearTimeout(cleanupTimer);
      stopMusic();
    };
  }, [paused, clearActiveInput]);

  const handlePointerFinish = (event: React.PointerEvent<HTMLButtonElement>) => {
    finishPointer(event.pointerId, event.type !== "lostpointercapture");
  };
  const startPointer = (event: React.PointerEvent<HTMLButtonElement>, direction?: Direction, action?: string) => {
    event.preventDefault();
    if (activePointersRef.current.has(event.pointerId)) finishPointer(event.pointerId);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* synthetic pointer events cannot acquire capture */ }
    activePointersRef.current.set(event.pointerId, event.currentTarget);
    setPressedPointers((current) => new Map(current).set(event.pointerId, { direction, action }));
    if (direction) setDirection(inputRef.current, event.pointerId, direction);
    else shootRequestedRef.current = true;
    if (hapticsEnabled && event.pointerType === "touch" && typeof navigator !== "undefined") {
      vibrateForTouch({ enabled: true }, { vibrate: (duration) => navigator.vibrate(duration) });
    }
  };
  const movePointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!activePointersRef.current.has(event.pointerId)) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>("[data-direction]");
    const value = target?.dataset.direction as Direction | undefined;
    setDirection(inputRef.current, event.pointerId, value ?? null);
    setPressedPointers((current) => new Map(current).set(event.pointerId, { direction: value }));
  };
  const touchButton = (label: string, direction: Direction) => (
    <PressButton key={direction} label={label} direction={direction} className="game-touch-button"
      pressed={!paused && [...pressedPointers.values()].some((pressed) => pressed.direction === direction)}
      onPointerDown={(event) => startPointer(event, direction)} onPointerMove={movePointer} onPointerFinish={handlePointerFinish} />
  );

  const controls = (
      <div className="game-controls" aria-label="Touch game controls">
        <div className="game-dpad">
          {touchButton("Up", "up")}
          {touchButton("Left", "left")}
          {touchButton("Down", "down")}
          {touchButton("Right", "right")}
        </div>
        <PressButton label="Shoot with A" className="game-touch-button game-shoot game-button-a" pressed={!paused && [...pressedPointers.values()].some((pressed) => pressed.action === "A")} onPointerDown={(event) => startPointer(event, undefined, "A")} onPointerFinish={handlePointerFinish} />
        <PressButton label="Shoot with B" className="game-touch-button game-shoot game-button-b" pressed={!paused && [...pressedPointers.values()].some((pressed) => pressed.action === "B")} onPointerDown={(event) => startPointer(event, undefined, "B")} onPointerFinish={handlePointerFinish} />
      </div>
  );

  const canvas = <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="game-screen" />;
  return skinConfig && skinArtwork ? (
    <DeltaSkinRenderer config={skinConfig} artwork={skinArtwork} label={skinName} controls={controls}>{canvas}</DeltaSkinRenderer>
  ) : <div className="game-console">{canvas}{controls}</div>;
}
