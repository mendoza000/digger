interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export default function PauseMenu({ onResume, onRestart, onQuit }: PauseMenuProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85">
      <h2 className="text-2xl font-bold text-amber-400">Pausa</h2>
      <button
        type="button"
        onClick={onResume}
        className="w-48 rounded bg-amber-500 px-4 py-3 font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
      >
        Continuar
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="w-48 rounded border border-zinc-700 px-4 py-3 text-zinc-100 transition-colors hover:border-amber-400"
      >
        Reiniciar
      </button>
      <button
        type="button"
        onClick={onQuit}
        className="w-48 rounded border border-zinc-700 px-4 py-3 text-zinc-100 transition-colors hover:border-amber-400"
      >
        Salir al menú
      </button>
      <p className="text-xs text-zinc-500">Esc para continuar</p>
    </div>
  );
}
