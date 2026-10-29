"""Export OpenStreetMap building footprints with a known height as static GeoJSON for apps/web.

Output: apps/web/public/data/buildings.geojson. Only buildings with an OSM `height` or
`building:levels` tag are exported (decision: buildings without a height are not drawn in 3D and
are never given an invented height). Each feature carries:
- height_m: `height` tag in metres, or `building:levels` x LEVEL_HEIGHT_M when only levels exist
- height_source: "height" (tagged) or "levels" (estimated from the number of floors)
- lst_c: land-surface temperature of the 30 m ground pixel under the footprint centroid (not the
  roof temperature; Landsat cannot resolve single roofs), null where the raster has no data
"""

import json

import numpy as np
from PIL import Image

from .common import write_meta
from .export_raster import LST_ENC, RASTER_OUT
from .export_web import OUT
from .sources.osm import AREAS, OVERPASS, fetch_ways, number, overpass_client

# Assumed storey height for buildings tagged only with `building:levels` (an estimate, not a survey).
LEVEL_HEIGHT_M = 3.0
CITY_SLUGS = ["sao-paulo", "sao-bernardo-do-campo", "santo-andre"]


def load_rasters() -> list[dict]:
    rasters = []
    for slug in CITY_SLUGS:
        info = json.loads((RASTER_OUT / slug / "raster.json").read_text())
        values = np.asarray(Image.open(RASTER_OUT / slug / "values.png"))
        rasters.append({"slug": slug, "info": info, "values": values})
    return rasters


def mercator_y(lat: float) -> float:
    return float(np.log(np.tan(np.pi / 4 + np.radians(lat) / 2)))


def sample_lst(rasters: list[dict], lng: float, lat: float) -> float | None:
    """LST (°C) of the pixel containing the point; the image is a Web Mercator grid."""
    for r in rasters:
        b = r["info"]["bounds"]
        if not (b["west"] <= lng <= b["east"] and b["south"] <= lat <= b["north"]):
            continue
        y0, y1 = mercator_y(b["north"]), mercator_y(b["south"])
        col = int((lng - b["west"]) / (b["east"] - b["west"]) * r["info"]["width"])
        row = int((y0 - mercator_y(lat)) / (y0 - y1) * r["info"]["height"])
        col, row = min(col, r["info"]["width"] - 1), min(row, r["info"]["height"] - 1)
        red, _, _, alpha = r["values"][row, col]
        if alpha == 0:
            return None
        lo, hi = LST_ENC
        return round(lo + int(red) / 255 * (hi - lo), 1)
    return None


def main() -> None:
    rasters = load_rasters()
    features, seen, stats = [], set(), {}
    with overpass_client() as http:
        for name, (lat, lng) in AREAS.items():
            ways = fetch_ways(http, lat, lng)
            kept = 0
            for e in ways:
                if e["id"] in seen:
                    continue
                height = number(e["tags"].get("height"))
                levels = number(e["tags"].get("building:levels"))
                if height is None and levels is None:
                    continue
                seen.add(e["id"])
                ring = [[round(p["lon"], 6), round(p["lat"], 6)] for p in e["geometry"]]
                cx, cy = np.mean(ring[:-1], axis=0)
                features.append(
                    {
                        "type": "Feature",
                        "geometry": {"type": "Polygon", "coordinates": [ring]},
                        "properties": {
                            "height_m": height
                            if height is not None
                            else levels * LEVEL_HEIGHT_M,
                            "height_source": "height"
                            if height is not None
                            else "levels",
                            "lst_c": sample_lst(rasters, float(cx), float(cy)),
                        },
                    }
                )
                kept += 1
            stats[name] = {"ways": len(ways), "exported": kept}
            print(name, stats[name])

    path = OUT / "buildings.geojson"
    path.write_text(
        json.dumps(
            {"type": "FeatureCollection", "features": features}, separators=(",", ":")
        )
    )
    print(f"{len(features)} buildings, {path.stat().st_size // 1024} KB")
    write_meta(
        "buildings_export",
        {
            "source": "OpenStreetMap via Overpass API",
            "endpoint": OVERPASS,
            "license": "ODbL 1.0; attribution required: © OpenStreetMap contributors",
            "areas": {k: list(v) for k, v in AREAS.items()},
            "filter": "buildings with a height or building:levels tag only; others are not exported",
            "level_height_m": LEVEL_HEIGHT_M,
            "lst": "ground LST of the 30 m pixel under the footprint centroid, from the raster export (not roof temperature)",
            "per_area": stats,
            "exported": len(features),
        },
    )


if __name__ == "__main__":
    main()
