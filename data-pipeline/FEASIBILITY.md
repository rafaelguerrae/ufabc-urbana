# Data feasibility (UFABC Urbana)

Scope: municipality of São Paulo. Status as of 2026-10-25. Earth Engine (GEE) access works with a free non-commercial project.

Reproduce: `uv run python -m src.sources.{ibge,geosampa,inmet,gee}` (`gee` needs `earthengine authenticate` and the IBGE download). Provenance records are in `samples/*.meta.json`.

| Variable | Source | Status | Unit / resolution | Coverage | Key findings |
|---|---|---|---|---|---|
| Population, households | IBGE Census 2022 sectors (gpkg, `malha_com_atributos`) | Verified | Census sector polygons, EPSG:4674; `v0001` = residents, `v0002` = households | 27,301 sectors in the municipality (CD_MUN 3550308) | `v0001`/`v0002` match GeoSampa `qt_populacao`/`qt_domicilio` on all sampled matching sectors. Column meaning is inferred from that match; confirm against the IBGE data dictionary. |
| Population density | GeoSampa WFS `geoportal:densidade_demografica` | Verified | inhabitants/ha (`qt_habitante_hectare`), sector polygons, EPSG:31983 | Census 2022, 27,301 features | Same sectors as IBGE, so IBGE and GeoSampa can be joined on the sector code. |
| Vegetation cover | GeoSampa WFS `geoportal:cobertura_vegetal` | Verified, with a date caveat | Polygons with categories (high/medium tree cover, low tree cover, herbaceous-shrub, floating aquatic), EPSG:31983 | 272,117 polygons; catalog title says 2020 but sampled `tx_data_voo` is **2017** | Check the survey year across the full layer before labelling it. Useful for a vegetation fraction per sector. |
| Street trees | GeoSampa WFS `geoportal:arvore` | Listed, not sampled | Points | 652,976 features | Optional. |
| Air temperature | INMET hourly historical zips + station API | Verified, with a coverage limit | Hourly °C at stations (2023 file: 8,760 rows each) | Only 2 operating automatic stations in the city: A701 Mirante de Santana (since 2006), A771 Interlagos (since 2018); A755 Barueri is nearby but outside the municipality | 2023 missing hourly temperature: A701 212, A771 170, A755 401. Station data cannot give a neighborhood-level map; use it for time trends and validation only. |
| Land-surface temperature | Landsat 8/9 Collection 2 Level 2 (`ST_B10`) via GEE | Verified (prototype) | °C derived from `ST_B10 * 0.00341802 + 149.0` K, 30 m grid (native thermal 100 m, resampled) | 26 scenes in Dec 2023-Mar 2024 over the municipality; daytime only (~10:30 local) | Median of cloud-masked scenes, mean per district: 30.9 °C (Marsilac) to 45.4 °C (Cambuci). This is **surface** temperature, not air temperature, and a 4-month median of few scenes, not a heat wave. GeoSampa only has 1999 LST layers. |
| Vegetation index (NDVI) | Landsat 8/9 Collection 2 Level 2 (`SR_B4`, `SR_B5`) via GEE | Verified (prototype) | Unitless -1..1, 30 m; also share of pixels with NDVI >= 0.5 | Same 26 scenes (Dec 2023-Mar 2024) | Mean NDVI per district ranges 0.16 (Brás) to 0.84 (Marsilac). Unlike MapBiomas, it separates dense urban districts (0.16-0.29 where urban share is 100%). The 0.5 threshold is a heuristic and needs a literature justification. NDVI measures greenness, not tree canopy; grass, crops and wet soil also raise it. |
| Land cover | MapBiomas Collection 11 coverage v3 via GEE | Verified | Class ids, EPSG:4326, ~30 m (0.000269°) | 1985-2025 (41 annual bands) | Class 24 = urban area. Dense urban fabric is classified urban even with street trees: 25% of districts have 0% woody cover and about 100% urban, so it cannot show intra-urban vegetation. |
| Urban vegetation | MapBiomas Urban Vegetation | Not accessible | — | — | Asset folder `.../brazil/urban` returns a permission error for our project; not located elsewhere yet. Collection 10.1 lists urban heat island intensity/classification assets, but they cannot be read either. |

## First prototype result (district level)

`samples/gee_district_prototype.csv`: 96 IBGE districts, MapBiomas 2024 urban and woody share plus summer Landsat LST. Spearman correlation of LST with urban share is +0.75 and with woody share -0.72 (n = 96). Coolest districts are Marsilac and Parelheiros, hottest are dense central/east districts, which is plausible. With NDVI added (`ndvi`, `ndvi_high_share` columns), mean NDVI correlates with LST at -0.87 and NDVI >= 0.5 share at -0.84, stronger than the MapBiomas shares, and it varies where MapBiomas is saturated at 100% urban. This is an association between aggregated units; it does not show that vegetation causes the difference, and woody share and urban share are strongly anti-correlated (-0.90) so their effects cannot be separated here.

## Access notes

- INMET rejects requests without a browser-like User-Agent (connection reset); the pipeline sets one in `src/common.py`. The 2023 zip is about 107 MB.
- IBGE state gpkg is about 182 MB; both large downloads go to the git-ignored `raw/`.
- GeoSampa WFS is plain HTTP and returns GeoJSON in EPSG:31983.
- Licenses and attribution requirements are **not yet reviewed** for any source.

## Open decisions

1. Map unit: census sectors (27,301) are available in both IBGE and GeoSampa and align with population and vegetation. Likely too many for a smooth choropleth; the 96 IBGE districts (`CD_DIST`/`NM_DIST`) are the chosen first-release unit and are what the GEE prototype uses.
2. Temperature layer: Landsat LST is feasible. Still to decide: which period/season, how many scenes, and whether to also derive a heat-wave composite.
3. Intra-urban vegetation: use Landsat NDVI (prototyped). GeoSampa vegetation (sampled survey year 2017) could validate it; the NDVI threshold and aggregation still need a justified method.
