"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { colorAt, formatValue, getIndicator, type DistrictProperties, type IndicatorKey } from "../../lib/indicators";

interface DistrictRankingProps {
  districts: DistrictProperties[];
  indicatorKey: IndicatorKey;
  selectedCode: string | null;
  unitPlural: string;
}

const TOP = 10;
const ROW = 26;

export function DistrictRanking({ districts, indicatorKey, selectedCode, unitPlural }: DistrictRankingProps) {
  const indicator = getIndicator(indicatorKey);
  const sorted = [...districts].sort((a, b) => b[indicatorKey] - a[indicatorKey]);
  const min = sorted.at(-1)?.[indicatorKey] ?? 0;
  const max = sorted[0]?.[indicatorKey] ?? 1;
  const span = max - min || 1;

  const rows = sorted.slice(0, TOP).map((d, i) => ({ code: d.code, name: d.name, value: d[indicatorKey], rank: i + 1 }));
  const selectedRank = sorted.findIndex((d) => d.code === selectedCode);
  if (selectedRank >= TOP) {
    const d = sorted[selectedRank]!;
    rows.push({ code: d.code, name: d.name, value: d[indicatorKey], rank: selectedRank + 1 });
  }

  return (
    <figure className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4">
      <figcaption className="text-[0.95rem] font-semibold">
        {unitPlural.charAt(0).toUpperCase() + unitPlural.slice(1)} com os maiores valores
      </figcaption>
      <p className="text-[0.78rem] leading-[1.4] text-muted">
        {indicator.label} ({indicator.unit}), entre {districts.length} {unitPlural}.
      </p>
      <div className="mt-1.5 w-full" style={{ height: rows.length * ROW + 24 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              interval={0}
              tick={{ fill: "var(--color-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--color-hover)" }}
              formatter={(v) => [`${formatValue(indicator, Number(v))} ${indicator.unit}`, indicator.label]}
              contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "var(--color-foreground)" }}
              itemStyle={{ color: "var(--color-foreground)" }}
            />
            <Bar
              dataKey="value"
              radius={4}
              isAnimationActive={false}
              label={{
                position: "right",
                fill: "var(--color-muted)",
                fontSize: 11,
                formatter: (v: unknown) => formatValue(indicator, Number(v)),
              }}
            >
              {rows.map((r) => (
                <Cell
                  key={r.code}
                  fill={`rgb(${colorAt(indicator, (r.value - min) / span).join(",")})`}
                  stroke={r.code === selectedCode ? "var(--color-accent)" : "none"}
                  strokeWidth={r.code === selectedCode ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[0.78rem] leading-[1.4] text-muted">
        As cores seguem a mesma escala do mapa.
        {selectedRank >= 0 ? ` Selecionado: ${selectedRank + 1}º de ${districts.length}.` : ""}
      </p>
    </figure>
  );
}
