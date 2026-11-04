import { unitTitle } from "#lib/cities";
import { formatValue, getIndicator, type DistrictProperties } from "#lib/indicators";
import type { RasterSample } from "#lib/raster";

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
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3.5" aria-label="Comparação entre os pontos A e B">
      <div className="flex gap-2" role="radiogroup" aria-label="Ponto que será movido ao tocar no mapa">
        {(["a", "b"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active === id}
            className={active === id ? "min-h-10 flex-1 cursor-pointer rounded-[10px] border border-accent bg-accent-soft text-[0.85rem] font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" : "min-h-10 flex-1 cursor-pointer rounded-[10px] border border-border bg-button text-[0.85rem] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"}
            onClick={() => onActiveChange(id)}
          >
            Mover o ponto {PIN_LABEL[id]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {([["a", a], ["b", b]] as const).map(([id, pin]) => (
          <div key={id} className="flex min-w-0 flex-col gap-0.5">
            <p className="mb-1 flex items-center gap-1.5 text-[0.8rem] font-semibold">
              <span className={`inline-flex size-5 flex-none items-center justify-center rounded-full text-[0.7rem] text-white ${id === "a" ? "bg-[#b91c1c]" : "bg-[#15803d]"}`}>{PIN_LABEL[id]}</span>
              {pin.district ? unitTitle(pin.district) : "Fora da área do mapa"}
            </p>
            {pin.sample ? (
              <>
                <p className="text-[1.1rem] font-bold">≈ {formatValue(lst, pin.sample.lst)} °C</p>
                <p className="mb-1 text-[0.78rem] text-muted">Temperatura da superfície</p>
                <p className="text-[1.1rem] font-bold">{formatValue(ndvi, pin.sample.ndvi)}</p>
                <p className="mb-1 text-[0.78rem] text-muted">Vegetação (NDVI)</p>
              </>
            ) : (
              <p className="mb-1 text-[0.78rem] text-muted">Sem dado de satélite neste ponto.</p>
            )}
          </div>
        ))}
      </div>

      {diff !== null && (
        <p className="text-[0.82rem] leading-[1.45] text-muted">
          Diferença de temperatura da superfície: {formatValue(lst, Math.abs(diff))} °C
          {diff === 0 ? "" : diff > 0 ? " (A mais quente)" : " (B mais quente)"}. Valores do ponto, não da média da região.
        </p>
      )}
    </section>
  );
}
