"use client";

import type { ReactNode, RefObject } from "react";

import type { SearchResult } from "#lib/geocode";
import { SearchBar } from "./search-bar";

interface TopBarProps {
  searchInputRef: RefObject<HTMLInputElement | null>;
  leftOpen: boolean;
  onToggleLeft: () => void;
  learnOpen: boolean;
  onOpenLearn: () => void;
  simOpen: boolean;
  /** False until the rasters the brush paints on are loaded. */
  simAvailable: boolean;
  onToggleSim: () => void;
  onSearchSelect: (result: SearchResult) => void;
  /** Text of the selected place, shown in the search field, and what the field's clear button does. */
  searchText: string | null;
  onSearchClear: () => void;
  /** Map buttons (reset view, locate me): they sit in the right group so expanding buttons push them aside. */
  mapButtons: ReactNode;
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

const TOGGLE_BASE =
  "inline-flex cursor-pointer items-center justify-center rounded-xl border text-[0.9rem] font-semibold shadow-panel active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [transition:background-color_0.18s_ease,color_0.18s_ease,border-color_0.18s_ease,translate_0.18s_cubic-bezier(0.3,0.7,0.4,1.4),scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] motion-reduce:[transition:none] disabled:cursor-progress disabled:opacity-60";
const TOGGLE_BUTTON = `size-11 justify-center ${TOGGLE_BASE}`;
const TOGGLE_ON = "border-accent bg-accent text-accent-contrast";
const TOGGLE_OFF = "border-border bg-button text-foreground hover:-translate-y-px hover:bg-button-hover";
const toggleClass = (open: boolean) => `${TOGGLE_BUTTON} ${open ? TOGGLE_ON : TOGGLE_OFF}`;

interface HoverLabelProps {
  text: string;
  shortcut: string;
  /** Which edge of the button the label lines up with, so it never leaves the screen. */
  align: "left" | "right";
  children: ReactNode;
}

/** Shows the button's name (and its key) under it on hover or keyboard focus. Not shown on phones, which have no hover. */
function HoverLabel({ text, shortcut, align, children }: HoverLabelProps) {
  return (
    <div className="group relative">
      {children}
      <span
        aria-hidden
        className={`pointer-events-none absolute top-[calc(100%+8px)] z-10 flex items-center gap-2 rounded-lg bg-foreground px-2.5 py-1.5 text-[12px] font-semibold whitespace-nowrap text-surface opacity-0 shadow-[0_2px_8px_rgb(0_0_0/0.25)] transition-opacity duration-[120ms] group-hover:opacity-100 group-has-focus-visible:opacity-100 motion-reduce:transition-none mobile:hidden ${align === "right" ? "right-0" : "left-0"}`}
      >
        {text}
        <kbd className="rounded bg-surface/20 px-1.5 font-sans text-[11px]">{shortcut}</kbd>
      </span>
    </div>
  );
}

interface ExpandingButtonProps {
  /** Text revealed on hover or keyboard focus; also the button's accessible name. */
  label: string;
  shortcut: string;
  /** Room the label needs when revealed (CSS length, label + key). Just a ceiling for the animation. */
  labelWidth: string;
  controls: string;
  open: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

/**
 * Icon button that grows on hover or keyboard focus to reveal its label and key. The group is anchored on the right,
 * so it grows to the left and pushes the buttons beside it along. Phones have no hover, so they only ever see the icon.
 */
function ExpandingButton({ label, shortcut, labelWidth, controls, open, disabled, onClick, children }: ExpandingButtonProps) {
  return (
    <button
      type="button"
      className={`group h-11 min-w-11 px-[11px] ${TOGGLE_BASE} ${open ? TOGGLE_ON : TOGGLE_OFF}`}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
      aria-keyshortcuts={shortcut}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      {/* The label is clipped to 0 wide and opens up to its own width: the button, sized to its content, grows with it. */}
      <span
        style={{ "--label-width": labelWidth } as React.CSSProperties}
        className="max-w-0 overflow-hidden transition-[max-width] duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:max-w-(--label-width) group-focus-visible:max-w-(--label-width) motion-reduce:transition-none"
      >
        <span aria-hidden className="flex items-center gap-2 pl-2 whitespace-nowrap">
          {label}
          <kbd className="rounded bg-current/15 px-1.5 font-sans text-[11px]">{shortcut}</kbd>
        </span>
      </span>
    </button>
  );
}

export function TopBar(props: TopBarProps) {
  return (
    <header className="pointer-events-none absolute inset-x-3 top-3 z-[6] flex items-start justify-between gap-3 mobile:flex-wrap">
      <div className="pointer-events-auto flex items-start gap-2 mobile:first:flex-[1_1_100%] mobile:last:ml-auto">
        <HoverLabel text="Camadas" shortcut="S" align="left">
          <button
            type="button"
            className={toggleClass(props.leftOpen)}
            aria-expanded={props.leftOpen}
            aria-controls="left-panel"
            aria-label="Menu de camadas"
            aria-keyshortcuts="S"
            onClick={props.onToggleLeft}
          >
            <svg {...iconProps}>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </HoverLabel>
        <div className="w-[340px] max-w-full mobile:w-auto mobile:flex-1">
          <SearchBar onSelect={props.onSearchSelect} inputRef={props.searchInputRef} selectedText={props.searchText} onClear={props.onSearchClear} />
        </div>
      </div>

      <div className="pointer-events-auto flex items-start gap-2 mobile:first:flex-[1_1_100%] mobile:last:ml-auto">
        {props.mapButtons}
        <ExpandingButton label="Simular vegetação" shortcut="V" labelWidth="11rem" controls="simulation-panel" open={props.simOpen} disabled={!props.simAvailable} onClick={props.onToggleSim}>
          {/* Sprout */}
          <svg {...iconProps}>
            <path d="M7 20h10" />
            <path d="M10 20c5.5-2.5.8-6.4 3-10" />
            <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
            <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
          </svg>
        </ExpandingButton>
        <ExpandingButton label="Aprender" shortcut="L" labelWidth="7rem" controls="learn-panel" open={props.learnOpen} onClick={props.onOpenLearn}>
          <svg {...iconProps}>
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
            <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
          </svg>
        </ExpandingButton>
      </div>
    </header>
  );
}
