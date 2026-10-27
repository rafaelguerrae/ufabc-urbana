import type { DistrictProperties } from "./indicators";

export type CitySlug = "sao-paulo" | "sao-bernardo-do-campo" | "santo-andre";

export interface CityInfo {
  slug: CitySlug;
  name: string;
  /** Plural of the map unit used in this city, for chart captions. */
  unitPlural: string;
}

export const CITIES: CityInfo[] = [
  { slug: "sao-paulo", name: "São Paulo", unitPlural: "distritos" },
  { slug: "sao-bernardo-do-campo", name: "São Bernardo do Campo", unitPlural: "bairros" },
  { slug: "santo-andre", name: "Santo André", unitPlural: "bairros" },
];

export const CITY_NAMES = CITIES.map((c) => c.name);
export const CITY_LIST_TEXT = "São Paulo, São Bernardo do Campo e Santo André";

export function getCity(slug: CitySlug): CityInfo {
  return CITIES.find((c) => c.slug === slug) ?? CITIES[0]!;
}

/** "Distrito Sé", "Bairro Centro" or the remainder name, as a title. */
export function unitTitle(d: DistrictProperties): string {
  if (d.unit === "area_sem_bairro") return d.name;
  return `${d.unit === "bairro" ? "Bairro" : "Distrito"} ${d.name}`;
}

/** "do distrito Sé", "do bairro Centro" or "da Área sem bairro (sem moradores)". */
export function unitOf(d: DistrictProperties): string {
  if (d.unit === "area_sem_bairro") return `da ${d.name}`;
  return `${d.unit === "bairro" ? "do bairro" : "do distrito"} ${d.name}`;
}
