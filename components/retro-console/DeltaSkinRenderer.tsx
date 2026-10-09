"use client";

import type { CSSProperties, ReactNode } from "react";
import type { SkinConfig, SkinFrame } from "@/lib/delta-skins";

export function computeSkinScreenStyle(frame: SkinFrame, mappingSize: { width: number; height: number }) {
  const percent = (value: number) => `${Number(((value / mappingSize.width) * 100).toFixed(3))}%`;
  const verticalPercent = (value: number) => `${Number(((value / mappingSize.height) * 100).toFixed(3))}%`;
  return {
    left: percent(frame.x),
    top: verticalPercent(frame.y),
    width: percent(frame.width),
    height: verticalPercent(frame.height),
  };
}

const SUPPORTED_INPUTS = new Set(["up", "down", "left", "right", "a", "b"]);
export function unsupportedSkinOperations(inputs: string[]): string[] {
  return [...new Set(inputs.filter(input => !SUPPORTED_INPUTS.has(input)))];
}

export function bundledSkinStatusMessage(config: SkinConfig): string {
  const inputs = config.items.flatMap(item => Array.isArray(item.inputs) ? item.inputs : Object.values(item.inputs).flatMap(value => Array.isArray(value) ? value : [value]));
  const actions = unsupportedSkinOperations(inputs);
  return actions.length ? `Candybar ${actions.join(", ")} actions are unsupported.` : "Candybar is ready.";
}

interface Props {
  config: SkinConfig;
  artwork: string;
  children: ReactNode;
  controls?: ReactNode;
  label: string;
}

export default function DeltaSkinRenderer({ config, artwork, children, controls, label }: Props) {
  const frame = config.screens[0]?.outputFrame;
  const style = frame ? computeSkinScreenStyle(frame, config.mappingSize) : undefined;
  return (
    <div
      className="game-console delta-skin-renderer"
      data-testid="delta-skin-renderer"
      data-mapping-width={config.mappingSize.width}
      data-mapping-height={config.mappingSize.height}
      aria-label={`${label} game console`}
      style={{ aspectRatio: `${config.mappingSize.width} / ${config.mappingSize.height}`, backgroundImage: `url("${artwork}")`, "--skin-width": config.mappingSize.width, "--skin-height": config.mappingSize.height, "--skin-artwork": `url("${artwork}")`, "--skin-fit-width": `${(config.mappingSize.width / config.mappingSize.height) * 100}dvh` } as CSSProperties}
    >
      {style && <div className="delta-skin-screen-frame" style={style}>{children}</div>}
      {controls && <div className="delta-skin-control-layer">{controls}</div>}
    </div>
  );
}
