"use client";

import type { ReactNode, RefObject } from "react";

import type { SearchResult } from "#lib/geocode";
import { SearchBar } from "./search-bar";

interface TopBarProps {
  searchInputRef: RefObject<HTMLInputElement | null>;
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  learnOpen: boolean;
  onOpenLearn: () => void;
  simOpen: boolean;
  /** False until the rasters the brush paints on are loaded. */
  simAvailable: boolean;
  onToggleSim: () => void;
  onSearchSelect: (result: SearchResult) => void;
}

const iconProps = {
  className: "size-5 flex-none",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const TOGGLE_BUTTON =
  "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border text-[0.9rem] font-semibold shadow-panel active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [transition:background-color_0.18s_ease,color_0.18s_ease,border-color_0.18s_ease,translate_0.18s_cubic-bezier(0.3,0.7,0.4,1.4),scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] motion-reduce:[transition:none] disabled:cursor-progress disabled:opacity-60";
const TOGGLE_ON = "border-accent bg-accent text-accent-contrast";
const TOGGLE_OFF = "border-border bg-button text-foreground hover:-translate-y-px hover:bg-button-hover";

const PILL =
  "inline-flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border-0 px-4 text-[0.9rem] font-semibold text-accent-contrast active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [transition:background-color_0.18s_ease,translate_0.18s_cubic-bezier(0.3,0.7,0.4,1.4),scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] motion-reduce:[transition:none] disabled:cursor-progress disabled:opacity-60";
const PILL_OFF = "bg-accent shadow-panel hover:-translate-y-px hover:bg-accent-strong";
const PILL_ON = "bg-accent-strong shadow-[inset_0_0_0_2px_rgb(255_255_255/0.4),0_4px_16px_rgb(0_0_0/0.1)]";

/** A panel the user opens from the top bar: a labeled pill on desktop, an icon button on phones. */
interface Feature {
  /** Short visible text of the pill. */
  label: string;
  /** Full name, for the icon button and the tooltip. */
  name: string;
  shortcut: string;
  controls: string;
  open: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
}

function FeatureButton({ feature: f, variant }: { feature: Feature; variant: "pill" | "icon" }) {
  const common = {
    type: "button",
    "aria-expanded": f.open,
    "aria-controls": f.controls,
    "aria-keyshortcuts": f.shortcut,
    title: `${f.name} (${f.shortcut})`,
    disabled: f.disabled,
    onClick: f.onClick,
  } as const;
  if (variant === "icon") {
    return (
      <button {...common} aria-label={f.name} className={`${TOGGLE_BUTTON} ${f.open ? TOGGLE_ON : TOGGLE_OFF}`}>
        {f.icon}
      </button>
    );
  }
  // The visible text is the accessible name; the shortcut badge is decoration (it is in aria-keyshortcuts).
  return (
    <button {...common} className={`${PILL} ${f.open ? PILL_ON : PILL_OFF}`}>
      {f.icon}
      <span>{f.label}</span>
      <kbd aria-hidden className="rounded-md bg-white/20 px-1.5 py-px font-sans text-[0.7rem] font-semibold">
        {f.shortcut}
      </kbd>
    </button>
  );
}

export function TopBar(props: TopBarProps) {
  const features: Feature[] = [
    {
      label: "Aprender",
      name: "Trilha de aprendizado",
      shortcut: "L",
      controls: "learn-panel",
      open: props.learnOpen,
      onClick: props.onOpenLearn,
      icon: (
        <svg {...iconProps}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
          <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
        </svg>
      ),
    },
    {
      label: "Simular vegetação",
      name: "Simular vegetação",
      shortcut: "V",
      controls: "simulation-panel",
      open: props.simOpen,
      disabled: !props.simAvailable,
      onClick: props.onToggleSim,
      icon: (
        <svg {...iconProps}>
          <path d="M7 20h10" />
          <path d="M10 20c5.5-2.5.8-6.4 3-10" />
          <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
          <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Desktop: the two features that invite exploration, under the search bar. Before the header in the DOM so
          the search results list draws above it. The left panel opens in the same spot, so the rail steps aside. */}
      <nav
        aria-label="Explorar"
        className={`pointer-events-auto absolute top-[68px] z-[6] flex flex-col items-start gap-2 transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none midrange:top-[124px] mobile:hidden ${props.leftOpen ? "left-[424px]" : "left-3"}`}
      >
        {features.map((f) => (
          <FeatureButton key={f.controls} feature={f} variant="pill" />
        ))}
      </nav>

      <header className="pointer-events-none absolute inset-x-3 top-3 z-[6] flex items-start justify-between gap-3 mobile:flex-wrap">
        <div className="pointer-events-auto flex items-start gap-2 mobile:first:flex-[1_1_100%] mobile:last:ml-auto">
          <button
            type="button"
            className={props.leftOpen ? "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border text-[0.9rem] font-semibold shadow-panel active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [transition:background-color_0.18s_ease,color_0.18s_ease,border-color_0.18s_ease,translate_0.18s_cubic-bezier(0.3,0.7,0.4,1.4),scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] motion-reduce:[transition:none] border-accent bg-accent text-accent-contrast" : "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border text-[0.9rem] font-semibold shadow-panel active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [transition:background-color_0.18s_ease,color_0.18s_ease,border-color_0.18s_ease,translate_0.18s_cubic-bezier(0.3,0.7,0.4,1.4),scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] motion-reduce:[transition:none] border-border bg-button text-foreground hover:-translate-y-px hover:bg-button-hover"}
            aria-expanded={props.leftOpen}
            aria-controls="left-panel"
            aria-label="Menu de camadas"
            aria-keyshortcuts="S"
            title="Camadas (S)"
            onClick={props.onToggleLeft}
          >
            <svg {...iconProps}>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="w-[340px] max-w-full mobile:w-auto mobile:flex-1">
            <SearchBar onSelect={props.onSearchSelect} inputRef={props.searchInputRef} />
          </div>
        </div>
  
        <div className="pointer-events-auto flex items-start gap-2 mobile:first:flex-[1_1_100%] mobile:last:ml-auto">
          {/* Phones: icon buttons here; desktop shows the labeled pills in the rail instead. */}
          <div className="hidden gap-2 mobile:flex">
            {[...features].reverse().map((f) => (
              <FeatureButton key={f.controls} feature={f} variant="icon" />
            ))}
          </div>
          <button
            type="button"
            className={props.rightOpen ? "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border text-[0.9rem] font-semibold shadow-panel active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [transition:background-color_0.18s_ease,color_0.18s_ease,border-color_0.18s_ease,translate_0.18s_cubic-bezier(0.3,0.7,0.4,1.4),scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] motion-reduce:[transition:none] border-accent bg-accent text-accent-contrast" : "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border text-[0.9rem] font-semibold shadow-panel active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [transition:background-color_0.18s_ease,color_0.18s_ease,border-color_0.18s_ease,translate_0.18s_cubic-bezier(0.3,0.7,0.4,1.4),scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] motion-reduce:[transition:none] border-border bg-button text-foreground hover:-translate-y-px hover:bg-button-hover"}
            aria-expanded={props.rightOpen}
            aria-controls="right-panel"
            aria-label="Gráficos"
            aria-keyshortcuts="G"
            title="Gráficos (G)"
            onClick={props.onToggleRight}
          >
            <svg {...iconProps}>
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </svg>
          </button>
        </div>
      </header>
    </>
  );
}
