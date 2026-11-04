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
} from "../../lib/indicators";
import type { RasterInfo } from "../../lib/raster";
import { LayerIcon } from "../common/layer-icon";
import { SheetPanel } from "./sheet-panel";

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
        <div className="mb-2 flex items-center gap-3">
          <Image src="/ufabc-urbana.png" alt="" width={56} height={56} className="size-14 flex-none" priority />
          <h1 className="text-[1.5rem] font-bold">UFABC Urbana</h1>
        </div>
        <p className="text-[0.85rem] leading-normal text-muted">
          Por que algumas partes de São Paulo, São Bernardo do Campo e Santo André são mais quentes que outras? Onde há
          muito concreto e pouca vegetação, a cidade esquenta mais: é a chamada ilha de calor. Busque sua rua e compare.
        </p>
        <button type="button" className="mt-3 min-h-11 cursor-pointer rounded-xl border-0 bg-accent px-[18px] text-[0.9rem] font-semibold text-accent-contrast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-50" onClick={props.onStartTour} disabled={!props.onStartTour}>
          Fazer um tour guiado
        </button>
      </header>

      <section className="flex flex-col gap-2.5" aria-label="Camada do mapa">
        <h2 className="text-[0.75rem] font-bold tracking-[0.04em] text-muted uppercase">Camada</h2>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Camada do mapa">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={v === view}
              className={`flex w-full cursor-pointer flex-row items-center gap-3 rounded-xl border px-3.5 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent text-foreground ${v === view ? "border-accent bg-accent-soft shadow-[inset_0_0_0_1px_var(--color-accent)]" : "border-border bg-surface hover:bg-hover"}`}
              onClick={() => props.onViewChange(v)}
            >
              <span className={`grid size-10 flex-none place-items-center rounded-[10px] ${v === view ? "bg-accent text-accent-contrast" : "bg-hover text-muted"}`}>
                <LayerIcon view={v} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[0.95rem] font-semibold">{VIEW_LABEL[v]}</span>
                <span className="text-[0.8rem] text-muted">{VIEW_HINT[v]}</span>
              </span>
            </button>
          ))}
        </div>

        {view === "districts" && (
          <label className="flex flex-col gap-1 text-[0.8rem] text-muted">
            <span>Indicador</span>
            <select
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-foreground"
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
        <section className="flex flex-col gap-2.5" aria-label="Edifícios em 3D">
          <label className="flex cursor-pointer items-center gap-2 text-[0.9rem] font-semibold">
            <input
              className="size-[18px] accent-accent"
              type="checkbox"
              checked={props.buildings3d}
              onChange={(e) => props.onBuildings3dChange(e.target.checked)}
            />
            <span>Edifícios em 3D</span>
          </label>
          <p className="text-[0.85rem] leading-normal text-muted">
            Aproxime o mapa e incline a visão para ver. Só aparecem prédios com altura registrada no OpenStreetMap
            (cobertura irregular: boa no centro de São Paulo, pequena perto dos campi da UFABC); os demais ficam planos
            no mapa. A cor é a temperatura do chão sob o prédio, não a do telhado. Quando só o número de andares é
            conhecido, a altura é estimada em 3 m por andar.
          </p>
        </section>
      )}

      {props.loading && <p className="text-[0.85rem] leading-normal text-muted">Carregando dados…</p>}
      {props.error && <p className="text-[0.85rem] text-[#ef4444]">Não foi possível carregar os dados: {props.error}</p>}

      {range && (
        <section className={`rounded-xl border border-border bg-surface p-3.5 flex flex-col gap-2`} aria-label="Legenda">
          <h2 className="text-[0.75rem] font-bold tracking-[0.04em] text-muted uppercase">{indicator.label}</h2>
          <div className="h-3 rounded-md" style={{ background: gradient }} aria-hidden />
          <div className="flex justify-between text-[0.75rem] text-muted">
            <span>
              {formatValue(indicator, range.min)} {indicator.unit}
            </span>
            <span>
              {formatValue(indicator, range.max)} {indicator.unit}
            </span>
          </div>
        </section>
      )}

      <details className="rounded-xl border border-border bg-surface px-3.5 py-3 [&>*+*]:mt-2 [&>summary]:cursor-pointer [&>summary]:text-[0.9rem] [&>summary]:font-semibold [&>summary+*]:mt-2.5">
        <summary>O que é uma ilha de calor?</summary>
        <p className="text-[0.85rem] leading-normal text-muted">
          Ilha de calor urbana é quando partes da cidade ficam mais quentes que as áreas ao redor. Concreto, asfalto e
          telhados absorvem e guardam o calor do sol. Árvores e outras plantas fazem sombra e liberam água pelas folhas,
          o que ajuda a esfriar o ambiente. Por isso, em geral, lugares mais verdes tendem a ser mais frescos.
        </p>
        <p className="text-[0.85rem] leading-normal text-muted">
          No mapa, quanto mais vermelha a cor, mais quente está a superfície vista pelo satélite. Compare avenidas, praças
          e parques do seu bairro.
        </p>
      </details>

      <details className="rounded-xl border border-border bg-surface px-3.5 py-3 [&>*+*]:mt-2 [&>summary]:cursor-pointer [&>summary]:text-[0.9rem] [&>summary]:font-semibold [&>summary+*]:mt-2.5">
        <summary>Sobre esta camada</summary>
        <p>
          <span className={`inline-block rounded px-2 py-0.5 text-[0.75rem] font-semibold ${indicator.dataType === "observed" ? "bg-badge-observed-bg text-badge-observed-fg" : "bg-badge-derived-bg text-badge-derived-fg"}`}>
            {DATA_TYPE_LABEL[indicator.dataType]}
          </span>
        </p>
        <p className="text-[0.85rem] leading-normal text-muted">{indicator.description}</p>
        <dl className="text-[0.8rem] leading-[1.4] [&_dd]:text-muted [&_dt]:mt-1.5 [&_dt]:font-semibold">
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
        <p className="text-[0.85rem] leading-normal text-muted">
          Áreas mais verdes e menos construídas tendem a ser mais frescas nos dados, mas isso é uma associação: não prova
          que um único fator causa a diferença, e outros fatores também influenciam. A temperatura da superfície não é a
          temperatura do ar. O mapa não mostra previsões nem simulações.
        </p>
      </details>
    </SheetPanel>
  );
}
