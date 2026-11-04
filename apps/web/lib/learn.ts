import type { DistrictProperties, ViewMode } from "./indicators";

// Lesson text is limited to what the sources support; see docs/learn-sources.md.

export interface Reference {
  id: string;
  citation: string;
  url: string;
}

/** Which real unit a task points at, picked from the loaded data. */
export type ExampleKind = "hot" | "green";

/** What the learner does on the map in a step. Completion is detected from the map state. */
export type LessonTask =
  | { type: "read" }
  | { type: "click"; target: ExampleKind; prompt: string; hint: string; done: string }
  | { type: "compare"; prompt: string; hint: string; done: string }
  | { type: "free"; prompt: string; hint: string; done: string };

export interface Lesson {
  id: string;
  title: string;
  body: string[];
  /** Layer shown when the step opens. */
  view?: ViewMode;
  task: LessonTask;
  sources: string[];
}

export const REFERENCES: Reference[] = [
  {
    id: "epa",
    citation: "Agência de Proteção Ambiental dos EUA (EPA). Learn About Heat Islands.",
    url: "https://www.epa.gov/heatislands/learn-about-heat-islands",
  },
  {
    id: "almeida2024",
    citation:
      "Almeida, P. L. B.; Ribeiro, F. N. D. (2024). Análise Multivariada de Ilha de Calor Urbana na Região Metropolitana de São Paulo, Brasil. Revista Brasileira de Meteorologia, 39.",
    url: "https://www.scielo.br/j/rbmet/a/ZNQcD7ZspfQ4FKkzhHJZmHt/abstract/?lang=pt",
  },
  {
    id: "souza2017",
    citation:
      "Souza, C. V. F.; Rangel, R. H. O.; Cataldi, M. (2017). Avaliação Numérica da Influência da Urbanização no Regime de Convecção e nos Padrões de Precipitação da Região Metropolitana de São Paulo. Revista Brasileira de Meteorologia, 32(4).",
    url: "https://www.scielo.br/j/rbmet/a/ktdXwJFPg3cS7CdJ7VHJ4tn/",
  },
  {
    id: "souza2019",
    citation:
      "Souza, C. M.; Leite, L. P.; Perini, P.; Karzmierczak, L. (2019). A vegetação urbana a serviço do conforto térmico: uma proposta para um bairro metropolitano de São Paulo, Brasil. Labor e Engenho, 13.",
    url: "https://periodicos.sbu.unicamp.br/ojs/index.php/labore/article/view/8654619",
  },
  {
    id: "usgs-ndvi",
    citation: "USGS. Landsat Normalized Difference Vegetation Index.",
    url: "https://www.usgs.gov/landsat-missions/landsat-normalized-difference-vegetation-index",
  },
  {
    id: "usgs-et",
    citation: "USGS (2015). The EarthWord: Evapotranspiration.",
    url: "https://www.usgs.gov/news/earthword-evapotranspiration",
  },
  {
    id: "nasa-albedo",
    citation: "NASA Earthdata. Albedo.",
    url: "https://www.earthdata.nasa.gov/topics/land-surface/albedo",
  },
];

export const LESSONS: Lesson[] = [
  {
    id: "ilha-de-calor",
    title: "O que é uma ilha de calor",
    body: [
      "Áreas urbanas costumam ficar mais quentes que as áreas ao redor, porque há muitas construções concentradas e pouca vegetação. Essas áreas mais quentes são chamadas de ilhas de calor.",
      "Em estudos sobre a Região Metropolitana de São Paulo, o efeito aparece ligado à urbanização rápida e desordenada, ao tipo de uso do solo e à falta de espaços verdes.",
    ],
    view: "lst_c",
    task: {
      type: "click",
      target: "hot",
      prompt: "Toque na área destacada no mapa. Ela tem a maior temperatura média da superfície da cidade.",
      hint: "Procure o contorno preto com o círculo pulsando. Os tons mais escuros do mapa são os mais quentes.",
      done: "Veja o valor ao lado: é a temperatura da superfície por perto, medida por satélite, e não a do ar. Compare com a média da região.",
    },
    sources: ["epa", "almeida2024"],
  },
  {
    id: "superficie-e-ar",
    title: "Temperatura da superfície não é a do ar",
    body: [
      "Existem dois tipos de ilha de calor. Na da superfície, telhados e ruas absorvem e emitem mais calor que a maioria das superfícies naturais, principalmente de dia, com sol forte. Na do ar, é o ar da cidade que fica mais quente, e a diferença varia bem menos.",
      "O mapa deste site mostra a temperatura da superfície, medida por satélite. Ela ajuda a ver onde o calor se concentra, mas não é a temperatura que um termômetro marcaria na rua.",
    ],
    view: "lst_c",
    task: { type: "read" },
    sources: ["epa"],
  },
  {
    id: "plantas",
    title: "Como as plantas ajudam a esfriar",
    body: [
      "Plantas esfriam o ambiente de duas formas: dão sombra e liberam água pelas folhas, e a água também evapora do solo e de superfícies úmidas. Esse conjunto é chamado de evapotranspiração.",
      "Quando faltam áreas verdes e superfícies com água, há menos evaporação, e isso é apontado como uma das causas das ilhas de calor.",
    ],
    view: "ndvi",
    task: {
      type: "click",
      target: "green",
      prompt: "Agora toque na área destacada. Ela tem o maior índice médio de vegetação da cidade.",
      hint: "Procure o contorno preto com o círculo pulsando. No mapa de vegetação, os tons mais escuros indicam mais plantas.",
      done: "Compare a temperatura e o índice de vegetação daqui com os da área quente que você viu antes.",
    },
    sources: ["epa", "usgs-et", "souza2017"],
  },
  {
    id: "materiais",
    title: "Materiais e cores importam",
    body: [
      "Materiais comuns na cidade, como asfalto e concreto, refletem menos a luz do sol e guardam e devolvem mais calor que os materiais naturais. A fração da luz do sol que uma superfície reflete é chamada de albedo.",
      "Quanto menos luz uma superfície reflete, mais ela esquenta. Por isso superfícies mais claras são uma das estratégias estudadas para reduzir as ilhas de calor.",
    ],
    view: "lst_c",
    task: {
      type: "compare",
      prompt: "Os pontos A (área mais quente) e B (área mais verde) já estão no mapa. Escolha um deles e toque em outro lugar para movê-lo.",
      hint: "Escolha A ou B no painel e toque no mapa onde quiser, por exemplo numa praça ou numa avenida movimentada.",
      done: "Os números são do ponto exato que você escolheu. Diferenças entre dois pontos podem ter outras causas além da vegetação.",
    },
    sources: ["epa", "nasa-albedo", "souza2017"],
  },
  {
    id: "sombra",
    title: "O papel da sombra",
    body: [
      "Árvores sombreiam ruas e calçadas, o que reduz o aquecimento das superfícies pelo sol. Um estudo sobre um bairro de São Paulo propõe aumentar a arborização e conclui que ela é uma estratégia funcional para melhorar o conforto térmico.",
      "Atenção: esse estudo parte da cobertura vegetal e do sombreamento, e não mede uma queda de temperatura. Por isso este site não promete quantos graus uma árvore esfria.",
    ],
    task: { type: "read" },
    sources: ["epa", "souza2019"],
  },
  {
    id: "ler-o-mapa",
    title: "Como ler o índice de vegetação (NDVI)",
    body: [
      "O NDVI é um índice calculado a partir de imagens de satélite que mede o quanto uma área está verde. Ele compara a luz vermelha e a luz infravermelha refletidas pela superfície, e seus valores ficam entre −1 e 1.",
      "Neste mapa, o NDVI mostra onde há mais ou menos plantas, mas qualquer limite para chamar uma área de \"muito verde\" é uma escolha provisória nossa, ainda sem base na literatura.",
      "Lembre-se: o mapa mostra associações, não causas. Lugares mais quentes e com menos vegetação podem ter outros fatores em comum, como mais construções ou ruas largas.",
    ],
    view: "ndvi",
    task: {
      type: "free",
      prompt: "Busque o seu endereço na barra de busca ou toque na sua rua no mapa.",
      hint: "Digite o nome da rua no campo de busca no alto da tela, ou toque direto no mapa.",
      done: "Compare o valor do seu ponto com a média do distrito ou bairro. É a temperatura da superfície, de dia, no verão.",
    },
    sources: ["usgs-ndvi", "almeida2024"],
  },
];

export interface LearnExample {
  kind: ExampleKind;
  city: DistrictProperties["city"];
  unit: DistrictProperties;
}

/**
 * Real examples from the loaded data: per city, the unit with the highest mean surface temperature ("hot") and the
 * one with the highest mean NDVI ("green"). Units without residents ("area_sem_bairro") are skipped.
 */
export function pickExamples(units: DistrictProperties[]): LearnExample[] {
  const examples: LearnExample[] = [];
  const cities = [...new Set(units.map((u) => u.city))];
  for (const city of cities) {
    const own = units.filter((u) => u.city === city && u.unit !== "area_sem_bairro");
    if (own.length === 0) continue;
    const hot = own.reduce((a, b) => (b.lst_c > a.lst_c ? b : a));
    const green = own.reduce((a, b) => (b.ndvi > a.ndvi ? b : a));
    examples.push({ kind: "hot", city, unit: hot }, { kind: "green", city, unit: green });
  }
  return examples;
}

/** A task target with a point inside its polygon, ready to be drawn and flown to. */
export interface MapTarget extends LearnExample {
  lng: number;
  lat: number;
}

/** One hot and one green target for the guided tasks: São Paulo when available, else the first city. */
export function pickTargets(targets: MapTarget[]): Partial<Record<ExampleKind, MapTarget>> {
  const city = targets.some((t) => t.city === "sao-paulo") ? "sao-paulo" : targets[0]?.city;
  return {
    hot: targets.find((t) => t.kind === "hot" && t.city === city),
    green: targets.find((t) => t.kind === "green" && t.city === city),
  };
}
