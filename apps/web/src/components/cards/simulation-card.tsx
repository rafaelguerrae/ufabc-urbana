import { getCity, type CitySlug } from "#lib/cities";
import { DATA_TYPE_LABEL } from "#lib/indicators";
import type { ScenarioModel } from "#lib/raster";
import type { SimStats } from "#lib/simulation";

interface SimulationCardProps {
  stats: SimStats | null;
  scenarios: { slug: CitySlug; scenario: ScenarioModel | null }[];
}

const number = (value: number, digits: number) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (share: number) => `${Math.round(share * 100).toLocaleString("pt-BR")}%`;

/** The simulated change is shown to the nearest half degree: the model cannot tell finer differences. */
const roundToHalf = (value: number) => Math.round(value * 2) / 2;

/** "cerca de −3,5 °C", or a plain phrase when the rounded change is zero. */
export function changeLabel(stats: SimStats): string {
  const change = roundToHalf(stats.lstAfter - stats.lstBefore);
  return change === 0 ? "Quase sem mudança" : `cerca de ${number(change, 1).replace("-", "−")} °C`;
}

export function SimulationCard({ stats, scenarios }: SimulationCardProps) {
  const usable = scenarios.filter((s): s is { slug: CitySlug; scenario: ScenarioModel } => !!s.scenario?.usable);
  const unavailable = scenarios.filter((s) => !s.scenario?.usable);
  const target = usable[0]?.scenario.target_ndvi ?? 0.7;
  const r2 = usable.map((s) => s.scenario.holdout_r2);
  const rmse = usable.map((s) => s.scenario.holdout_rmse);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4" aria-label="Resultado da simulação">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[1rem] leading-[1.3] font-semibold">O que mudaria</h2>
        <span
          className="inline-block rounded bg-badge-simulated-bg px-2 py-0.5 text-[0.75rem] font-semibold text-badge-simulated-fg"
          title={DATA_TYPE_LABEL.simulated}
        >
          Simulado
        </span>
      </div>

      {stats ? (
        <>
          <div aria-live="polite">
            <p className="text-[1.5rem] font-bold tabular-nums">
              {changeLabel(stats)}
            </p>
            <p className="text-[0.8rem] leading-[1.35] text-muted">
              na temperatura da superfície, em média, na área pintada
            </p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.85rem]">
            <dt className="text-muted">Antes (observado)</dt>
            <dd className="text-right tabular-nums">{number(stats.lstBefore, 1)} °C</dd>
            <dt className="text-muted">Depois (simulado)</dt>
            <dd className="text-right tabular-nums">cerca de {number(stats.lstAfter, 1)} °C</dd>
            <dt className="text-muted">Vegetação (NDVI)</dt>
            <dd className="text-right tabular-nums">
              {number(stats.ndviBefore, 2)} → {number(stats.ndviAfter, 2)}
            </dd>
            <dt className="text-muted">Área pintada</dt>
            <dd className="text-right tabular-nums">
              {number(stats.areaHa, stats.areaHa >= 100 ? 0 : 1)} {stats.areaHa < 1.05 ? "hectare" : "hectares"}
            </dd>
          </dl>
        </>
      ) : (
        <p className="text-[0.85rem] leading-normal text-muted">Pinte no mapa para ver o que muda.</p>
      )}

      {unavailable.length > 0 && (
        <p className="text-[0.8rem] leading-normal text-muted" role="note">
          Sem estimativa para {unavailable.map((s) => getCity(s.slug).name).join(", ")}: os dados dessa cidade não sustentam o
          modelo. Ela não é pintada.
        </p>
      )}

      <ul className="list-disc pl-5 text-[0.8rem] leading-normal text-muted">
        <li>É uma estimativa, não uma previsão. Ela segue a relação que as imagens de satélite já mostram entre vegetação e calor.</li>
        <li>Mostra a temperatura do chão por volta das 10h30 no verão, não a do ar. Árvores novas levam anos para crescer.</li>
        <li>Associação não é causa: o resultado real depende de outros fatores, como prédios, solo e água por perto.</li>
      </ul>

      <details className="text-[0.8rem] leading-normal text-muted">
        <summary className="cursor-pointer font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          Como a simulação funciona
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <p>
            Para cada cidade medimos a temperatura média da superfície em cada nível de vegetação (NDVI), só em terra firme.
            Cada ponto pintado recebe a diferença entre essa média no nível {number(target, 1)} e a média no nível em que ele
            está hoje. A variação própria do ponto é mantida.
          </p>
          <p>
            O nível {number(target, 1)} é uma hipótese nossa, sem fonte publicada.{" "}
            {usable.length > 0 &&
              `Hoje ele já é atingido por ${usable.map((s) => `${percent(s.scenario.target_ndvi_land_share)} da terra firme de ${getCity(s.slug).name}`).join(", ")}.`}
          </p>
          {usable.length > 0 && (
            <p>
              Testamos a curva em trechos do mapa que ela não tinha visto: a vegetação explica de {percent(Math.min(...r2))} a{" "}
              {percent(Math.max(...r2))} das diferenças de temperatura, e o erro típico em um único ponto é de{" "}
              {number(Math.min(...rmse), 1)} a {number(Math.max(...rmse), 1)} °C. Por isso só mostramos médias da área pintada.
            </p>
          )}
          <p>
            Água não é pintada e prédios não são retirados. O método e os limites estão em data-pipeline/FEASIBILITY.md, no
            repositório do projeto.
          </p>
        </div>
      </details>
    </section>
  );
}
