"use client";

import type { SearchResult } from "../lib/geocode";
import {
  DATA_TYPE_LABEL,
  INDICATORS,
  VIEW_LABEL,
  colorAt,
  formatValue,
  getIndicator,
  type IndicatorKey,
  type ViewMode,
} from "../lib/indicators";
import type { RasterInfo } from "../lib/raster";
import { SearchBar } from "./SearchBar";
import styles from "./ControlPanel.module.css";

interface ControlPanelProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  districtIndicator: IndicatorKey;
  onDistrictIndicatorChange: (key: IndicatorKey) => void;
  districtRange: { min: number; max: number };
  raster: RasterInfo | null;
  loading: boolean;
  error: string | null;
  onSearchSelect: (result: SearchResult) => void;
}

const VIEWS: ViewMode[] = ["lst_c", "ndvi", "districts"];

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
    <aside className={styles.panel} aria-label="Controles do mapa">
      <h1 className={styles.title}>UFABC Urbana</h1>
      <p className={styles.lead}>
        Por que algumas partes de São Paulo são mais quentes que outras? Onde há muito concreto e pouca vegetação, a
        cidade esquenta mais: é a chamada ilha de calor. Busque sua rua e compare.
      </p>

      <SearchBar onSelect={props.onSearchSelect} />

      <div className={styles.tabs} role="radiogroup" aria-label="Camada do mapa">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={v === view}
            className={v === view ? styles.tabActive : styles.tab}
            onClick={() => props.onViewChange(v)}
          >
            {VIEW_LABEL[v]}
          </button>
        ))}
      </div>

      {view === "districts" && (
        <label className={styles.select}>
          <span>Indicador</span>
          <select value={districtIndicator} onChange={(e) => props.onDistrictIndicatorChange(e.target.value as IndicatorKey)}>
            {INDICATORS.map((i) => (
              <option key={i.key} value={i.key}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {props.loading && <p className={styles.note}>Carregando dados…</p>}
      {props.error && <p className={styles.error}>Não foi possível carregar os dados: {props.error}</p>}

      {range && (
        <div>
          <div className={styles.legendBar} style={{ background: gradient }} aria-hidden />
          <div className={styles.legendLabels}>
            <span>
              {formatValue(indicator, range.min)} {indicator.unit}
            </span>
            <span>
              {formatValue(indicator, range.max)} {indicator.unit}
            </span>
          </div>
        </div>
      )}

      <details className={styles.details}>
        <summary>O que é uma ilha de calor?</summary>
        <p className={styles.note}>
          Ilha de calor urbana é quando partes da cidade ficam mais quentes que as áreas ao redor. Concreto, asfalto e
          telhados absorvem e guardam o calor do sol. Árvores e outras plantas fazem sombra e liberam água pelas folhas,
          o que ajuda a esfriar o ambiente. Por isso, em geral, lugares mais verdes tendem a ser mais frescos.
        </p>
        <p className={styles.note}>
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
        <p className={styles.note}>{indicator.description}</p>
        <dl className={styles.meta}>
          <dt>Fonte</dt>
          <dd>{indicator.source}</dd>
          <dt>Período</dt>
          <dd>{indicator.period}</dd>
          <dt>Resolução</dt>
          <dd>
            {view === "districts"
              ? "Distritos do IBGE de 2022 (96 no município)"
              : "Grade de 30 m; o sensor térmico mede cerca de 100 m e a imagem é reamostrada"}
          </dd>
        </dl>
        <p className={styles.note}>
          Áreas mais verdes e menos construídas tendem a ser mais frescas nos dados, mas isso é uma associação: não prova
          que um único fator causa a diferença, e outros fatores também influenciam. A temperatura da superfície não é a
          temperatura do ar. O mapa não mostra previsões nem simulações.
        </p>
      </details>

      <p className={styles.credit}>
        Busca: Photon, © colaboradores do OpenStreetMap. Mapa-base: © CARTO.
      </p>
    </aside>
  );
}
