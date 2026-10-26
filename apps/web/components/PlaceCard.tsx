import { formatValue, getIndicator, type DistrictProperties } from "../lib/indicators";
import type { RasterInfo, RasterSample } from "../lib/raster";
import styles from "./PlaceCard.module.css";

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
  onClose: () => void;
}

const monthYear = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export function PlaceCard({ place, raster, onClose }: PlaceCardProps) {
  const { sample, district } = place;
  const lst = getIndicator("lst_c");
  const ndvi = getIndicator("ndvi");
  const density = getIndicator("population_density");
  const diff = sample && district ? sample.lst - district.lst_c : null;
  const period = raster ? `${monthYear.format(new Date(raster.period[0]))} a ${monthYear.format(new Date(raster.period[1]))}` : "";
  const coords = `${place.lat.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}, ${place.lng.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`;

  return (
    <section className={styles.card} aria-label="Local selecionado">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{place.label}</h2>
          <p className={styles.sub}>
            {district ? `Distrito ${district.name}` : "Fora do município de São Paulo"} · {coords}
          </p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </div>

      {sample ? (
        <div className={styles.grid}>
          <div>
            <p className={styles.big}>≈ {formatValue(lst, sample.lst)} °C</p>
            <p className={styles.caption}>Temperatura da superfície aqui por perto</p>
            {diff !== null && (
              <p className={styles.caption}>
                {formatValue({ ...lst, decimals: 1 }, Math.abs(diff))} °C {diff >= 0 ? "mais quente" : "mais fresco"} que a
                média do distrito {district?.name}
              </p>
            )}
          </div>
          <div>
            <p className={styles.big}>{formatValue(ndvi, sample.ndvi)}</p>
            <p className={styles.caption}>Vegetação (NDVI): quanto maior, mais verde</p>
          </div>
        </div>
      ) : (
        <p className={styles.caption}>
          Sem dado de satélite aqui: o ponto fica fora do município ou não havia imagem sem nuvens.
        </p>
      )}

      {district && (
        <dl className={styles.districtList}>
          <dt>Média do distrito {district.name}</dt>
          <dd>
            {formatValue(lst, district.lst_c)} °C · NDVI {formatValue(ndvi, district.ndvi)}
          </dd>
          <dt>Densidade demográfica</dt>
          <dd>
            {formatValue(density, district.population_density)} {density.unit} (Censo 2022)
          </dd>
        </dl>
      )}

      <p className={styles.footnote}>
        Os valores de satélite são médias em cerca de 90 m ao redor do ponto, calculadas com imagens de dia de {period}.
        Descrevem a superfície do solo, não a temperatura do ar na rua.
      </p>
    </section>
  );
}
