import type { Feature, MultiPolygon, Polygon, Position } from "geojson";

import { formatValue, getIndicator, type DistrictProperties } from "./indicators";

type District = Feature<Polygon | MultiPolygon, DistrictProperties>;

/** west, south, east, north */
export type Bounds = [number, number, number, number];

export interface TourStep {
  id: string;
  title: string;
  body: string;
  /** District shown in this step: the map fits its bounds and outlines it. */
  focus?: { code: string; bounds: Bounds };
}

/** The tour compares districts of one city, because units differ in size between cities. */
const TOUR_CITY = "sao-paulo";
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

function boundsOf(feature: District): Bounds {
  const rings: Position[][] =
    feature.geometry.type === "Polygon" ? [feature.geometry.coordinates[0]!] : feature.geometry.coordinates.map((p) => p[0]!);
  const points = rings.flat();
  return [
    Math.min(...points.map((p) => p[0]!)),
    Math.min(...points.map((p) => p[1]!)),
    Math.max(...points.map((p) => p[0]!)),
    Math.max(...points.map((p) => p[1]!)),
  ];
}

const number = (value: number, key: "lst_c" | "ndvi") => formatValue(getIndicator(key), value);
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

/**
 * Builds the steps from the data: among the districts with at least the median population density,
 * the hottest and the coolest by surface temperature. Nothing about these places is hard-coded.
 * Returns null while the data is missing or too small to compare.
 */
export function buildTour(districts: District[] | null): TourStep[] | null {
  const city = districts?.filter((f) => f.properties.city === TOUR_CITY && f.properties.unit === "distrito") ?? [];
  if (city.length < 4) return null;
  const threshold = median(city.map((f) => f.properties.population_density));
  const dense = city.filter((f) => f.properties.population_density >= threshold);
  const byTemperature = [...dense].sort((a, b) => a.properties.lst_c - b.properties.lst_c);
  const cool = byTemperature[0]!;
  const hot = byTemperature[byTemperature.length - 1]!;
  const hotP = hot.properties;
  const coolP = cool.properties;

  const describe = (p: DistrictProperties) =>
    `Temperatura da superfície: ${number(p.lst_c, "lst_c")} °C. Vegetação (NDVI): ${number(p.ndvi, "ndvi")}. ` +
    `Moradores: ${integer(p.population_density)} por km².`;

  return [
    {
      id: "intro",
      title: "Duas partes da mesma cidade",
      body:
        "Vamos comparar dois distritos de São Paulo com quantidade parecida de moradores por km². " +
        "A cor do mapa mostra a temperatura da superfície vista pelo satélite: quanto mais vermelho, mais quente. " +
        `Entre os distritos com densidade igual ou acima da mediana da cidade (${integer(threshold)} moradores por km²), ` +
        "escolhemos o mais quente e o mais fresco.",
    },
    {
      id: "hot",
      title: `Mais quente: ${hotP.name}`,
      body: `${describe(hotP)} Pouca vegetação e muita área construída aparecem junto de superfícies mais quentes.`,
      focus: { code: hotP.code, bounds: boundsOf(hot) },
    },
    {
      id: "cool",
      title: `Mais fresco: ${coolP.name}`,
      body: `${describe(coolP)} Aqui há mais vegetação, e a superfície é mais fresca, mesmo com muita gente morando.`,
      focus: { code: coolP.code, bounds: boundsOf(cool) },
    },
    {
      id: "reading",
      title: "Como ler essa diferença",
      body:
        `Há ${number(hotP.lst_c - coolP.lst_c, "lst_c")} °C de diferença entre os dois distritos. ` +
        "Isso é uma associação: relevo, tipo de construção e outros fatores também pesam, e os dados não provam que a vegetação sozinha explica a diferença. " +
        "É a temperatura da superfície, de dia, no verão: não é a temperatura do ar que sentimos.",
    },
    {
      id: "end",
      title: "Agora é com você",
      body: "Busque a sua rua, toque no mapa e compare com o distrito. Mude a camada para ver a vegetação ou os distritos.",
    },
  ];
}
