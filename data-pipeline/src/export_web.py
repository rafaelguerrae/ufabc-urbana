"""Export district indicators as static files for apps/web."""

import json

import geopandas as gpd
import pandas as pd

from .common import RAW, ROOT, SAMPLES
from .sources.gee import SP_CITY, districts

OUT = ROOT.parent / "apps" / "web" / "public" / "data"


def population_by_district() -> pd.DataFrame:
    sectors = gpd.read_file(RAW / "ibge" / "SP_setores_CD2022.gpkg", ignore_geometry=True)
    sectors = sectors[sectors["CD_MUN"].astype(str) == SP_CITY]
    # v0001 = residents (matches GeoSampa qt_populacao on every sampled sector)
    grouped = sectors.groupby("CD_DIST").agg(population=("v0001", "sum"), area_km2=("AREA_KM2", "sum"))
    grouped["population_density"] = grouped["population"] / grouped["area_km2"]
    return grouped.reset_index()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    gee = pd.read_csv(SAMPLES / "gee_district_prototype.csv", dtype={"CD_DIST": str})
    pop = population_by_district().astype({"CD_DIST": str})
    gdf = districts().astype({"CD_DIST": str}).merge(gee.drop(columns="NM_DIST"), on="CD_DIST").merge(pop, on="CD_DIST")
    assert len(gdf) == 96 and gdf[["lst_c", "ndvi", "population"]].notna().all().all()
    gdf = gdf.rename(columns={"CD_DIST": "code", "NM_DIST": "name"})
    gdf["population"] = gdf["population"].astype(int)
    gdf["area_km2"] = gdf["area_km2"].round(2)
    gdf["population_density"] = gdf["population_density"].round(0)
    gdf["geometry"] = gdf.geometry.simplify(0.0002)
    (OUT / "districts.geojson").write_text(gdf.to_json(drop_id=True, na="null"), encoding="utf-8")
    print(f"{len(gdf)} districts; total population {gdf['population'].sum():,}")
    print(gdf.drop(columns="geometry").head(3).to_string())


if __name__ == "__main__":
    main()
