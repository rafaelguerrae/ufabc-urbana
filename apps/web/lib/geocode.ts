export interface SearchResult {
  id: string;
  label: string;
  detail: string;
  lng: number;
  lat: number;
}

// Área de busca: São Paulo, São Bernardo do Campo e Santo André (oeste, sul, leste, norte).
const BBOX = "-46.83,-24.01,-46.27,-23.35";

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    locality?: string;
    city?: string;
    postcode?: string;
  };
}

/** Address and place search using Photon (OpenStreetMap data). */
export async function searchPlaces(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=default&bbox=${BBOX}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Falha na busca (${res.status})`);
  const data = (await res.json()) as { features: PhotonFeature[] };
  return data.features.map((f, n) => {
    const p = f.properties;
    const main = p.name ?? [p.street, p.housenumber].filter(Boolean).join(", ");
    const detail = [p.street && p.name ? p.street : null, p.district ?? p.locality, p.city].filter(Boolean).join(" · ");
    return {
      id: `${p.osm_type ?? "x"}${p.osm_id ?? n}-${n}`,
      label: main || "Local sem nome",
      detail,
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    };
  });
}
