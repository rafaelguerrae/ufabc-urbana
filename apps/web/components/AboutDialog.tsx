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
          Este mapa mostra como a temperatura da superfície e a vegetação variam em São Paulo, São Bernardo do Campo e Santo André. Os valores vêm de imagens
          de satélite e de dados oficiais; nada aqui é previsão ou simulação.
        </p>
        <ul>
          <li>Temperatura e vegetação: satélites Landsat 8 e 9, processados no Google Earth Engine.</li>
          <li>
            Distritos (São Paulo), bairros (São Bernardo do Campo e Santo André) e densidade demográfica: IBGE, Censo
            2022. Os bairros são os do Censo e podem diferir dos bairros oficiais de cada prefeitura.
          </li>
          <li>Área urbanizada: MapBiomas, Coleção 11.</li>
          <li>
            Edifícios em 3D: contornos e alturas do OpenStreetMap, © colaboradores do OpenStreetMap (licença ODbL).
            Só entram prédios com altura ou número de andares registrado por voluntários; a cobertura é desigual.
          </li>
          <li>Busca de endereços: Photon, © colaboradores do OpenStreetMap.</li>
          <li>Mapa-base: © CARTO.</li>
          <li>
            Sua localização: só é pedida quando você toca no botão de localização e é usada apenas no seu navegador
            para mostrar o ponto azul. Ela não é enviada nem guardada.
          </li>
        </ul>
        <p>
          Código aberto:{" "}
          <a href="https://github.com/rafaelguerrae/ufabc-urbana" target="_blank" rel="noopener noreferrer">
            github.com/rafaelguerrae/ufabc-urbana
          </a>
        </p>
        <p>
          Os dados mostram associações, não causas. A temperatura da superfície não é a temperatura do ar, e cada camada
          tem sua própria escala (pixel de 30 m, distrito ou bairro). Distritos e bairros têm tamanhos muito diferentes, então compare cada cidade com ela mesma. Em São Bernardo do Campo e Santo André, a "área sem bairro" reúne trechos sem moradores que o IBGE não classificou em nenhum bairro.
        </p>
      </section>
    </div>
  );
}
