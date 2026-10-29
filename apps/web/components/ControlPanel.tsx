"use client";

import Image from "next/image";

import {
  DATA_TYPE_LABEL,
  INDICATORS,
  VIEWS,
  VIEW_LABEL,
  colorAt,
  formatValue,
  getIndicator,
  type IndicatorKey,
  type ViewMode,
} from "../lib/indicators";
import type { RasterInfo } from "../lib/raster";
import { LayerIcon } from "./LayerIcon";
import { SheetPanel } from "./SheetPanel";
import panel from "./Panel.module.css";
import styles from "./ControlPanel.module.css";

interface ControlPanelProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  districtIndicator: IndicatorKey;
  onDistrictIndicatorChange: (key: IndicatorKey) => void;
  districtRange: { min: number; max: number };
  buildings3d: boolean;
  onBuildings3dChange: (on: boolean) => void;
  /** Undefined until the district data needed to build the tour has loaded. */
  onStartTour?: () => void;
  raster: RasterInfo | null;
  scenesLabel: string | null;
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
}

const VIEW_HINT: Record<ViewMode, string> = {
  lst_c: "Onde a superfície esquenta mais · cada quadrado ≈ 30 m",
  ndvi: "Onde há mais plantas · cada quadrado ≈ 30 m",
  districts: "Compare os distritos e bairros",
};

export function ControlPanel(props: ControlPanelProps) {
  const { view, districtIndicator, districtRange, raster } = props;
  const indicator = getIndicator(view === "districts" ? districtIndicator : view);
  const rasterScale = raster ? raster[view === "ndvi" ? "ndvi" : "lst"].scale : null;
  const range =
    view === "districts" ? districtRange : rasterScale ? { min: rasterScale[0], max: rasterScale[1] } : null;
  const gradient = `linear-gradient(to right, ${[0, 0.25, 0.5, 0.75, 1]
    .map((t) => `rgb(${colorAt(indicator, t).join(",")})`)
    .join(",")})`;

  return (
    <SheetPanel side="left" id="left-panel" label="Camadas do mapa" open={props.open} onClose={props.onClose}>
      <header>
        <div className={styles.brand}>
          <Image src="/ufabc-urbana.png" alt="" width={56} height={56} className={styles.logo} priority />
          <h1 className={styles.title}>UFABC Urbana</h1>
        </div>
        <p className={panel.note}>
          Por que algumas partes de São Paulo, São Bernardo do Campo e Santo André são mais quentes que outras? Onde há
          muito concreto e pouca vegetação, a cidade esquenta mais: é a chamada ilha de calor. Busque sua rua e compare.
        </p>
        <button type="button" className={styles.tourButton} onClick={props.onStartTour} disabled={!props.onStartTour}>
          Fazer um tour guiado
        </button>
      </header>

      <section className={panel.section} aria-label="Camada do mapa">
        <h2 className={panel.sectionTitle}>Camada</h2>
        <div className={styles.layers} role="radiogroup" aria-label="Camada do mapa">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={v === view}
              className={v === view ? styles.layerActive : styles.layer}
              onClick={() => props.onViewChange(v)}
            >
              <span className={styles.layerIcon}>
                <LayerIcon view={v} />
              </span>
              <span className={styles.layerText}>
                <span className={styles.layerName}>{VIEW_LABEL[v]}</span>
                <span className={styles.layerHint}>{VIEW_HINT[v]}</span>
              </span>
            </button>
          ))}
        </div>

        {view === "districts" && (
          <label className={styles.select}>
            <span>Indicador</span>
            <select
              value={districtIndicator}
              onChange={(e) => props.onDistrictIndicatorChange(e.target.value as IndicatorKey)}
            >
              {INDICATORS.map((i) => (
                <option key={i.key} value={i.key}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      {view === "lst_c" && (
        <section className={panel.section} aria-label="Edifícios em 3D">
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={props.buildings3d}
              onChange={(e) => props.onBuildings3dChange(e.target.checked)}
            />
            <span>Edifícios em 3D</span>
          </label>
          <p className={panel.note}>
            Aproxime o mapa e incline a visão para ver. Só aparecem prédios com altura registrada no OpenStreetMap
            (cobertura irregular: boa no centro de São Paulo, pequena perto dos campi da UFABC); os demais ficam planos
            no mapa. A cor é a temperatura do chão sob o prédio, não a do telhado. Quando só o número de andares é
            conhecido, a altura é estimada em 3 m por andar.
          </p>
        </section>
      )}

      {props.loading && <p className={panel.note}>Carregando dados…</p>}
      {props.error && <p className={styles.error}>Não foi possível carregar os dados: {props.error}</p>}

      {range && (
        <section className={`${panel.card} ${styles.legend}`} aria-label="Legenda">
          <h2 className={panel.sectionTitle}>{indicator.label}</h2>
          <div className={styles.legendBar} style={{ background: gradient }} aria-hidden />
          <div className={styles.legendLabels}>
            <span>
              {formatValue(indicator, range.min)} {indicator.unit}
            </span>
            <span>
              {formatValue(indicator, range.max)} {indicator.unit}
            </span>
          </div>
        </section>
      )}

      <details className={styles.details}>
        <summary>O que é uma ilha de calor?</summary>
        <p className={panel.note}>
          Ilha de calor urbana é quando partes da cidade ficam mais quentes que as áreas ao redor. Concreto, asfalto e
          telhados absorvem e guardam o calor do sol. Árvores e outras plantas fazem sombra e liberam água pelas folhas,
          o que ajuda a esfriar o ambiente. Por isso, em geral, lugares mais verdes tendem a ser mais frescos.
        </p>
        <p className={panel.note}>
          No mapa, quanto mais vermelha a cor, mais quente está a superfície vista pelo satélite. Compare avenidas, praças
          e parques do seu bairro.
        </p>
      </details>

      <details className={styles.details}>
        <summary>Sobre esta camada</summary>
        <p className={styles.badgeRow}>
          <span className={indicator.dataType === "observed" ? styles.badgeObserved : styles.badgeDerived}>
            {DATA_TYPE_LABEL[indicator.dataType]}
          </span>
        </p>
        <p className={panel.note}>{indicator.description}</p>
        <dl className={styles.meta}>
          <dt>Fonte</dt>
          <dd>{indicator.source}</dd>
          <dt>Período</dt>
          <dd>
            {indicator.period}
            {view !== "districts" && props.scenesLabel ? ` · ${props.scenesLabel} imagens` : ""}
          </dd>
          <dt>Resolução</dt>
          <dd>
            {view === "districts"
              ? "Distritos do IBGE de 2022 em São Paulo (96) e bairros do IBGE de 2022 em São Bernardo do Campo (34) e Santo André (113). Os tamanhos não são comparáveis."
              : "Grade de 30 m; o sensor térmico mede cerca de 100 m e a imagem é reamostrada"}
          </dd>
        </dl>
        <p className={panel.note}>
          Áreas mais verdes e menos construídas tendem a ser mais frescas nos dados, mas isso é uma associação: não prova
          que um único fator causa a diferença, e outros fatores também influenciam. A temperatura da superfície não é a
          temperatura do ar. O mapa não mostra previsões nem simulações.
        </p>
      </details>
    </SheetPanel>
  );
}
