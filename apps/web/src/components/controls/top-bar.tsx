"use client";

import type { SearchResult } from "#lib/geocode";
import { SearchBar } from "./search-bar";

interface TopBarProps {
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  learnOpen: boolean;
  onOpenLearn: () => void;
  onOpenAbout: () => void;
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

export function TopBar(props: TopBarProps) {
  return (
    <header className="pointer-events-none absolute inset-x-3 top-3 z-[6] flex items-start justify-between gap-3 mobile:flex-wrap">
      <div className="pointer-events-auto flex items-start gap-2 mobile:first:flex-[1_1_100%] mobile:last:ml-auto">
        <button
          type="button"
          className={props.leftOpen ? "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border text-[0.9rem] font-semibold shadow-panel active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [transition:background-color_0.18s_ease,color_0.18s_ease,border-color_0.18s_ease,translate_0.18s_cubic-bezier(0.3,0.7,0.4,1.4),scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] motion-reduce:[transition:none] border-accent bg-accent text-accent-contrast" : "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border text-[0.9rem] font-semibold shadow-panel active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [transition:background-color_0.18s_ease,color_0.18s_ease,border-color_0.18s_ease,translate_0.18s_cubic-bezier(0.3,0.7,0.4,1.4),scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] motion-reduce:[transition:none] border-border bg-button text-foreground hover:-translate-y-px hover:bg-button-hover"}
          aria-expanded={props.leftOpen}
          aria-controls="left-panel"
          aria-label="Menu de camadas"
          title="Camadas"
          onClick={props.onToggleLeft}
        >
          <svg {...iconProps}>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="w-[340px] max-w-full mobile:w-auto mobile:flex-1">
          <SearchBar onSelect={props.onSearchSelect} />
        </div>
      </div>

      <div className="pointer-events-auto flex items-start gap-2 mobile:first:flex-[1_1_100%] mobile:last:ml-auto">
        <button
          type="button"
          className={props.learnOpen ? "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border text-[0.9rem] font-semibold shadow-panel active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [transition:background-color_0.18s_ease,color_0.18s_ease,border-color_0.18s_ease,translate_0.18s_cubic-bezier(0.3,0.7,0.4,1.4),scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] motion-reduce:[transition:none] border-accent bg-accent text-accent-contrast" : "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border text-[0.9rem] font-semibold shadow-panel active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [transition:background-color_0.18s_ease,color_0.18s_ease,border-color_0.18s_ease,translate_0.18s_cubic-bezier(0.3,0.7,0.4,1.4),scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] motion-reduce:[transition:none] border-border bg-button text-foreground hover:-translate-y-px hover:bg-button-hover"}
          aria-expanded={props.learnOpen}
          aria-controls="learn-panel"
          aria-label="Trilha de aprendizado"
          title="Trilha de aprendizado"
          onClick={props.onOpenLearn}
        >
          <svg {...iconProps}>
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
            <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
          </svg>
        </button>
        <button
          type="button"
          className={props.rightOpen ? "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border text-[0.9rem] font-semibold shadow-panel active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [transition:background-color_0.18s_ease,color_0.18s_ease,border-color_0.18s_ease,translate_0.18s_cubic-bezier(0.3,0.7,0.4,1.4),scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] motion-reduce:[transition:none] border-accent bg-accent text-accent-contrast" : "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border text-[0.9rem] font-semibold shadow-panel active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [transition:background-color_0.18s_ease,color_0.18s_ease,border-color_0.18s_ease,translate_0.18s_cubic-bezier(0.3,0.7,0.4,1.4),scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] motion-reduce:[transition:none] border-border bg-button text-foreground hover:-translate-y-px hover:bg-button-hover"}
          aria-expanded={props.rightOpen}
          aria-controls="right-panel"
          aria-label="Gráficos"
          title="Gráficos"
          onClick={props.onToggleRight}
        >
          <svg {...iconProps}>
            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
          </svg>
        </button>
        <button type="button" className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border text-[0.9rem] font-semibold shadow-panel active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [transition:background-color_0.18s_ease,color_0.18s_ease,border-color_0.18s_ease,translate_0.18s_cubic-bezier(0.3,0.7,0.4,1.4),scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] motion-reduce:[transition:none] border-border bg-button text-foreground hover:-translate-y-px hover:bg-button-hover" aria-label="Sobre os dados" title="Sobre" onClick={props.onOpenAbout}>
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
        </button>
      </div>
    </header>
  );
}
