import type { CitySlug } from "./cities";

export type DataType = "observed" | "derived";

export interface DistrictProperties {
  city: CitySlug;
  /** Census unit: IBGE district (São Paulo), IBGE bairro (ABC) or the part of a city with no bairro. */
  unit: "distrito" | "bairro" | "area_sem_bairro";
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
    label: "Temperatura da superfície",
    unit: "°C",
    decimals: 1,
    dataType: "derived",
    source: "Satélites Landsat 8 e 9 (banda térmica ST_B10), processados no Google Earth Engine",
    period: "Dez 2023 a mar 2024 (verão): mediana das imagens de dia sem nuvens",
    description:
      "Temperatura do chão, dos telhados e do asfalto, medida por satélite. Não é a temperatura do ar que sentimos. O satélite passa por volta das 10h30, então o mapa não mostra a noite nem dias de onda de calor.",
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
    label: "Vegetação (índice NDVI)",
    unit: "índice de −1 a 1",
    decimals: 2,
    dataType: "derived",
    source: "Satélites Landsat 8 e 9 (bandas SR_B4 e SR_B5), processados no Google Earth Engine",
    period: "Dez 2023 a mar 2024 (verão): mediana das imagens sem nuvens",
    description:
      "Mede o quanto a superfície é verde. Quanto maior o valor, mais vegetação. O índice também sobe com gramado e solo úmido, então não mede só a copa das árvores.",
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
    label: "Área urbanizada",
    unit: "% da área",
    decimals: 1,
    dataType: "derived",
    source: "MapBiomas, Coleção 11 (classe 24, área urbanizada)",
    period: "2024",
    description:
      "Parte da área classificada como urbana em mapas de 30 m. Regiões muito densas contam como urbanas mesmo com árvores nas ruas, por isso muitas áreas centrais chegam a 100%.",
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
    label: "Densidade demográfica",
    unit: "hab./km²",
    decimals: 0,
    dataType: "observed",
    source: "IBGE, Censo Demográfico 2022 (somado a partir dos setores censitários)",
    period: "2022",
    description: "Moradores contados no Censo 2022 divididos pela área do distrito ou bairro.",
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
  observed: "Dado observado (contagem do Censo)",
  derived: "Estimado a partir de imagens de satélite",
};

export function getIndicator(key: IndicatorKey): Indicator {
  return INDICATORS.find((i) => i.key === key) ?? INDICATORS[0]!;
}

export function formatValue(indicator: Indicator, value: number): string {
  return value.toLocaleString("pt-BR", {
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

export type ViewMode = "lst_c" | "ndvi" | "districts";

export const VIEWS: ViewMode[] = ["lst_c", "ndvi", "districts"];

export const VIEW_LABEL: Record<ViewMode, string> = {
  lst_c: "Calor",
  ndvi: "Vegetação",
  districts: "Médias por distrito ou bairro",
};
