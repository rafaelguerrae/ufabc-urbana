# data-pipeline

Python scripts that sample public datasets and prepare static files for `apps/web`. Part of UFABC Urbana.

## Setup

```sh
cd data-pipeline
uv sync
```

## Layout

- `src/sources/` — one module per data source (MapBiomas, Landsat/GeoSampa, INMET, IBGE).
- `samples/` — small committed samples and metadata records.
- `raw/` — large downloads (git-ignored).
- `FEASIBILITY.md` — verified feasibility matrix (source, resolution, CRS, units, coverage, license).

Each source module records provenance (product, version, period, units, license) next to the data it produces.

## Commands

```sh
uv sync
uv run python -m src.sources.ibge      # IBGE Census 2022 sectors (about 182 MB download)
uv run python -m src.sources.geosampa  # GeoSampa density and vegetation samples
uv run python -m src.sources.inmet     # INMET stations and 2023 hourly data (about 107 MB download)
uv run python -m src.sources.gee       # needs: uv run earthengine authenticate (free non-commercial project)
uv run python -m src.export_web      # districts.geojson for apps/web (needs the IBGE download and the gee sample)
uv run python -m src.export_raster   # 30 m LST/NDVI overlays and lookup image for apps/web (needs GEE)
```
