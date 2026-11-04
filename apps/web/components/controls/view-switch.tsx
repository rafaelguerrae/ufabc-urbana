"use client";

import { useRef, type KeyboardEvent } from "react";

import { VIEWS, type ViewMode } from "../../lib/indicators";
import { LayerIcon } from "../common/layer-icon";

// Shorter than VIEW_LABEL, which has room for a hint in the side panel.
const LABEL: Record<ViewMode, string> = {
  lst_c: "Calor",
  ndvi: "Vegetação",
  districts: "Distritos",
};

interface ViewSwitchProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  /** Hides the switch on mid-size screens, where an open side panel would cover it. */
  panelOpen: boolean;
}

export function ViewSwitch({ view, onChange, panelOpen }: ViewSwitchProps) {
  const refs = useRef<Partial<Record<ViewMode, HTMLButtonElement | null>>>({});

  // Arrow keys move the selection, like a native radio group.
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = VIEWS[(VIEWS.indexOf(view) + step + VIEWS.length) % VIEWS.length]!;
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <div
      className={`absolute top-3 left-1/2 z-4 flex h-11 -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-button shadow-panel midrange:top-[68px] mobile:top-auto mobile:right-16 mobile:bottom-[min(calc(var(--sheet-height,0px)+24px),calc(100dvh-56px-env(safe-area-inset-top,0px)))] mobile:left-auto mobile:z-8 mobile:translate-x-0 sheet-open:mobile:hidden ${panelOpen ? "midrange:hidden" : ""}`}
      role="radiogroup"
      aria-label="Camada do mapa"
      onKeyDown={onKeyDown}
    >
      {VIEWS.map((v) => (
        <button
          key={v}
          ref={(el) => {
            refs.current[v] = el;
          }}
          type="button"
          role="radio"
          aria-checked={v === view}
          aria-label={LABEL[v]}
          title={LABEL[v]}
          tabIndex={v === view ? 0 : -1}
          className={`inline-flex min-w-[42px] cursor-pointer items-center justify-center gap-2 rounded-none border-0 px-3.5 text-[0.9rem] font-semibold transition-colors duration-[180ms] ease-[ease] not-first:border-l not-first:border-border focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none mobile:w-[42px] mobile:p-0 ${v === view ? "bg-accent text-accent-contrast" : "bg-transparent text-foreground hover:bg-button-hover"}`}
          onClick={() => onChange(v)}
        >
          <LayerIcon view={v} />
          <span className="mobile:hidden">{LABEL[v]}</span>
        </button>
      ))}
    </div>
  );
}
