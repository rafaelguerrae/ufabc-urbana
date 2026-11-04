"use client";

import type { TourStep } from "#lib/tour";

interface TourCardProps {
  steps: TourStep[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function TourCard({ steps, index, onIndexChange, onClose }: TourCardProps) {
  const step = steps[index]!;
  const last = index === steps.length - 1;

  return (
    <section className="absolute bottom-6 left-1/2 z-[9] flex w-[min(460px,calc(100%-24px))] -translate-x-1/2 flex-col gap-2 rounded-2xl border border-border bg-panel px-[18px] py-4 text-foreground shadow-panel backdrop-blur-sm mobile:bottom-[max(12px,env(safe-area-inset-bottom,0px))]" role="region" aria-label="Tour guiado" aria-live="polite">
      <div className="flex items-center justify-between">
        <span className="text-[0.75rem] font-semibold text-muted">
          Passo {index + 1} de {steps.length}
        </span>
        <button type="button" className="min-h-8 cursor-pointer rounded-xl border-0 bg-none px-2 text-[0.9rem] font-semibold text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" onClick={onClose}>
          {last ? "Fechar" : "Pular"}
        </button>
      </div>
      <h2 className="text-[1.05rem]">{step.title}</h2>
      <p className="text-[0.9rem] leading-[1.45]">{step.body}</p>
      <div className="mt-1 flex justify-end gap-2">
        <button type="button" className="min-h-11 cursor-pointer rounded-xl border border-border bg-button px-4 text-[0.9rem] font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-40" disabled={index === 0} onClick={() => onIndexChange(index - 1)}>
          Voltar
        </button>
        <button type="button" className="min-h-11 cursor-pointer rounded-xl border-0 bg-accent px-4 text-[0.9rem] font-semibold text-accent-contrast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" onClick={() => (last ? onClose() : onIndexChange(index + 1))}>
          {last ? "Explorar o mapa" : "Próximo"}
        </button>
      </div>
    </section>
  );
}
