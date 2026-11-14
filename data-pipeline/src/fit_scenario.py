"""Fit the NDVI -> land-surface-temperature curve used by the vegetation brush in apps/web.

Reads the committed lookup images (public/data/raster/<city>/values.png + raster.json), so it needs
no Earth Engine call. For each city it writes public/data/raster/<city>/scenario.json:
- curve: mean LST per NDVI bin (land pixels only), forced to be non-increasing, with pixel counts
- fit quality: Pearson r and R² on all land pixels, plus spatial hold-out R² and RMSE
- usable: false when the curve does not support the simulation (reason explains why)

This is an observed *association* between vegetation and surface temperature inside one satellite
composite. It is not the causal effect of planting trees: confounders (buildings, soil, water, relief)
and the time trees take to grow are not modelled. The web app labels every result as simulated.
"""

import json

import numpy as np
from PIL import Image

from .cities import CITIES
from .export_raster import LST_ENC, NDVI_ENC, RASTER_OUT

# NDVI the brush paints toward. This is a provisional modelling assumption, not a sourced threshold:
# USGS defines NDVI but gives no cut-off for "dense vegetation" (see docs/learn-sources.md). 0.7 was
# chosen to stay below the NDVI plateau of forest remnants (the 75th percentile of land pixels is already
# about 0.85) so one brush stroke does not mean "turn this block into forest". The share of land pixels
# that already reach it is written to scenario.json as `target_ndvi_land_share`.
TARGET_NDVI = 0.7
BIN_WIDTH = 0.05
MIN_BIN_PIXELS = 500  # bins with fewer land pixels are dropped, not interpolated over
BLOCK_PX = 64  # hold-out block edge: 64 px is about 2 km, wider than the ~100 m thermal pixel
FOLDS = 5
SEED = 7
# Minimum hold-out R² for the web app to show a number for a city. 0.25 is a deliberately low bar:
# below it NDVI explains too little of the surface temperature variation to quote degrees.
MIN_HOLDOUT_R2 = 0.25


def load_grid(slug: str) -> tuple[np.ndarray, np.ndarray, dict]:
    """Decoded LST (°C) and NDVI of land pixels (NaN elsewhere), plus raster.json."""
    out = RASTER_OUT / slug
    info = json.loads((out / "raster.json").read_text(encoding="utf-8"))
    data = np.asarray(Image.open(out / "values.png").convert("RGBA"))
    valid = data[..., 3] > 0
    lst = LST_ENC[0] + data[..., 0] / 255 * (LST_ENC[1] - LST_ENC[0])
    ndvi = NDVI_ENC[0] + data[..., 1] / 255 * (NDVI_ENC[1] - NDVI_ENC[0])
    land = valid & (ndvi >= 0.0)  # NDVI < 0 is mostly water (about 28 °C), which breaks the relationship
    return np.where(land, lst, np.nan), np.where(land, ndvi, np.nan), info


def isotonic_decreasing(y: np.ndarray, w: np.ndarray) -> np.ndarray:
    """Weighted pool-adjacent-violators for a non-increasing fit."""
    blocks: list[list[float]] = []  # [mean, weight, count]
    for yi, wi in zip(y, w):
        blocks.append([float(yi), float(wi), 1])
        while len(blocks) > 1 and blocks[-2][0] < blocks[-1][0]:
            m2, w2, c2 = blocks.pop()
            m1, w1, c1 = blocks.pop()
            blocks.append([(m1 * w1 + m2 * w2) / (w1 + w2), w1 + w2, c1 + c2])
    return np.concatenate([np.full(int(c), m) for m, _, c in blocks])


def fit_curve(lst: np.ndarray, ndvi: np.ndarray) -> list[dict]:
    edges = np.arange(0.0, 1.0 + BIN_WIDTH / 2, BIN_WIDTH)
    idx = np.clip(np.digitize(ndvi, edges) - 1, 0, len(edges) - 2)
    points = []
    for b in range(len(edges) - 1):
        sel = idx == b
        n = int(sel.sum())
        if n < MIN_BIN_PIXELS:
            continue
        points.append({"ndvi": round(float((edges[b] + edges[b + 1]) / 2), 4), "lst": float(lst[sel].mean()), "n": n})
    smooth = isotonic_decreasing(np.array([p["lst"] for p in points]), np.array([p["n"] for p in points], float))
    for p, s in zip(points, smooth):
        p["lst"] = round(float(s), 3)
    return points


def predict(curve: list[dict], ndvi: np.ndarray) -> np.ndarray:
    # np.interp clamps outside the fitted NDVI range, so the curve is never extrapolated.
    return np.interp(ndvi, [p["ndvi"] for p in curve], [p["lst"] for p in curve])


def holdout(lst: np.ndarray, ndvi: np.ndarray, land: np.ndarray) -> dict:
    """Spatial block cross-validation: neighbouring pixels share a fold, so spatial autocorrelation can't leak."""
    h, w = land.shape
    rng = np.random.default_rng(SEED)
    block_fold = rng.integers(0, FOLDS, size=(-(-h // BLOCK_PX), -(-w // BLOCK_PX)))
    fold = np.kron(block_fold, np.ones((BLOCK_PX, BLOCK_PX), dtype=int))[:h, :w]
    sse = sst = 0.0
    n = 0
    for k in range(FOLDS):
        train, test = land & (fold != k), land & (fold == k)
        if not test.any():
            continue
        curve = fit_curve(lst[train], ndvi[train])
        err = lst[test] - predict(curve, ndvi[test])
        sse += float((err**2).sum())
        sst += float(((lst[test] - lst[train].mean()) ** 2).sum())
        n += int(test.sum())
    return {"holdout_rmse": round((sse / n) ** 0.5, 3), "holdout_r2": round(1 - sse / sst, 4), "holdout_pixels": n}


def build(slug: str) -> dict:
    lst_grid, ndvi_grid, info = load_grid(slug)
    land = ~np.isnan(lst_grid)
    lst, ndvi = lst_grid[land], ndvi_grid[land]
    curve = fit_curve(lst, ndvi)
    fitted = predict(curve, ndvi)
    result = {
        "city": slug,
        "method": (
            "Mean land-surface temperature per NDVI bin over all land pixels (NDVI >= 0, water excluded), "
            "forced non-increasing, linearly interpolated, never extrapolated. The web app moves a painted "
            "pixel's LST by f(target NDVI) - f(its NDVI), keeping the pixel's own residual."
        ),
        "target_ndvi": TARGET_NDVI,
        "target_ndvi_basis": "provisional assumption, no published threshold; see target_ndvi_land_share",
        "target_ndvi_land_share": round(float((ndvi >= TARGET_NDVI).mean()), 4),
        "bin_width": BIN_WIDTH,
        "min_bin_pixels": MIN_BIN_PIXELS,
        "curve": curve,
        "pixels": int(land.sum()),
        "pearson_r": round(float(np.corrcoef(lst, ndvi)[0, 1]), 4),
        "r2": round(float(1 - ((lst - fitted) ** 2).sum() / ((lst - lst.mean()) ** 2).sum()), 4),
        "rmse": round(float(np.sqrt(((lst - fitted) ** 2).mean())), 3),
        **holdout(lst_grid, ndvi_grid, land),
        "block_px": BLOCK_PX,
        "folds": FOLDS,
        "source_files": [f"raster/{slug}/values.png", f"raster/{slug}/raster.json"],
        "period": info["period"],
        "scenes": info["scenes"],
        "notes": [
            "Association between vegetation and surface temperature in one composite, not the causal effect of planting trees.",
            "LST is the surface temperature at about 10:30 local time, not air temperature or a heat wave.",
            "values.png is 8-bit: 0.157 °C per LST step and 0.0047 per NDVI step. Only use area means.",
        ],
    }
    reasons = []
    if curve[-1]["ndvi"] < TARGET_NDVI:
        reasons.append(f"the city has too few pixels with NDVI near {TARGET_NDVI} to support the target")
    if result["holdout_r2"] < MIN_HOLDOUT_R2:
        reasons.append(f"hold-out R² {result['holdout_r2']} is below {MIN_HOLDOUT_R2}")
    result["usable"] = not reasons
    result["reason"] = "; ".join(reasons) or None
    return result


def main() -> None:
    for city in CITIES:
        result = build(city.slug)
        path = RASTER_OUT / city.slug / "scenario.json"
        path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        curve = result["curve"]
        print(
            f"{city.name}: r={result['pearson_r']} R²={result['r2']} hold-out R²={result['holdout_r2']} "
            f"RMSE={result['holdout_rmse']} °C, curve {curve[0]['ndvi']}..{curve[-1]['ndvi']}, "
            f"f({TARGET_NDVI}) usable={result['usable']}" + (f" ({result['reason']})" if result["reason"] else "")
        )


if __name__ == "__main__":
    main()
