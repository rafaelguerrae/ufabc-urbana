"""Export the 30 m land-surface temperature and NDVI grid as static images for apps/web.

Outputs in apps/web/public/data/raster/:
- lst.png, ndvi.png: colored RGBA overlays (transparent where there is no valid pixel)
- values.png: data image for point lookups (R = LST, G = NDVI, A = 255 where valid)
- raster.json: image bounds, size, value encoding, color scale and provenance
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


def main() -> None:
    ee.Initialize(project=PROJECT)
    city = districts().dissolve()
    geom = ee.Geometry(json.loads(city.geometry.to_json())["features"][0]["geometry"])
    west, south, east, north = city.total_bounds
    region = ee.Geometry.Rectangle([west, south, east, north])

    median, scenes = composite(region)
    image = median.select(["lst_c", "ndvi"]).clip(geom).unmask(-9999).toFloat()

    RASTER_OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tif = download_geotiff(image, region, Path(tmp) / "grid.tif")
        with rasterio.open(tif) as src:
            lst, ndvi = src.read(1).astype(float), src.read(2).astype(float)
            bounds = transform_bounds(src.crs, "EPSG:4326", *src.bounds)
            height, width = src.height, src.width
            res = src.res

    valid = (lst > -9000) & (ndvi > -9000)
    lst_v, ndvi_v = lst[valid], ndvi[valid]
    scale = {
        "lst": [float(np.percentile(lst_v, 2)), float(np.percentile(lst_v, 98))],
        "ndvi": [float(np.percentile(ndvi_v, 2)), float(np.percentile(ndvi_v, 98))],
    }
    colorize(lst, valid, *scale["lst"], RAMPS["lst"]).save(RASTER_OUT / "lst.png", optimize=True)
    colorize(ndvi, valid, *scale["ndvi"], RAMPS["ndvi"]).save(RASTER_OUT / "ndvi.png", optimize=True)
    data = np.dstack(
        [
            np.where(valid, encode(lst, LST_ENC), 0),
            np.where(valid, encode(ndvi, NDVI_ENC), 0),
            np.zeros_like(lst, dtype=np.uint8),
            np.where(valid, 255, 0).astype(np.uint8),
        ]
    ).astype(np.uint8)
    Image.fromarray(data, "RGBA").save(RASTER_OUT / "values.png", optimize=True)

    info = {
        "bounds": {"west": bounds[0], "south": bounds[1], "east": bounds[2], "north": bounds[3]},
        "width": width,
        "height": height,
        "pixel_size_m_projected": list(res),
        "valid_pixels": int(valid.sum()),
        "lst": {"encoding": list(LST_ENC), "scale": scale["lst"], "unit": "°C"},
        "ndvi": {"encoding": list(NDVI_ENC), "scale": scale["ndvi"], "unit": "index"},
        "period": [LST_START, LST_END],
        "scenes": scenes,
    }
    (RASTER_OUT / "raster.json").write_text(json.dumps(info, indent=2) + "\n", encoding="utf-8")
    write_meta("raster_export", {**info, "source": "Landsat 8/9 Collection 2 Level 2 via GEE, same composite as gee.py"})
    print(f"{width}x{height}px, {valid.sum():,} valid; LST {lst_v.min():.1f}..{lst_v.max():.1f}, scale {scale}")
    for f in RASTER_OUT.iterdir():
        print(f.name, f.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
