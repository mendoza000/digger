// Motor de audio 100% sintetizado con Web Audio API — mismo espíritu
// "todo por código" que la paleta y los sprites: cero archivos de audio.
//
// Singleton: un solo AudioContext compartido por toda la app (crear uno
// por partida/componente es wasteful y los navegadores limitan cuántos
// se pueden tener activos).
let audioContext: AudioContext | null = null;
let soundEnabled = true;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (!enabled) stopMusic();
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

// Los navegadores solo permiten arrancar/reanudar audio dentro de un gesto
// del usuario (ej. el click de "Jugar") — llamar esto ahí, sincrónicamente.
export function unlockAudio(): void {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }
}

function playTone(
  freq: number,
  durationMs: number,
  type: OscillatorType = "square",
  volume = 0.15
): void {
  if (!soundEnabled) return;
  const ctx = getContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = freq;

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + durationMs / 1000);
}

// Envolvente distinta para la música: sostenida la mayor parte de la nota
// con un release corto al final, en vez del decaimiento inmediato de
// playTone (que está pensado para blips cortos de efectos). Sin esto, la
// música sonaba como blips aislados con silencio entre medio — se perdía
// contra los efectos, más fuertes y más "llenos".
function playMusicNote(freq: number, durationMs: number): void {
  if (!soundEnabled) return;
  const ctx = getContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = freq;

  const now = ctx.currentTime;
  const durationSec = durationMs / 1000;
  const volume = 0.09;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.02);
  gain.gain.setValueAtTime(volume, now + durationSec * 0.7);
  gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + durationSec);
}

export function playPickup(): void {
  playTone(880, 90, "square");
  setTimeout(() => playTone(1320, 90, "square"), 60);
}

export function playEnemyDown(): void {
  playTone(440, 80, "square");
  setTimeout(() => playTone(220, 130, "square"), 70);
}

export function playShoot(): void {
  playTone(220, 60, "sawtooth", 0.1);
}

export function playHit(): void {
  playTone(150, 220, "sawtooth", 0.2);
}

export function playLevelComplete(): void {
  [523, 659, 784, 1046].forEach((freq, i) =>
    setTimeout(() => playTone(freq, 140, "square"), i * 110)
  );
}

export function playGameOver(): void {
  [392, 349, 311, 261].forEach((freq, i) =>
    setTimeout(() => playTone(freq, 220, "triangle", 0.18), i * 180)
  );
}

const MUSIC_LOOP = [261, 293, 329, 261, 196, 220, 246, 196];
const MUSIC_STEP_MS = 260;

export function startMusic(): void {
  if (musicTimer || !soundEnabled) return;
  unlockAudio();
  musicStep = 0;
  musicTimer = setInterval(() => {
    if (!soundEnabled) return;
    // La nota casi llena el paso (solo 10ms de margen) para que no queden
    // huecos de silencio audibles entre una nota y la siguiente.
    playMusicNote(MUSIC_LOOP[musicStep % MUSIC_LOOP.length], MUSIC_STEP_MS - 10);
    musicStep++;
  }, MUSIC_STEP_MS);
}

export function stopMusic(): void {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}
