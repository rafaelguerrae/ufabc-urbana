"""Earth Engine prototype: MapBiomas land cover and Landsat land-surface temperature per district."""

import json
import sys

import ee
import geopandas as gpd
import pandas as pd

from ..common import RAW, SAMPLES, write_meta

PROJECT = "bulky-491021"
COVERAGE = "projects/mapbiomas-public/assets/brazil/lulc/collection11/mapbiomas_brazil_collection11_coverage_v3"
YEAR = 2024
LST_START, LST_END = "2023-12-01", "2024-03-31"  # austral summer, daytime scenes
SP_CITY = "3550308"
# MapBiomas Collection 11 class ids grouped for this prototype.
URBAN = [24]
NDVI_THRESHOLD = 0.5  # heuristic cut-off for "dense green" pixels; to be justified from literature
WOODY = [3, 4, 5, 9, 49]  # forest, savanna, mangrove, forest plantation, wooded sandbank


def districts() -> gpd.GeoDataFrame:
    sectors = gpd.read_file(RAW / "ibge" / "SP_setores_CD2022.gpkg")
    sectors = sectors[sectors["CD_MUN"].astype(str) == SP_CITY]
    d = sectors.dissolve(by=["CD_DIST", "NM_DIST"]).reset_index()[["CD_DIST", "NM_DIST", "geometry"]]
    d["geometry"] = d.geometry.simplify(0.0003)
    return d.to_crs(4326)


def mask_clouds(img: ee.Image) -> ee.Image:
    qa = img.select("QA_PIXEL")
    clear = qa.bitwiseAnd(1 << 1).eq(0).And(qa.bitwiseAnd(1 << 3).eq(0)).And(qa.bitwiseAnd(1 << 4).eq(0))
    lst_c = img.select("ST_B10").multiply(0.00341802).add(149.0).subtract(273.15).rename("lst_c")
    refl = img.select(["SR_B4", "SR_B5"]).multiply(0.0000275).add(-0.2)
    ndvi = refl.normalizedDifference(["SR_B5", "SR_B4"]).rename("ndvi")
    return ee.Image.cat(lst_c, ndvi).updateMask(clear)


def composite(region: ee.FeatureCollection | ee.Geometry) -> tuple[ee.Image, int]:
    """Cloud-masked median LST (lst_c) and NDVI (ndvi) for the summer period, plus the scene count."""
    landsat = (
        ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
        .merge(ee.ImageCollection("LANDSAT/LC09/C02/T1_L2"))
        .filterDate(LST_START, LST_END)
        .filterBounds(region)
    )
    return landsat.map(mask_clouds).median(), landsat.size().getInfo()


def main() -> None:
    ee.Initialize(project=PROJECT)
    d = districts()
    fc = ee.FeatureCollection(json.loads(d.to_json()))

    cover = ee.Image(COVERAGE).select(f"classification_{YEAR}")
    fractions = ee.Image.cat(
        cover.remap(URBAN, [1], 0).rename("urban"),
        cover.remap(WOODY, [1] * len(WOODY), 0).rename("woody"),
    )
    median, scenes = composite(fc)
    green = median.select("ndvi").gte(NDVI_THRESHOLD).rename("ndvi_high_share")
    lst = ee.Image.cat(median, green)

    stats = ee.Image.cat(fractions, lst).reduceRegions(
        collection=fc, reducer=ee.Reducer.mean(), scale=30, crs="EPSG:4326"
    )
    rows = [f["properties"] for f in stats.getInfo()["features"]]
    df = pd.DataFrame(rows)
    df["urban"] = (df["urban"] * 100).round(1)
    df["woody"] = (df["woody"] * 100).round(1)
    df["lst_c"] = df["lst_c"].round(2)
    df["ndvi"] = df["ndvi"].round(3)
    df["ndvi_high_share"] = (df["ndvi_high_share"] * 100).round(1)
    df = df.sort_values("CD_DIST")
    SAMPLES.mkdir(exist_ok=True)
    df.to_csv(SAMPLES / "gee_district_prototype.csv", index=False)

    corr = df[["urban", "woody", "ndvi", "ndvi_high_share", "lst_c"]].corr(method="spearman")
    write_meta(
        "gee_district_prototype",
        {
            "source": "MapBiomas Collection 11 coverage v3 + Landsat 8/9 Collection 2 Level 2 (ST_B10)",
            "gee_project": PROJECT,
            "coverage_asset": COVERAGE,
            "coverage_year": YEAR,
            "class_groups": {"urban": URBAN, "woody": WOODY},
            "lst_period": [LST_START, LST_END],
            "ndvi_method": "same cloud-masked median composite; (SR_B5-SR_B4)/(SR_B5+SR_B4) with SR scale 0.0000275, offset -0.2",
            "ndvi_threshold": NDVI_THRESHOLD,
            "lst_method": "median of cloud-masked daytime scenes; ST_B10 * 0.00341802 + 149.0 K, converted to Celsius",
            "landsat_scenes_in_period": scenes,
            "aggregation": "mean per IBGE 2022 district, scale 30 m",
            "districts": len(df),
            "districts_missing_lst": int(df["lst_c"].isna().sum()),
            "spearman": corr.round(3).to_dict(),
        },
    )
    print(f"{scenes} scenes; {len(df)} districts; missing LST: {df['lst_c'].isna().sum()}")
    print(df.describe().round(2))
    print(corr.round(3))


if __name__ == "__main__":
    sys.exit(main())
