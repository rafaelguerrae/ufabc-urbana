"""OpenStreetMap building footprints: feasibility sample (height coverage) around the UFABC campuses."""

import json
import time

from ..common import SAMPLES, client, write_meta

OVERPASS = "https://overpass-api.de/api/interpreter"
# Half-width in degrees (~1.1 km at this latitude) of the box sampled around each point.
HALF = 0.01
AREAS = {
    "santo-andre": (-23.6450844, -46.5273059),
    "sao-bernardo": (-23.6773888, -46.5643578),
    "sao-paulo-centro": (-23.5505, -46.6333),
}


def query(lat: float, lng: float) -> str:
    bbox = f"{lat - HALF},{lng - HALF},{lat + HALF},{lng + HALF}"
    return f'[out:json][timeout:90];way["building"]({bbox});out tags geom;'


def overpass_client():
    """Overpass asks for an identifying User-Agent and rejects browser-like ones."""
    http = client()
    http.headers.update(
        {"User-Agent": "ufabc-urbana-data-pipeline/0.1", "Accept": "*/*"}
    )
    return http


def fetch_ways(http, lat: float, lng: float) -> list[dict]:
    """Closed building ways in the box around a point (multipolygon relations are skipped)."""
    for attempt in range(4):
        r = http.post(OVERPASS, data={"data": query(lat, lng)})
        if r.status_code not in (429, 502, 503, 504):
            break
        time.sleep(15 * (attempt + 1))  # public instance is rate limited
    r.raise_for_status()
    return [e for e in r.json()["elements"] if len(e.get("geometry", [])) >= 4]


def main() -> None:
    SAMPLES.mkdir(exist_ok=True)
    areas = {}
    features = []
    with overpass_client() as http:
        for name, (lat, lng) in AREAS.items():
            ways = fetch_ways(http, lat, lng)
            with_height = sum(
                1 for e in ways if number(e["tags"].get("height")) is not None
            )
            with_levels = sum(
                1 for e in ways if number(e["tags"].get("building:levels")) is not None
            )
            with_either = sum(
                1
                for e in ways
                if number(e["tags"].get("height")) is not None
                or number(e["tags"].get("building:levels")) is not None
            )
            areas[name] = {
                "center": [lat, lng],
                "buildings": len(ways),
                "with_height": with_height,
                "with_levels": with_levels,
                "with_height_or_levels": with_either,
                "share_with_height_or_levels": round(with_either / len(ways), 3)
                if ways
                else None,
            }
            features += [_feature(name, e) for e in ways]
            print(name, areas[name])

    (SAMPLES / "osm_buildings_sample.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}),
        encoding="utf-8",
    )
    write_meta(
        "osm_buildings",
        {
            "source": "OpenStreetMap via Overpass API",
            "endpoint": OVERPASS,
            "query": 'way["building"](bbox); out tags geom;',
            "license": "ODbL 1.0; attribution required: © OpenStreetMap contributors",
            "box_half_width_deg": HALF,
            "areas": areas,
            "note": "Ways only (multipolygon relations are skipped). Heights are volunteer-entered tags, not a survey.",
        },
    )


def number(value: str | None) -> float | None:
    if value is None:
        return None
    try:
        return float(value.lower().replace("m", "").replace(",", ".").strip())
    except ValueError:
        return None


def _feature(area: str, element: dict) -> dict:
    ring = [[p["lon"], p["lat"]] for p in element["geometry"]]
    tags = element["tags"]
    return {
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": [ring]},
        "properties": {
            "area": area,
            "osm_id": element["id"],
            "building": tags.get("building"),
            "height": tags.get("height"),
            "levels": tags.get("building:levels"),
        },
    }


if __name__ == "__main__":
    main()
