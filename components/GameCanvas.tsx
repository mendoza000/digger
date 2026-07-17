"use client";

import { useEffect, useRef } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE } from "@/game/constants";
import { createGameEngine, type GameEngine, type GameOverResult, type HudState } from "@/game/engine";
import type { Difficulty } from "@/game/difficultyStrategy";
import type { Direction } from "@/game/player";
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

const DIRECTION_PRIORITY: Direction[] = ["up", "down", "left", "right"];

function getActiveDirection(heldKeys: Set<Direction>): Direction | null {
  for (const direction of DIRECTION_PRIORITY) {
    if (heldKeys.has(direction)) return direction;
  }
  return null;
}

interface GameCanvasProps {
  difficulty: Difficulty;
  paused: boolean;
  onHudChange: (hud: HudState) => void;
  onGameOver: (result: GameOverResult) => void;
  onCollision?: (cause: "enemy" | "goldBag") => void;
  onLevelComplete?: (level: number) => void;
  onEscape?: () => void;
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
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = createGameEngine(difficulty);
  }

  const heldKeysRef = useRef<Set<Direction>>(new Set());
  const shootRequestedRef = useRef(false);

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
        heldKeysRef.current.add(direction);
        event.preventDefault();
      } else if (SHOOT_KEYS.has(key)) {
        shootRequestedRef.current = true;
        event.preventDefault();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const direction = KEY_DIRECTION[event.key.toLowerCase()];
      if (direction) heldKeysRef.current.delete(direction);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    let rafId = 0;
    let lastTime = 0;

    const loop = (time: number) => {
      if (lastTime === 0) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;

      if (!pausedRef.current) {
        const direction = getActiveDirection(heldKeysRef.current);
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
    };
  }, []);

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
    if (paused) {
      heldKeysRef.current.clear();
      shootRequestedRef.current = false;
      stopMusic();
    } else {
      startMusic();
    }

    return () => stopMusic();
  }, [paused]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{
        width: CANVAS_WIDTH * SCALE,
        height: CANVAS_HEIGHT * SCALE,
        imageRendering: "pixelated",
      }}
    />
  );
}
