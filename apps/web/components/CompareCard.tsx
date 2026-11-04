import { unitTitle } from "../lib/cities";
import { formatValue, getIndicator, type DistrictProperties } from "../lib/indicators";
import type { RasterSample } from "../lib/raster";
import styles from "./CompareCard.module.css";

export interface ComparePin {
  lng: number;
  lat: number;
  sample: RasterSample | null;
  district: DistrictProperties | null;
}

export type PinId = "a" | "b";

interface CompareCardProps {
  a: ComparePin;
  b: ComparePin;
  active: PinId;
  onActiveChange: (id: PinId) => void;
}

const PIN_LABEL: Record<PinId, string> = { a: "A", b: "B" };

export function CompareCard({ a, b, active, onActiveChange }: CompareCardProps) {
  const lst = getIndicator("lst_c");
  const ndvi = getIndicator("ndvi");
  const diff = a.sample && b.sample ? a.sample.lst - b.sample.lst : null;

  return (
    <section className={styles.card} aria-label="Comparação entre os pontos A e B">
      <div className={styles.chips} role="radiogroup" aria-label="Ponto que será movido ao tocar no mapa">
        {(["a", "b"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active === id}
            className={active === id ? styles.chipActive : styles.chip}
            onClick={() => onActiveChange(id)}
          >
            Mover o ponto {PIN_LABEL[id]}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {([["a", a], ["b", b]] as const).map(([id, pin]) => (
          <div key={id} className={styles.col}>
            <p className={styles.name}>
              <span className={id === "a" ? styles.badgeA : styles.badgeB}>{PIN_LABEL[id]}</span>
              {pin.district ? unitTitle(pin.district) : "Fora da área do mapa"}
            </p>
            {pin.sample ? (
              <>
                <p className={styles.big}>≈ {formatValue(lst, pin.sample.lst)} °C</p>
                <p className={styles.caption}>Temperatura da superfície</p>
                <p className={styles.big}>{formatValue(ndvi, pin.sample.ndvi)}</p>
                <p className={styles.caption}>Vegetação (NDVI)</p>
              </>
            ) : (
              <p className={styles.caption}>Sem dado de satélite neste ponto.</p>
            )}
          </div>
        ))}
      </div>

      {diff !== null && (
        <p className={styles.diff}>
          Diferença de temperatura da superfície: {formatValue(lst, Math.abs(diff))} °C
          {diff === 0 ? "" : diff > 0 ? " (A mais quente)" : " (B mais quente)"}. Valores do ponto, não da média da região.
        </p>
      )}
    </section>
  );
}
