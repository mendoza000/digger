import { PALETTE } from "@/game/palette";

interface LegendRow {
  label: string;
  description: string;
  color: string;
  shape: "diamond" | "circle" | "square";
}

const LEGEND: LegendRow[] = [
  {
    label: "Esmeralda",
    description: "+50 puntos, solo tocarla",
    color: PALETTE.emerald,
    shape: "diamond",
  },
  {
    label: "Oro",
    description: "+150 puntos, solo tocarlo",
    color: PALETTE.gold,
    shape: "circle",
  },
  {
    label: "Bolsa de oro",
    description: "cae si cavás la tierra de abajo — te aplasta a vos o a un enemigo",
    color: PALETTE.playerDark,
    shape: "square",
  },
  {
    label: "Nobbin",
    description: "te persigue y puede cavar tierra",
    color: PALETTE.enemyNobbin,
    shape: "circle",
  },
  {
    label: "Hobbin",
    description: "te persigue, pero solo por túneles ya cavados",
    color: PALETTE.enemyHobbin,
    shape: "circle",
  },
];

const SHAPE_CLASS: Record<LegendRow["shape"], string> = {
  diamond: "rotate-45 rounded-[2px]",
  circle: "rounded-full",
  square: "rounded-sm",
};

export default function HowToPlay() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded border border-zinc-800 p-4 text-sm">
      <h3 className="text-center text-zinc-400">Cómo jugar</h3>

      <ul className="flex flex-col gap-2">
        {LEGEND.map((row) => (
          <li key={row.label} className="flex items-center gap-3">
            <span
              className={`h-3 w-3 flex-none ${SHAPE_CLASS[row.shape]}`}
              style={{ backgroundColor: row.color }}
            />
            <span>
              <span className="text-zinc-100">{row.label}</span>
              <span className="text-zinc-500"> — {row.description}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1 border-t border-zinc-800 pt-3 text-zinc-500">
        <p>
          <span className="text-zinc-300">Moverse/cavar:</span> flechas o WASD
        </p>
        <p>
          <span className="text-zinc-300">Disparar:</span> espacio — un tiro a
          la vez, solo viaja por túnel ya cavado
        </p>
        <p>
          <span className="text-zinc-300">Vidas:</span> se pierden al chocar
          con un enemigo o al recibir una bolsa de oro encima
        </p>
        <p>
          <span className="text-zinc-300">Nivel:</span> termina al recolectar
          todos los ítems del mapa
        </p>
      </div>
    </div>
  );
}
