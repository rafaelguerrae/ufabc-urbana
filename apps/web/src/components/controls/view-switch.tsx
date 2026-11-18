"use client";

import { useRef, type KeyboardEvent } from "react";

import { VIEWS, type ViewMode } from "#lib/indicators";
import { LayerIcon } from "#components/common/layer-icon";

// Shorter than VIEW_LABEL, which has room for a hint in the side panel.
const LABEL: Record<ViewMode, string> = {
  lst_c: "Calor",
  ndvi: "Vegetação",
};

// Full class names, so Tailwind can see them.
const SELECTED: Record<ViewMode, string> = {
  lst_c: "border-layer-heat bg-layer-heat text-white",
  ndvi: "border-layer-vegetation bg-layer-vegetation text-white",
};

interface ViewSwitchProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  /** Hides the chips on narrow desktop widths, where an open side panel would cover them. */
  panelOpen: boolean;
}

/**
 * Layer chips next to the search bar, like the category chips of Google Maps. Where the row would run into the
 * buttons on the right (701 to 805 px) it drops under the search; on phones it is icon-only in the bottom right.
 */
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
      className={`absolute top-4 left-[416px] z-4 flex gap-2 tight:top-[72px] tight:left-3 mobile:top-auto mobile:right-16 mobile:bottom-[min(calc(var(--sheet-height,0px)+24px),calc(100dvh-56px-env(safe-area-inset-top,0px)))] mobile:left-auto mobile:z-8 sheet-open:mobile:hidden ${panelOpen ? "tight:hidden" : ""}`}
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
          className={`inline-flex h-9 min-w-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 text-[0.8rem] font-semibold shadow-panel transition-colors duration-[180ms] ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none mobile:w-9 mobile:px-0 ${v === view ? SELECTED[v] : "border-border bg-surface text-foreground hover:bg-hover"}`}
          onClick={() => onChange(v)}
        >
          <LayerIcon view={v} size={16} />
          <span className="mobile:hidden">{LABEL[v]}</span>
        </button>
      ))}
    </div>
  );
}
