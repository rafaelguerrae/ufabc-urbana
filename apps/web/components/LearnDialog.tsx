"use client";

import { useEffect } from "react";

import styles from "./LearnDialog.module.css";

interface LearnDialogProps {
  onClose: () => void;
}

export function LearnDialog({ onClose }: LearnDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="learn-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="learn-title" className={styles.title}>
            Trilha de aprendizado
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar" autoFocus>
            ×
          </button>
        </div>
        <p>
          Em breve: uma trilha de aprendizado para entender o que são as ilhas de calor urbanas, por que a vegetação
          ajuda a esfriar a cidade e como ler os dados deste mapa, com indicação das fontes científicas.
        </p>
        <p>Este conteúdo ainda está em preparação.</p>
      </section>
    </div>
  );
}
