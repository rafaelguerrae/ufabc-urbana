import type { ReactNode } from "react";

interface PanelHeaderProps {
  title: string;
  closeLabel: string;
  onClose: () => void;
  /** Extra row under the title (for example a progress bar). */
  children?: ReactNode;
}

/**
 * Sticky, elevated header for a SheetPanel: the title and the close button share one row and stay
 * visible while the panel content scrolls. The negative offsets cancel the sheet's padding so the bar is flush.
 */
export function PanelHeader({ title, closeLabel, onClose, children }: PanelHeaderProps) {
  return (
    <header className="sticky top-[-20px] z-3 -mx-5 -mt-5 flex flex-col gap-2 border-b border-border bg-surface px-5 pt-4 pb-3 shadow-[0_4px_12px_rgb(0_0_0/0.08)] mobile:top-0 mobile:mt-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[1.15rem] leading-[1.3] font-bold">{title}</h2>
        <button
          type="button"
          className="size-9 flex-none cursor-pointer rounded-[10px] border border-border bg-button text-[1.5rem] leading-none text-foreground transition-[background-color,scale] duration-[180ms] ease-[ease] hover:bg-button-hover active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={onClose}
          aria-label={closeLabel}
          title="Fechar"
        >
          ×
        </button>
      </div>
      {children}
    </header>
  );
}
