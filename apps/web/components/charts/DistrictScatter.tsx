"use client";

import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";

import { formatValue, getIndicator, type DistrictProperties } from "../../lib/indicators";
import styles from "./Chart.module.css";

interface DistrictScatterProps {
  districts: DistrictProperties[];
  selectedCode: string | null;
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
    <div className={styles.tooltip}>
      <strong>{p.name}</strong>
      <span>
        {formatValue(lst, p.lst)} °C · NDVI {formatValue(ndvi, p.ndvi)}
      </span>
    </div>
  );
}

export function DistrictScatter({ districts, selectedCode }: DistrictScatterProps) {
  const others: Point[] = [];
  const selected: Point[] = [];
  for (const d of districts) {
    (d.code === selectedCode ? selected : others).push({ name: d.name, ndvi: d.ndvi, lst: d.lst_c });
  }

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.title}>Calor e vegetação nos distritos</figcaption>
      <p className={styles.sub}>Cada ponto é um distrito de São Paulo.</p>
      <div className={styles.plot} style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, bottom: 24, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="ndvi"
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => formatValue(ndvi, v)}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              stroke="var(--border)"
              label={{ value: "Vegetação (NDVI)", position: "insideBottom", offset: -14, fill: "var(--muted)", fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="lst"
              domain={["auto", "auto"]}
              width={44}
              tickFormatter={(v: number) => `${formatValue({ ...lst, decimals: 0 }, v)}°`}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              stroke="var(--border)"
            />
            <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={others} fill="var(--muted)" fillOpacity={0.6} isAnimationActive={false} />
            <Scatter data={selected} fill="var(--accent)" shape="circle" isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className={styles.caption}>
        Distritos com mais vegetação tendem a ter superfície mais fresca. É uma associação entre médias de {districts.length}{" "}
        distritos, e não prova que a vegetação sozinha causa a diferença. Temperatura da superfície, não do ar.
        {selectedCode ? " Em destaque: o distrito selecionado." : ""}
      </p>
    </figure>
  );
}
