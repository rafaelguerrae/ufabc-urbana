"use client";

import { useEffect, useMemo, useState } from "react";

import { CITIES, getCity, type CitySlug } from "#lib/cities";
import type { DistrictProperties } from "#lib/indicators";
import type { Place } from "#components/cards/place-card";
import { DistrictRanking } from "./district-ranking";
import { DistrictScatter } from "./district-scatter";

interface PlaceChartsProps {
  place: Place;
  districts: DistrictProperties[] | null;
}

/** Comparison charts of the municipality of the selected place, with the place's district or bairro highlighted. */
export function PlaceCharts({ place, districts }: PlaceChartsProps) {
  const selectedCode = place.district?.code ?? null;
  const placeCity = place.district?.city ?? null;
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
    <section className="flex flex-col gap-3 border-t border-border pt-4" aria-label="Gráficos">
      <h2 className="text-[0.75rem] font-bold tracking-[0.04em] text-muted uppercase">Gráficos</h2>
      <label className="text-[0.85rem] leading-normal text-muted">
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
          <DistrictRanking districts={cityUnits} indicatorKey="lst_c" selectedCode={selectedCode} unitPlural={city.unitPlural} />
        </>
      ) : (
        <p className="text-[0.85rem] leading-normal text-muted">Carregando dados…</p>
      )}
    </section>
  );
}
