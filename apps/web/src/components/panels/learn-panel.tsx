"use client";

import { useEffect, useState } from "react";

import { unitTitle, getCity } from "#lib/cities";
import { LESSONS, REFERENCES, type MapTarget } from "#lib/learn";
import type { RasterInfo } from "#lib/raster";
import { CompareCard, type ComparePin, type PinId } from "#components/cards/compare-card";
import { PlaceCard, type Place } from "#components/cards/place-card";
import { PanelHeader } from "./panel-header";
import { SheetPanel } from "./sheet-panel";

const HINT_DELAY_MS = 8000;

export interface CompareState {
  a: ComparePin;
  b: ComparePin;
  active: PinId;
  /** Set once the learner moved a pin, which completes the compare task. */
  moved: boolean;
}

interface LearnPanelProps {
  open: boolean;
  step: number;
  onStepChange: (step: number) => void;
  /** The unit the current click task points at, when it is available. */
  target: MapTarget | null;
  place: Place | null;
  compare: CompareState | null;
  onCompareActiveChange: (id: PinId) => void;
  raster: RasterInfo | null;
  /** Whether the current task was completed on the map. Read-only steps are always done. */
  done: boolean;
  /** Does the current task for the learner; absent when there is nothing to demonstrate. */
  onShowMe?: () => void;
  onClose: () => void;
}

export function LearnPanel(props: LearnPanelProps) {
  const { open, step, onStepChange, target, place, compare, raster, done, onShowMe, onClose } = props;
  const lesson = LESSONS[step]!;
  const task = lesson.task;
  const last = step === LESSONS.length - 1;
  const sources = lesson.sources.flatMap((id) => REFERENCES.find((r) => r.id === id) ?? []);
  const pending = task.type !== "read" && !done;
  const [hintFor, setHintFor] = useState<string | null>(null);

  // After a few idle seconds on a pending task, show the extra tip. Any change on the map restarts the wait.
  useEffect(() => {
    setHintFor(null);
    if (!open || !pending) return;
    const timer = window.setTimeout(() => setHintFor(lesson.id), HINT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [open, pending, lesson.id, place, compare]);

  const hint = task.type !== "read" && pending && hintFor === lesson.id ? task.hint : null;

  return (
    <SheetPanel side="right" id="learn-panel" label="Trilha de aprendizado" open={open} onClose={onClose}>
      {/* Sticky and elevated so the title, progress and close button stay visible while the lesson scrolls. */}
      <PanelHeader title={lesson.title} closeLabel="Fechar a trilha" onClose={onClose}>
        <div className="flex items-center gap-3">
          <p className="flex-none text-[0.75rem] font-bold tracking-[0.04em] text-muted uppercase">
            Passo {step + 1} de {LESSONS.length}
          </p>
          <div
            className="h-1 flex-1 overflow-hidden rounded-xs bg-border"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={LESSONS.length}
            aria-valuenow={step + 1}
            aria-label="Progresso da trilha"
          >
            <span className="block h-full bg-accent transition-[width] duration-300 ease-[ease]" style={{ width: `${((step + 1) / LESSONS.length) * 100}%` }} />
          </div>
        </div>
      </PanelHeader>

      <section className="flex flex-col gap-2.5 text-[0.92rem] leading-[1.55]">
        {lesson.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>

      {task.type !== "read" && (
        <section className={`flex flex-col gap-2 rounded-xl border p-3.5 ${done ? "border-[#15803d] bg-[rgb(21_128_61/0.1)]" : "border-accent bg-accent-soft"}`} aria-live="polite">
          <p className="text-[0.75rem] font-bold tracking-[0.04em] uppercase">{done ? "Feito" : "Sua vez"}</p>
          <p className="text-[0.92rem] leading-normal font-semibold">{done ? task.done : task.prompt}</p>
          {task.type === "click" && target && !done && (
            <p className="text-[0.85rem] text-muted">
              {unitTitle(target.unit)} · {getCity(target.city).name}
            </p>
          )}
          {hint && <p className="rounded-lg border border-dashed border-border bg-surface px-2.5 py-2 text-[0.85rem] leading-[1.45]">{hint}</p>}
          {pending && onShowMe && (
            <button type="button" className="min-h-10 cursor-pointer self-start rounded-[10px] border border-accent bg-surface px-4 font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" onClick={onShowMe}>
              Mostrar para mim
            </button>
          )}
        </section>
      )}

      {(task.type === "click" || task.type === "free") && done && place && <PlaceCard place={place} raster={raster} />}
      {task.type === "compare" && compare && (
        <CompareCard a={compare.a} b={compare.b} active={compare.active} onActiveChange={props.onCompareActiveChange} />
      )}

      {sources.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h3 className="text-[0.75rem] font-bold tracking-[0.04em] text-muted uppercase">Fontes</h3>
          <ul className="flex flex-col gap-2 text-[0.8rem] leading-[1.45]">
            {sources.map((s) => (
              <li key={s.id}>
                <a className="text-muted underline" href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.citation}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="sticky bottom-[-20px] mobile:bottom-[calc(-20px-env(safe-area-inset-bottom))] z-3 -mx-5 -mb-5 mt-auto flex justify-between gap-2 border-t border-border bg-surface px-5 pt-3 pb-4 shadow-[0_-4px_12px_rgb(0_0_0/0.08)] mobile:mb-[calc(-20px-env(safe-area-inset-bottom))] mobile:pb-[calc(16px+env(safe-area-inset-bottom))]" aria-label="Navegação da trilha">
        <button type="button" className="min-h-11 cursor-pointer rounded-[10px] px-5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent border border-border bg-button text-foreground disabled:cursor-default disabled:opacity-40" disabled={step === 0} onClick={() => onStepChange(step - 1)}>
          Anterior
        </button>
        <button type="button" className={pending ? "min-h-11 cursor-pointer rounded-[10px] px-5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent border border-border bg-button text-foreground disabled:cursor-default disabled:opacity-40" : "min-h-11 cursor-pointer rounded-[10px] px-5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent border border-transparent bg-accent text-accent-contrast"} onClick={() => (last ? onClose() : onStepChange(step + 1))}>
          {last ? (pending ? "Pular e concluir" : "Concluir") : pending ? "Pular" : "Próximo"}
        </button>
      </nav>
    </SheetPanel>
  );
}
