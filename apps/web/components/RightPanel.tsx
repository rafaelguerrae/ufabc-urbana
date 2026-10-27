"use client";

import { useEffect, useMemo, useState } from "react";

import { CITIES, getCity, type CitySlug } from "../lib/cities";
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
  const placeCity = place?.district?.city ?? null;
  const [picked, setPicked] = useState<CitySlug | null>(null);
  // Following a new place in another city resets a manual choice.
  useEffect(() => setPicked(null), [placeCity]);
  const city = getCity(picked ?? placeCity ?? "sao-paulo");
  // Units differ in size across cities, and the no-bairro remainder has no residents,
  // so charts compare real units within one city.
  const cityUnits = useMemo(
    () => districts?.filter((d) => d.city === city.slug && d.unit !== "area_sem_bairro") ?? null,
    [districts, city.slug],
  );

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
      <label className={panel.note}>
        Comparar{" "}
        <select value={city.slug} onChange={(e) => setPicked(e.target.value as CitySlug)} aria-label="Município dos gráficos">
          {CITIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {cityUnits ? (
        <>
          <DistrictScatter districts={cityUnits} selectedCode={selectedCode} unitPlural={city.unitPlural} cityName={city.name} />
          <DistrictRanking
            districts={cityUnits}
            indicatorKey={districtIndicator}
            selectedCode={selectedCode}
            unitPlural={city.unitPlural}
          />
        </>
      ) : (
        <p className={panel.note}>Carregando dados…</p>
      )}
    </aside>
  );
}
