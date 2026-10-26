"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { setWorkerUrl } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Map, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre";

import type { SearchResult } from "../lib/geocode";
import { colorAt, getIndicator, type DistrictProperties, type IndicatorKey, type ViewMode } from "../lib/indicators";
import { loadRaster, type RasterData } from "../lib/raster";
import { ControlPanel } from "./ControlPanel";
import { PlaceCard, type Place } from "./PlaceCard";
import styles from "./MapView.module.css";

// Worker file is copied into /public by scripts/copy-maplibre-worker.mjs.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type DistrictCollection = FeatureCollection<Polygon | MultiPolygon, DistrictProperties>;

const BASEMAP = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const INITIAL_VIEW = { longitude: -46.63, latitude: -23.68, zoom: 9.6, pitch: 0, bearing: 0 };

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const [districts, setDistricts] = useState<DistrictCollection | null>(null);
  const [raster, setRaster] = useState<RasterData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("lst_c");
  const [districtIndicator, setDistrictIndicator] = useState<IndicatorKey>("lst_c");
  const [place, setPlace] = useState<Place | null>(null);
  const [beforeId, setBeforeId] = useState<string | undefined>();

  useEffect(() => {
    fetch("/data/districts.geojson")
      .then((r) => (r.ok ? (r.json() as Promise<DistrictCollection>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setDistricts)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Falha ao carregar os dados dos distritos"));
    loadRaster()
      .then(setRaster)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Falha ao carregar a grade de temperatura"));
  }, []);

  const districtIndicatorDef = getIndicator(districtIndicator);

  const districtRange = useMemo(() => {
    if (!districts) return { min: 0, max: 1 };
    const values = districts.features.map((f) => f.properties[districtIndicator]);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [districts, districtIndicator]);

  const fillColor = useMemo(() => {
    const { min, max } = districtRange;
    const span = max - min || 1;
    const stops = [0, 0.25, 0.5, 0.75, 1].flatMap((t) => [
      min + t * span,
      `rgb(${colorAt(districtIndicatorDef, t).join(",")})`,
    ]);
    return ["interpolate", ["linear"], ["get", districtIndicator], ...stops] as unknown as string;
  }, [districtRange, districtIndicatorDef, districtIndicator]);

  const choosePlace = useCallback(
    (lng: number, lat: number, label: string) => {
      const pt = point([lng, lat]);
      const district = districts?.features.find((f: Feature<Polygon | MultiPolygon, DistrictProperties>) =>
        booleanPointInPolygon(pt, f),
      );
      setPlace({
        lng,
        lat,
        label,
        sample: raster?.sample(lng, lat) ?? null,
        district: district?.properties ?? null,
      });
    },
    [districts, raster],
  );

  const onSearchSelect = useCallback(
    (r: SearchResult) => {
      choosePlace(r.lng, r.lat, r.detail ? `${r.label} · ${r.detail}` : r.label);
      mapRef.current?.flyTo({ center: [r.lng, r.lat], zoom: 15.5, pitch: 45, duration: 2500, essential: true });
    },
    [choosePlace],
  );

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    // Draw data below roads, water and labels so streets stay readable.
    setBeforeId(map.getStyle().layers.find((l) => l.type === "line" || l.type === "symbol")?.id);
    // Let the heat layer show through building footprints.
    for (const id of ["building", "building-top"]) {
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-opacity", 0.3);
    }
  }, []);

  const bounds = raster?.info.bounds;

  return (
    <div className={styles.root}>
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        mapStyle={BASEMAP}
        onLoad={onLoad}
        onClick={(e) => choosePlace(e.lngLat.lng, e.lngLat.lat, "Ponto selecionado")}
        cursor="crosshair"
        maxPitch={70}
        attributionControl={{ compact: true }}
      >
        <NavigationControl position="top-right" visualizePitch />

        {view !== "districts" && raster && bounds && (
          <Source
            key={view}
            id="heat"
            type="image"
            url={`/data/raster/${view === "lst_c" ? "lst" : "ndvi"}.png`}
            coordinates={[
              [bounds.west, bounds.north],
              [bounds.east, bounds.north],
              [bounds.east, bounds.south],
              [bounds.west, bounds.south],
            ]}
          >
            <Layer
              id="heat-layer"
              type="raster"
              beforeId={beforeId}
              paint={{ "raster-opacity": 0.78, "raster-resampling": "linear", "raster-fade-duration": 300 }}
            />
          </Source>
        )}

        {view === "districts" && districts && (
          <Source id="districts" type="geojson" data={districts}>
            <Layer
              id="districts-fill"
              type="fill"
              beforeId={beforeId}
              paint={{ "fill-color": fillColor, "fill-opacity": 0.78 }}
            />
            <Layer
              id="districts-line"
              type="line"
              paint={{ "line-color": "#ffffff", "line-width": 1, "line-opacity": 0.8 }}
            />
            <Layer
              id="districts-selected"
              type="line"
              filter={["==", ["get", "code"], place?.district?.code ?? ""]}
              paint={{ "line-color": "#111111", "line-width": 3 }}
            />
          </Source>
        )}

        {place && (
          <Marker longitude={place.lng} latitude={place.lat} anchor="center">
            <div className={styles.pin} aria-hidden />
          </Marker>
        )}
      </Map>

      <ControlPanel
        view={view}
        onViewChange={setView}
        districtIndicator={districtIndicator}
        onDistrictIndicatorChange={setDistrictIndicator}
        districtRange={districtRange}
        raster={raster?.info ?? null}
        loading={!loadError && (!districts || !raster)}
        error={loadError}
        onSearchSelect={onSearchSelect}
      />
      {place && <PlaceCard place={place} raster={raster?.info ?? null} onClose={() => setPlace(null)} />}
    </div>
  );
}
