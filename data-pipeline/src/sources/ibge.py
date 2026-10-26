"""IBGE Census 2022 sectors (malha com atributos) for the municipality of São Paulo."""

import geopandas as gpd

from ..common import RAW, SAMPLES, download, write_meta

URL = (
    "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/"
    "malha_com_atributos/setores/gpkg/UF/SP/SP_setores_CD2022.gpkg"
)
SP_CITY = "3550308"


def main() -> None:
    path = download(URL, RAW / "ibge" / "SP_setores_CD2022.gpkg")
    gdf = gpd.read_file(path)
    city = gdf[gdf["CD_MUN"].astype(str) == SP_CITY]
    SAMPLES.mkdir(exist_ok=True)
    city.head(200).to_file(SAMPLES / "ibge_setores_sp_sample.geojson", driver="GeoJSON")
    write_meta(
        "ibge_setores",
        {
            "source": "IBGE Censo Demográfico 2022 - Agregados por Setores Censitários (malha com atributos)",
            "url": URL,
            "crs": str(gdf.crs),
            "columns": list(gdf.columns),
            "features_uf_sp": len(gdf),
            "features_municipality_sao_paulo": len(city),
            "null_counts_city": {c: int(city[c].isna().sum()) for c in city.columns if c != "geometry"},
            "geometry_types": sorted(city.geom_type.unique().tolist()),
        },
    )
    print(f"SP UF: {len(gdf)} sectors; São Paulo municipality: {len(city)}; crs={gdf.crs}")
    print(list(gdf.columns))


if __name__ == "__main__":
    main()
