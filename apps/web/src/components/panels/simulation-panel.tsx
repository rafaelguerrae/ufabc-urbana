"use client";

import { useSyncExternalStore } from "react";

import { MAX_RADIUS_M, MIN_RADIUS_M, type BrushMode, type Simulation } from "#lib/simulation";
import { changeLabel, SimulationCard } from "#components/cards/simulation-card";
import { PanelHeader } from "./panel-header";
import { SheetPanel } from "./sheet-panel";

interface SimulationPanelProps {
  open: boolean;
  sim: Simulation | null;
  /** Null: the map is being moved instead of painted. */
  brush: BrushMode | null;
  radiusM: number;
  onBrushChange: (brush: BrushMode | null) => void;
  onRadiusChange: (radiusM: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onClose: () => void;
}

const BUTTON =
  "inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-[10px] border px-3 text-[0.85rem] font-semibold transition-[background-color,scale] duration-[180ms] ease-[ease] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const IDLE = "border-border bg-button text-foreground hover:bg-button-hover";
const ACTIVE = "border-accent bg-accent text-accent-contrast";

const TOOLS: { value: BrushMode | null; label: string; keys?: string }[] = [
  { value: "paint", label: "Pintar" },
  { value: "erase", label: "Apagar", keys: "E" },
  { value: null, label: "Mover o mapa" },
];

export function SimulationPanel({ open, sim, onClose, ...props }: SimulationPanelProps) {
  return (
    <SheetPanel side="right" id="simulation-panel" label="Simular vegetação" open={open} onClose={onClose} initialSnap="peek">
      <PanelHeader title="Simular vegetação" closeLabel="Fechar a simulação" onClose={onClose}>
        {sim && <HeaderSummary sim={sim} />}
      </PanelHeader>
      {sim && <SimulationBody sim={sim} {...props} />}
    </SheetPanel>
  );
}

/** One line in the sticky header, so the result stays visible when the mobile sheet is at its smallest height. */
function HeaderSummary({ sim }: { sim: Simulation }) {
  const { stats } = useSyncExternalStore(sim.subscribe, sim.getSnapshot, sim.getSnapshot);
  return (
    <p className="text-[0.85rem] leading-[1.35] text-muted" aria-hidden>
      {stats ? (
        <>
          <strong className="text-foreground">Simulado: {changeLabel(stats)}</strong> na temperatura da superfície
        </>
      ) : (
        "Pinte no mapa para ver o que muda"
      )}
    </p>
  );
}

function SimulationBody({ sim, brush, radiusM, onBrushChange, onRadiusChange, onUndo, onRedo, onClear }: Omit<SimulationPanelProps, "open" | "onClose" | "sim"> & { sim: Simulation }) {
  const { stats, canUndo, canRedo } = useSyncExternalStore(sim.subscribe, sim.getSnapshot, sim.getSnapshot);

  if (!sim.usable) {
    return (
      <p className="text-[0.85rem] leading-normal text-muted" role="status">
        Não há dados suficientes para estimar o efeito da vegetação nas cidades do mapa, então a simulação está desativada.
      </p>
    );
  }

  return (
    <>
      <p className="text-[0.85rem] leading-normal text-muted">
        Pinte áreas do mapa para imaginar mais vegetação ali e ver quanto a temperatura da superfície mudaria, segundo a
        relação que os dados já mostram.
      </p>

      <div role="radiogroup" aria-label="Ferramenta" className="flex gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.label}
            type="button"
            role="radio"
            aria-checked={brush === t.value}
            aria-keyshortcuts={t.keys}
            title={t.keys ? `${t.label} (${t.keys})` : t.label}
            className={`${BUTTON} ${brush === t.value ? ACTIVE : IDLE}`}
            onClick={() => onBrushChange(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-[0.85rem] text-muted">
        <span>
          Tamanho do pincel: <strong className="text-foreground tabular-nums">{radiusM.toLocaleString("pt-BR")} m</strong> de raio
        </span>
        <input
          type="range"
          min={MIN_RADIUS_M}
          max={MAX_RADIUS_M}
          step={10}
          value={radiusM}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          aria-keyshortcuts="- +"
          className="w-full accent-accent"
        />
      </label>

      <div className="flex gap-2">
        <button type="button" className={`${BUTTON} ${IDLE}`} onClick={onUndo} disabled={!canUndo} aria-keyshortcuts="Control+Z" title="Desfazer (Ctrl+Z)">
          Desfazer
        </button>
        <button type="button" className={`${BUTTON} ${IDLE}`} onClick={onRedo} disabled={!canRedo} aria-keyshortcuts="Control+Shift+Z" title="Refazer (Ctrl+Shift+Z)">
          Refazer
        </button>
        <button type="button" className={`${BUTTON} ${IDLE}`} onClick={onClear} disabled={!canUndo && !canRedo && !stats}>
          Limpar
        </button>
      </div>

      <p className="hidden text-[0.8rem] leading-normal text-muted mobile:block">
        Arraste um dedo para pintar. Para mover o mapa ou dar zoom, use dois dedos.
      </p>

      <SimulationCard stats={stats} scenarios={sim.scenarios} />
    </>
  );
}
