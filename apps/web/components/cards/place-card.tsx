import { CITY_LIST_TEXT, unitOf, unitTitle } from "../../lib/cities";
import { formatValue, getIndicator, type DistrictProperties } from "../../lib/indicators";
import type { RasterInfo, RasterSample } from "../../lib/raster";

export interface Place {
  lng: number;
  lat: number;
  label: string;
  sample: RasterSample | null;
  district: DistrictProperties | null;
}

interface PlaceCardProps {
  place: Place;
  raster: RasterInfo | null;
}

const monthYear = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export function PlaceCard({ place, raster }: PlaceCardProps) {
  const { sample, district } = place;
  const lst = getIndicator("lst_c");
  const ndvi = getIndicator("ndvi");
  const density = getIndicator("population_density");
  const diff = sample && district ? sample.lst - district.lst_c : null;
  const period = raster ? `${monthYear.format(new Date(raster.period[0]))} a ${monthYear.format(new Date(raster.period[1]))}` : "";
  const coords = `${place.lat.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}, ${place.lng.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4" aria-label="Local selecionado">
      <div className="flex justify-between gap-2">
        <div>
          <h2 className="text-[1rem] leading-[1.3] font-semibold">{place.label}</h2>
          <p className="mt-0.5 text-[0.75rem] text-muted">
            {district ? unitTitle(district) : `Fora da área do mapa (${CITY_LIST_TEXT})`} · {coords}
          </p>
        </div>
      </div>

      {sample ? (
        <div className="grid grid-cols-[1.4fr_1fr] gap-3">
          <div>
            <p className="text-[1.5rem] font-bold tabular-nums">≈ {formatValue(lst, sample.lst)} °C</p>
            <p className="text-[0.8rem] leading-[1.35] text-muted">Temperatura da superfície aqui por perto</p>
            {diff !== null && (
              <p className="text-[0.8rem] leading-[1.35] text-muted">
                {formatValue({ ...lst, decimals: 1 }, Math.abs(diff))} °C {diff >= 0 ? "mais quente" : "mais fresco"} que a
                média {district ? unitOf(district) : ""}
              </p>
            )}
          </div>
          <div>
            <p className="text-[1.5rem] font-bold tabular-nums">{formatValue(ndvi, sample.ndvi)}</p>
            <p className="text-[0.8rem] leading-[1.35] text-muted">Vegetação (NDVI): quanto maior, mais verde</p>
          </div>
        </div>
      ) : (
        <p className="text-[0.8rem] leading-[1.35] text-muted">
          Sem dado de satélite aqui: o ponto fica fora dos municípios do mapa ou não havia imagem sem nuvens.
        </p>
      )}

      {district && (
        <dl className="text-[0.8rem] leading-[1.4] [&_dd]:text-muted [&_dt]:mt-1 [&_dt]:font-semibold">
          <dt>Média {unitOf(district)}</dt>
          <dd>
            {formatValue(lst, district.lst_c)} °C · NDVI {formatValue(ndvi, district.ndvi)}
          </dd>
          <dt>Densidade demográfica</dt>
          <dd>
            {formatValue(density, district.population_density)} {density.unit} (Censo 2022)
          </dd>
        </dl>
      )}

      <p className="text-[0.7rem] leading-[1.4] text-muted">
        Os valores de satélite são médias em cerca de 90 m ao redor do ponto, calculadas com imagens de dia de {period}.
        Descrevem a superfície do solo, não a temperatura do ar na rua.
      </p>
    </section>
  );
}
