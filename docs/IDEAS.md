# Ideas

Backlog of ideas for UFABC Urbana. Nothing here is committed to; each item needs its data or method verified first (see `AGENTS.md`).

## Product

- **Historical view.** A year slider (1985–2025) using MapBiomas land cover to show how urbanization and green cover changed in a district or around a street. Landsat can also give older temperature and NDVI composites. Needs a consistent method across years.
- **"Why?" explanations.** Plain-language cards that explain heat islands, evapotranspiration, albedo and shade, each linked to the literature we verified (the four papers in `tmp/general-plan.md` still have to be read and their claims recorded).
- **Compare two places.** Pick two streets or neighborhoods and compare temperature, vegetation and density side by side.
- **Shareable links.** Put the selected place, layer and zoom in the URL so a street can be shared.
- **Neighborhood layer.** IBGE *bairros* as another aggregation level between street and district.
- **"What if?" scenarios.** Only after a defensible model exists. Until then, at most a clearly labelled conceptual illustration, never an invented temperature drop.
- **Model limitations page.** What the platform can and cannot conclude.

## Immersive experience

- **3D buildings.** Extrude building footprints (OpenStreetMap or GeoSampa) with the heat layer draped on them, and tilt the camera by default after a search.
- **Guided tour.** A short scroll or step-by-step intro that flies between a hot dense area and a green one.
- **Mobile-first layout.** Bottom sheet for the place card and larger touch targets.

## Data and science

- **Air temperature and nights.** Satellite surface temperature is daytime only. Look at nighttime sources and the INMET stations (Mirante de Santana, Interlagos) for air temperature and trends.
- **Heat-wave composite.** Add a layer for the hottest days instead of a four-month median.
- **Justify the NDVI threshold.** The 0.5 cut-off is a placeholder; take it from the literature or drop it.
- **Validate vegetation.** Compare Landsat NDVI with the GeoSampa vegetation cover (surveyed in 2017) and MapBiomas Urban Vegetation, if we get access.
- **Expand to the RMSP.** Reuse the pipeline for the Metropolitan Region once the municipality version is solid.
- **License and attribution review** for every source before any public launch.
- **More factors.** Slope, distance to water, building height or density, so we do not attribute everything to vegetation.

## Engineering

- **Geocoder hosting.** The public Photon instance is for light use; self-host it or use a paid geocoder (better Brazilian address coverage) before real traffic.
- **Asset size.** Shrink the raster PNGs (palette quantization, tiles) and lazy-load the lookup image.
- **Favicon and metadata.** Add an app icon and social preview image.
- **Accessibility.** Keyboard map interaction, color-blind-safe ramps, screen-reader summary of the selected place.
- **Reproducible pipeline.** One command that runs the whole data pipeline and records provenance.
- **Deploy.** Static hosting for `apps/web` (for example Vercel) with the data files in `public/`.
