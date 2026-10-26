"use client";

import type { SearchResult } from "../lib/geocode";
import { SearchBar } from "./SearchBar";
import styles from "./TopBar.module.css";

interface TopBarProps {
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onOpenLearn: () => void;
  onOpenAbout: () => void;
  onSearchSelect: (result: SearchResult) => void;
}

const iconProps = {
  className: styles.icon,
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
    <header className={styles.bar}>
      <div className={styles.group}>
        <button
          type="button"
          className={props.leftOpen ? styles.buttonActive : styles.button}
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
        <div className={styles.search}>
          <SearchBar onSelect={props.onSearchSelect} />
        </div>
      </div>

      <div className={styles.group}>
        <button
          type="button"
          className={`${styles.button} ${styles.soon}`}
          aria-label="Trilha de aprendizado (em breve)"
          title="Trilha de aprendizado (em breve)"
          onClick={props.onOpenLearn}
        >
          <svg {...iconProps}>
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
            <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
          </svg>
          <span className={styles.dot} aria-hidden>
            <span className={styles.pulse} />
          </span>
        </button>
        <button
          type="button"
          className={props.rightOpen ? styles.buttonActive : styles.button}
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
        <button type="button" className={styles.button} aria-label="Sobre os dados" title="Sobre" onClick={props.onOpenAbout}>
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
        </button>
      </div>
    </header>
  );
}
