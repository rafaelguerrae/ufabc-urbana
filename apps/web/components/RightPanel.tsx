"use client";

import type { DistrictProperties, IndicatorKey } from "../lib/indicators";
import type { RasterInfo } from "../lib/raster";
import { DistrictRanking } from "./charts/DistrictRanking";
import { DistrictScatter } from "./charts/DistrictScatter";
import { PlaceCard, type Place } from "./PlaceCard";
import panel from "./Panel.module.css";

interface RightPanelProps {
  open: boolean;
  place: Place | null;
  raster: RasterInfo | null;
  districts: DistrictProperties[] | null;
  districtIndicator: IndicatorKey;
  onClose: () => void;
}

export function RightPanel({ open, place, raster, districts, districtIndicator, onClose }: RightPanelProps) {
  const selectedCode = place?.district?.code ?? null;

  return (
    <aside
      id="right-panel"
      className={`${panel.panel} ${panel.right} ${open ? "" : panel.hidden}`}
      aria-label="Local selecionado e gráficos"
      aria-hidden={!open}
    >
      <div className={panel.closeBar}>
        <button type="button" className={panel.close} onClick={onClose} aria-label="Fechar painel" title="Fechar">
          ×
        </button>
      </div>

      {place ? (
        <PlaceCard place={place} raster={raster} />
      ) : (
        <p className={panel.note}>Clique no mapa ou busque um endereço para ver a temperatura e a vegetação do local.</p>
      )}

      <h2 className={panel.sectionTitle}>Gráficos</h2>
      {districts ? (
        <>
          <DistrictScatter districts={districts} selectedCode={selectedCode} />
          <DistrictRanking districts={districts} indicatorKey={districtIndicator} selectedCode={selectedCode} />
        </>
      ) : (
        <p className={panel.note}>Carregando dados…</p>
      )}
    </aside>
  );
}
