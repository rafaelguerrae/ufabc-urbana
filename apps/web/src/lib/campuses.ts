export interface Campus {
  id: string;
  name: string;
  lng: number;
  lat: number;
}

// Coordinates from OpenStreetMap (via Photon): way 538809288 (Santo André) and way 290653696 (São Bernardo do Campo).
export const CAMPUSES: Campus[] = [
  { id: "santo-andre", name: "UFABC · Campus Santo André", lng: -46.5273059, lat: -23.6450844 },
  { id: "sao-bernardo", name: "UFABC · Campus São Bernardo do Campo", lng: -46.5643578, lat: -23.6773888 },
];
