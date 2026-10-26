export type DataType = "observed" | "derived";

export interface DistrictProperties {
  code: string;
  name: string;
  lst_c: number;
  ndvi: number;
  ndvi_high_share: number;
  urban: number;
  woody: number;
  population: number;
  area_km2: number;
  population_density: number;
}

export type IndicatorKey = "lst_c" | "ndvi" | "urban" | "population_density";

export interface Indicator {
  key: IndicatorKey;
  label: string;
  unit: string;
  decimals: number;
  dataType: DataType;
  source: string;
  period: string;
  description: string;
  /** Sequential color ramp, light to dark (ColorBrewer). */
  ramp: [number, number, number][];
}

export const INDICATORS: Indicator[] = [
  {
    key: "lst_c",
    label: "Surface temperature",
    unit: "°C",
    decimals: 1,
    dataType: "derived",
    source: "Landsat 8/9 Collection 2 Level 2 (ST_B10), via Google Earth Engine",
    period: "Dec 2023 – Mar 2024, median of 26 cloud-masked daytime scenes",
    description:
      "Temperature of the land surface (not the air), averaged over the district. Satellite passes happen around 10:30 local time, so this does not describe nights or heat waves.",
    ramp: [
      [255, 255, 178],
      [254, 204, 92],
      [253, 141, 60],
      [240, 59, 32],
      [189, 0, 38],
    ],
  },
  {
    key: "ndvi",
    label: "Vegetation index (NDVI)",
    unit: "index (−1 to 1)",
    decimals: 2,
    dataType: "derived",
    source: "Landsat 8/9 Collection 2 Level 2 (SR_B4, SR_B5), via Google Earth Engine",
    period: "Dec 2023 – Mar 2024, median of 26 cloud-masked scenes",
    description:
      "Greenness of the surface, averaged over the district. Higher values mean denser green vegetation, but it also reacts to grass and wet soil, so it is not a measure of tree canopy.",
    ramp: [
      [255, 255, 204],
      [194, 230, 153],
      [120, 198, 121],
      [49, 163, 84],
      [0, 104, 55],
    ],
  },
  {
    key: "urban",
    label: "Urban area share",
    unit: "% of district",
    decimals: 1,
    dataType: "derived",
    source: "MapBiomas Collection 11, coverage v3 (class 24, urban area)",
    period: "2024",
    description:
      "Share of the district classified as urban area at 30 m. Dense urban fabric counts as urban even where it has street trees, so many central districts reach 100%.",
    ramp: [
      [247, 247, 247],
      [204, 204, 204],
      [150, 150, 150],
      [99, 99, 99],
      [37, 37, 37],
    ],
  },
  {
    key: "population_density",
    label: "Population density",
    unit: "inhabitants / km²",
    decimals: 0,
    dataType: "observed",
    source: "IBGE Census 2022, aggregated from census sectors",
    period: "2022",
    description: "Residents counted in the 2022 Census divided by district area.",
    ramp: [
      [239, 243, 255],
      [189, 215, 231],
      [107, 174, 214],
      [49, 130, 189],
      [8, 81, 156],
    ],
  },
];

export const DATA_TYPE_LABEL: Record<DataType, string> = {
  observed: "Observed (census count)",
  derived: "Derived from satellite data",
};

export function getIndicator(key: IndicatorKey): Indicator {
  return INDICATORS.find((i) => i.key === key) ?? INDICATORS[0]!;
}

export function formatValue(indicator: Indicator, value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: indicator.decimals,
    maximumFractionDigits: indicator.decimals,
  });
}

/** Linear interpolation along the indicator ramp; `t` is clamped to [0, 1]. */
export function colorAt(indicator: Indicator, t: number): [number, number, number] {
  const ramp = indicator.ramp;
  const x = Math.min(1, Math.max(0, t)) * (ramp.length - 1);
  const i = Math.min(Math.floor(x), ramp.length - 2);
  const f = x - i;
  const a = ramp[i]!;
  const b = ramp[i + 1]!;
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}
