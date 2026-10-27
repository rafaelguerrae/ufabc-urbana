"""Study-area registry: municipalities and the IBGE census unit used as the map unit in each."""

from dataclasses import dataclass

import geopandas as gpd

from .common import RAW

SECTORS = RAW / "ibge" / "SP_setores_CD2022.gpkg"
NO_UNIT_NAME = "Área sem bairro (sem moradores)"


@dataclass(frozen=True)
class City:
    slug: str
    code: str  # IBGE municipality code (CD_MUN)
    name: str
    unit: str  # "distrito" or "bairro"
    unit_code: str  # sector column holding the unit code
    unit_name: str  # sector column holding the unit name
    expected_units: int  # real units, excluding the "no bairro" remainder
    has_remainder: bool = False


# São Paulo keeps IBGE districts (96). IBGE districts are too coarse for the ABC
# municipalities (2 and 3 units), so they use bairros (CD_BAIRRO), filled only there.
CITIES = [
    City("sao-paulo", "3550308", "São Paulo", "distrito", "CD_DIST", "NM_DIST", 96),
    City("sao-bernardo-do-campo", "3548708", "São Bernardo do Campo", "bairro", "CD_BAIRRO", "NM_BAIRRO", 34, True),
    City("santo-andre", "3547809", "Santo André", "bairro", "CD_BAIRRO", "NM_BAIRRO", 113, True),
]


def read_sectors(city: City, geometry: bool = True) -> gpd.GeoDataFrame:
    """Census sectors of one municipality with normalised `code` / `name` unit columns.

    Sectors IBGE left without a bairro (code ".", no residents) are grouped into one
    remainder unit per city so the whole municipality stays covered.
    """
    sectors = gpd.read_file(SECTORS, ignore_geometry=not geometry)
    sectors = sectors[sectors["CD_MUN"].astype(str) == city.code].copy()
    sectors["code"] = sectors[city.unit_code].astype(str)
    sectors["name"] = sectors[city.unit_name]
    if city.has_remainder:
        none = sectors["code"] == "."
        sectors.loc[none, "code"] = f"{city.code}_sem_bairro"
        sectors.loc[none, "name"] = NO_UNIT_NAME
    return sectors
