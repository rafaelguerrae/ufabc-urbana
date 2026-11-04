"use client";

import { useEffect, useState } from "react";

import { unitTitle, getCity } from "../lib/cities";
import { LESSONS, REFERENCES, type MapTarget } from "../lib/learn";
import type { RasterInfo } from "../lib/raster";
import { CompareCard, type ComparePin, type PinId } from "./CompareCard";
import { PlaceCard, type Place } from "./PlaceCard";
import { SheetPanel } from "./SheetPanel";
import panel from "./Panel.module.css";
import styles from "./LearnPanel.module.css";

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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
      <div className={panel.closeBar}>
        <button type="button" className={panel.close} onClick={onClose} aria-label="Fechar a trilha">
          ×
        </button>
      </div>

      <header className={styles.header}>
        <p className={panel.sectionTitle}>
          Trilha de aprendizado · passo {step + 1} de {LESSONS.length}
        </p>
        <div
          className={styles.progress}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={LESSONS.length}
          aria-valuenow={step + 1}
          aria-label="Progresso da trilha"
        >
          <span className={styles.progressFill} style={{ width: `${((step + 1) / LESSONS.length) * 100}%` }} />
        </div>
        <h2 className={styles.title}>{lesson.title}</h2>
      </header>

      <section className={styles.lesson}>
        {lesson.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>

      {task.type !== "read" && (
        <section className={done ? styles.taskDone : styles.task} aria-live="polite">
          <p className={styles.taskStatus}>{done ? "Feito" : "Sua vez"}</p>
          <p className={styles.taskPrompt}>{done ? task.done : task.prompt}</p>
          {task.type === "click" && target && !done && (
            <p className={styles.taskTarget}>
              {unitTitle(target.unit)} · {getCity(target.city).name}
            </p>
          )}
          {hint && <p className={styles.hint}>{hint}</p>}
          {pending && onShowMe && (
            <button type="button" className={styles.showMe} onClick={onShowMe}>
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
        <section className={panel.section}>
          <h3 className={panel.sectionTitle}>Fontes</h3>
          <ul className={styles.sources}>
            {sources.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.citation}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className={styles.nav} aria-label="Navegação da trilha">
        <button type="button" className={styles.secondary} disabled={step === 0} onClick={() => onStepChange(step - 1)}>
          Anterior
        </button>
        <button type="button" className={pending ? styles.secondary : styles.primary} onClick={() => (last ? onClose() : onStepChange(step + 1))}>
          {last ? (pending ? "Pular e concluir" : "Concluir") : pending ? "Pular" : "Próximo"}
        </button>
      </nav>
    </SheetPanel>
  );
}
