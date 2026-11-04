"use client";

import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";

import { formatValue, getIndicator, type DistrictProperties } from "#lib/indicators";

interface DistrictScatterProps {
  districts: DistrictProperties[];
  selectedCode: string | null;
  unitPlural: string;
  cityName: string;
}

interface Point {
  name: string;
  ndvi: number;
  lst: number;
}

const lst = getIndicator("lst_c");
const ndvi = getIndicator("ndvi");

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const p = active ? payload?.[0]?.payload : undefined;
  if (!p) return null;
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[0.78rem] text-foreground">
      <strong>{p.name}</strong>
      <span>
        {formatValue(lst, p.lst)} °C · NDVI {formatValue(ndvi, p.ndvi)}
      </span>
    </div>
  );
}

export function DistrictScatter({ districts, selectedCode, unitPlural, cityName }: DistrictScatterProps) {
  const others: Point[] = [];
  const selected: Point[] = [];
  for (const d of districts) {
    (d.code === selectedCode ? selected : others).push({ name: d.name, ndvi: d.ndvi, lst: d.lst_c });
  }

  return (
    <figure className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4">
      <figcaption className="text-[0.95rem] font-semibold">Calor e vegetação: {unitPlural}</figcaption>
      <p className="text-[0.78rem] leading-[1.4] text-muted">Cada ponto é um {unitPlural === "bairros" ? "bairro" : "distrito"} de {cityName}.</p>
      <div className="mt-1.5 w-full" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, bottom: 24, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="ndvi"
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => formatValue(ndvi, v)}
              tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              stroke="var(--color-border)"
              label={{ value: "Vegetação (NDVI)", position: "insideBottom", offset: -14, fill: "var(--color-muted)", fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="lst"
              domain={["auto", "auto"]}
              width={44}
              tickFormatter={(v: number) => `${formatValue({ ...lst, decimals: 0 }, v)}°`}
              tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              stroke="var(--color-border)"
            />
            <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={others} fill="var(--color-muted)" fillOpacity={0.6} isAnimationActive={false} />
            <Scatter data={selected} fill="var(--color-accent)" shape="circle" isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[0.78rem] leading-[1.4] text-muted">
        Áreas com mais vegetação tendem a ter superfície mais fresca. É uma associação entre médias de {districts.length}{" "}
        {unitPlural}, e não prova que a vegetação sozinha causa a diferença. Temperatura da superfície, não do ar.
        {selectedCode ? " Em destaque: o local selecionado." : ""}
      </p>
    </figure>
  );
}
