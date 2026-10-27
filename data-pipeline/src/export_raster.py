"""Export the 30 m land-surface temperature and NDVI grid as static images for apps/web.

Outputs in apps/web/public/data/raster/<city-slug>/ (one set per city):
- lst.png, ndvi.png: colored RGBA overlays (transparent where there is no valid pixel)
- values.png: data image for point lookups (R = LST, G = NDVI, A = 255 where valid)
- raster.json: image bounds, size, value encoding, color scale and provenance

The color scale is the 2nd-98th percentile of all cities' pixels pooled together, so the same
color means the same value in every city.
"""

import json
import tempfile
import zipfile
from pathlib import Path

import ee
import numpy as np
import rasterio
from PIL import Image
from rasterio.warp import transform_bounds

from .cities import CITIES, City
from .common import write_meta
from .export_web import OUT
from .sources.gee import LST_END, LST_START, PROJECT, composite, districts

RASTER_OUT = OUT / "raster"
# Encoding of values.png: value = min + channel / 255 * (max - min)
LST_ENC = (15.0, 55.0)
NDVI_ENC = (-0.2, 1.0)
RAMPS = {
    "lst": [(255, 255, 178), (254, 204, 92), (253, 141, 60), (240, 59, 32), (189, 0, 38)],
    "ndvi": [(255, 255, 204), (194, 230, 153), (120, 198, 121), (49, 163, 84), (0, 104, 55)],
}


def download_geotiff(image: ee.Image, region: ee.Geometry, dest: Path) -> Path:
    url = image.getDownloadURL(
        {"region": region, "scale": 30, "crs": "EPSG:3857", "format": "GEO_TIFF", "filePerBand": False}
    )
    import httpx

    data = httpx.get(url, timeout=600, follow_redirects=True).content
    if data[:2] == b"PK":  # sometimes returned zipped
        zpath = dest.with_suffix(".zip")
        zpath.write_bytes(data)
        with zipfile.ZipFile(zpath) as z:
            name = next(n for n in z.namelist() if n.endswith(".tif"))
            dest.write_bytes(z.read(name))
    else:
        dest.write_bytes(data)
    return dest


def colorize(values: np.ndarray, valid: np.ndarray, vmin: float, vmax: float, ramp: list) -> Image.Image:
    t = np.clip((values - vmin) / (vmax - vmin), 0, 1) * (len(ramp) - 1)
    i = np.minimum(np.floor(t).astype(int), len(ramp) - 2)
    f = (t - i)[..., None]
    stops = np.array(ramp, dtype=float)
    rgb = stops[i] + (stops[i + 1] - stops[i]) * f
    rgba = np.dstack([rgb.round().astype(np.uint8), np.where(valid, 255, 0).astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")


def encode(values: np.ndarray, enc: tuple[float, float]) -> np.ndarray:
    return np.clip((values - enc[0]) / (enc[1] - enc[0]) * 255, 0, 255).round().astype(np.uint8)


def fetch_city(city: City) -> dict:
    unit_polygons = districts(city).dissolve()
    geom = ee.Geometry(json.loads(unit_polygons.geometry.to_json())["features"][0]["geometry"])
    west, south, east, north = unit_polygons.total_bounds
    region = ee.Geometry.Rectangle([west, south, east, north])

    median, scenes = composite(region)
    image = median.select(["lst_c", "ndvi"]).clip(geom).unmask(-9999).toFloat()
    with tempfile.TemporaryDirectory() as tmp:
        tif = download_geotiff(image, region, Path(tmp) / "grid.tif")
        with rasterio.open(tif) as src:
            lst, ndvi = src.read(1).astype(float), src.read(2).astype(float)
            return {
                "lst": lst,
                "ndvi": ndvi,
                "valid": (lst > -9000) & (ndvi > -9000),
                "bounds": transform_bounds(src.crs, "EPSG:4326", *src.bounds),
                "height": src.height,
                "width": src.width,
                "res": src.res,
                "scenes": scenes,
            }


def write_city(city: City, grid: dict, scale: dict) -> None:
    out = RASTER_OUT / city.slug
    out.mkdir(parents=True, exist_ok=True)
    lst, ndvi, valid, bounds = grid["lst"], grid["ndvi"], grid["valid"], grid["bounds"]
    colorize(lst, valid, *scale["lst"], RAMPS["lst"]).save(out / "lst.png", optimize=True)
    colorize(ndvi, valid, *scale["ndvi"], RAMPS["ndvi"]).save(out / "ndvi.png", optimize=True)
    data = np.dstack(
        [
            np.where(valid, encode(lst, LST_ENC), 0),
            np.where(valid, encode(ndvi, NDVI_ENC), 0),
            np.zeros_like(lst, dtype=np.uint8),
            np.where(valid, 255, 0).astype(np.uint8),
        ]
    ).astype(np.uint8)
    Image.fromarray(data, "RGBA").save(out / "values.png", optimize=True)

    info = {
        "city": city.slug,
        "bounds": {"west": bounds[0], "south": bounds[1], "east": bounds[2], "north": bounds[3]},
        "width": grid["width"],
        "height": grid["height"],
        "pixel_size_m_projected": list(grid["res"]),
        "valid_pixels": int(valid.sum()),
        "lst": {"encoding": list(LST_ENC), "scale": scale["lst"], "unit": "°C"},
        "ndvi": {"encoding": list(NDVI_ENC), "scale": scale["ndvi"], "unit": "index"},
        "period": [LST_START, LST_END],
        "scenes": grid["scenes"],
    }
    (out / "raster.json").write_text(json.dumps(info, indent=2) + "\n", encoding="utf-8")
    write_meta(
        f"raster_export_{city.slug}",
        {**info, "source": "Landsat 8/9 Collection 2 Level 2 via GEE, same composite as gee.py"},
    )
    print(f"{city.name}: {grid['width']}x{grid['height']}px, {valid.sum():,} valid")
    for f in sorted(out.iterdir()):
        print("  ", f.name, f.stat().st_size // 1024, "KB")


def main() -> None:
    ee.Initialize(project=PROJECT)
    grids = {c.slug: fetch_city(c) for c in CITIES}
    lst_all = np.concatenate([g["lst"][g["valid"]] for g in grids.values()])
    ndvi_all = np.concatenate([g["ndvi"][g["valid"]] for g in grids.values()])
    scale = {
        "lst": [float(np.percentile(lst_all, 2)), float(np.percentile(lst_all, 98))],
        "ndvi": [float(np.percentile(ndvi_all, 2)), float(np.percentile(ndvi_all, 98))],
    }
    print(f"shared scale {scale}; LST {lst_all.min():.1f}..{lst_all.max():.1f}")
    for city in CITIES:
        write_city(city, grids[city.slug], scale)


if __name__ == "__main__":
    main()
