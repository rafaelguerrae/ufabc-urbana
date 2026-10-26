"use client";

import { useEffect } from "react";

import styles from "./AboutDialog.module.css";

interface AboutDialogProps {
  onClose: () => void;
}

export function AboutDialog({ onClose }: AboutDialogProps) {
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
        aria-labelledby="about-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="about-title" className={styles.title}>
            Sobre os dados
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar" autoFocus>
            ×
          </button>
        </div>
        <p>
          Este mapa mostra como a temperatura da superfície e a vegetação variam em São Paulo. Os valores vêm de imagens
          de satélite e de dados oficiais; nada aqui é previsão ou simulação.
        </p>
        <ul>
          <li>Temperatura e vegetação: satélites Landsat 8 e 9, processados no Google Earth Engine.</li>
          <li>Distritos e densidade demográfica: IBGE, Censo 2022.</li>
          <li>Área urbanizada: MapBiomas, Coleção 11.</li>
          <li>Busca de endereços: Photon, © colaboradores do OpenStreetMap.</li>
          <li>Mapa-base: © CARTO.</li>
        </ul>
        <p>
          Código aberto:{" "}
          <a href="https://github.com/rafaelguerrae/ufabc-urbana" target="_blank" rel="noopener noreferrer">
            github.com/rafaelguerrae/ufabc-urbana
          </a>
        </p>
        <p>
          Os dados mostram associações, não causas. A temperatura da superfície não é a temperatura do ar, e cada camada
          tem sua própria escala (pixel de 30 m ou distrito).
        </p>
      </section>
    </div>
  );
}
