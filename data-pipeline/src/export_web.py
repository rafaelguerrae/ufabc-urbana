"""Export unit indicators as static files for apps/web."""

import geopandas as gpd
import pandas as pd

from .cities import CITIES, City, read_sectors
from .common import ROOT, SAMPLES
from .sources.gee import districts

OUT = ROOT.parent / "apps" / "web" / "public" / "data"


def population_by_unit(city: City) -> pd.DataFrame:
    sectors = read_sectors(city, geometry=False)
    # v0001 = residents (matches GeoSampa qt_populacao on every sampled sector)
    grouped = sectors.groupby("code").agg(population=("v0001", "sum"), area_km2=("AREA_KM2", "sum"))
    grouped["population_density"] = grouped["population"] / grouped["area_km2"]
    return grouped.reset_index()


def city_units(city: City, gee: pd.DataFrame) -> gpd.GeoDataFrame:
    values = gee[gee["city"] == city.slug].drop(columns=["city", "name"])
    gdf = districts(city).merge(values, on="code").merge(population_by_unit(city), on="code")
    real = len(gdf) - int(city.has_remainder)
    assert real == city.expected_units, f"{city.name}: {real} units, expected {city.expected_units}"
    assert gdf[["lst_c", "ndvi", "population"]].notna().all().all(), f"{city.name}: missing values"
    gdf.insert(0, "city", city.slug)
    gdf.insert(1, "unit", city.unit)
    gdf.loc[gdf["code"].str.endswith("_sem_bairro"), "unit"] = "area_sem_bairro"
    return gdf


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    gee = pd.read_csv(SAMPLES / "gee_district_prototype.csv", dtype={"code": str})
    gdf = pd.concat([city_units(c, gee) for c in CITIES], ignore_index=True)
    assert gdf["code"].is_unique, "unit codes collide across cities"
    gdf = gpd.GeoDataFrame(gdf, geometry="geometry", crs=4326)
    gdf["population"] = gdf["population"].astype(int)
    gdf["area_km2"] = gdf["area_km2"].round(2)
    # The remainder unit has no residents; density is not meaningful there.
    gdf["population_density"] = gdf["population_density"].round(0)
    gdf["geometry"] = gdf.geometry.simplify(0.0002)
    (OUT / "districts.geojson").write_text(gdf.to_json(drop_id=True, na="null"), encoding="utf-8")
    print(gdf.groupby("city").agg(units=("code", "count"), population=("population", "sum")))
    print(gdf.drop(columns="geometry").head(3).to_string())


if __name__ == "__main__":
    main()
