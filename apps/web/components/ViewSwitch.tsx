"use client";

import { useRef, type KeyboardEvent } from "react";

import { VIEWS, type ViewMode } from "../lib/indicators";
import { LayerIcon } from "./LayerIcon";
import styles from "./ViewSwitch.module.css";

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
      className={panelOpen ? `${styles.wrap} ${styles.panelOpen}` : styles.wrap}
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
          className={v === view ? styles.optionActive : styles.option}
          onClick={() => onChange(v)}
        >
          <LayerIcon view={v} />
          <span className={styles.text}>{LABEL[v]}</span>
        </button>
      ))}
    </div>
  );
}
