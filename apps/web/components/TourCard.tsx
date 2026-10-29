"use client";

import { useEffect } from "react";

import type { TourStep } from "../lib/tour";
import styles from "./TourCard.module.css";

interface TourCardProps {
  steps: TourStep[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function TourCard({ steps, index, onIndexChange, onClose }: TourCardProps) {
  const step = steps[index]!;
  const last = index === steps.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <section className={styles.card} role="region" aria-label="Tour guiado" aria-live="polite">
      <div className={styles.header}>
        <span className={styles.count}>
          Passo {index + 1} de {steps.length}
        </span>
        <button type="button" className={styles.skip} onClick={onClose}>
          {last ? "Fechar" : "Pular"}
        </button>
      </div>
      <h2 className={styles.title}>{step.title}</h2>
      <p className={styles.body}>{step.body}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.back} disabled={index === 0} onClick={() => onIndexChange(index - 1)}>
          Voltar
        </button>
        <button type="button" className={styles.next} onClick={() => (last ? onClose() : onIndexChange(index + 1))}>
          {last ? "Explorar o mapa" : "Próximo"}
        </button>
      </div>
    </section>
  );
}
