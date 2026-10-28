"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { setWorkerUrl } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Map, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre";

import { CAMPUSES } from "../lib/campuses";
import type { SearchResult } from "../lib/geocode";
import { colorAt, getIndicator, type DistrictProperties, type IndicatorKey, type ViewMode } from "../lib/indicators";
import { loadRaster, type RasterData } from "../lib/raster";
import { ControlPanel } from "./ControlPanel";
import type { Place } from "./PlaceCard";
import { AboutDialog } from "./AboutDialog";
import { LearnDialog } from "./LearnDialog";
import { RightPanel } from "./RightPanel";
import { TopBar } from "./TopBar";
import styles from "./MapView.module.css";

// Worker file is copied into /public by scripts/copy-maplibre-worker.mjs.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type DistrictCollection = FeatureCollection<Polygon | MultiPolygon, DistrictProperties>;

const BASEMAP = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const MOBILE_QUERY = "(max-width: 700px)";
const INITIAL_VIEW = { longitude: -46.55, latitude: -23.68, zoom: 9.8, pitch: 0, bearing: 0 };

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const [districts, setDistricts] = useState<DistrictCollection | null>(null);
  const [raster, setRaster] = useState<RasterData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("lst_c");
  const [districtIndicator, setDistrictIndicator] = useState<IndicatorKey>("lst_c");
  const [place, setPlace] = useState<Place | null>(null);
  const [beforeId, setBeforeId] = useState<string | undefined>();
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [cameraDefault, setCameraDefault] = useState(true);

  // On small screens the panels are bottom sheets, so only one can be open.
  const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;
  const toggleLeft = () => {
    if (!leftOpen && isMobile()) setRightOpen(false);
    setLeftOpen(!leftOpen);
  };
  const toggleRight = () => {
    if (!rightOpen && isMobile()) setLeftOpen(false);
    setRightOpen(!rightOpen);
  };

  useEffect(() => {
    fetch("/data/districts.geojson")
      .then((r) => (r.ok ? (r.json() as Promise<DistrictCollection>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setDistricts)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Falha ao carregar os dados dos distritos e bairros"));
    loadRaster()
      .then(setRaster)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Falha ao carregar a grade de temperatura"));
  }, []);

  const districtList = useMemo(() => districts?.features.map((f) => f.properties) ?? null, [districts]);

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
      // On mobile the details open on demand ("Ver detalhes"), so the selected point stays visible on the map.
      if (window.matchMedia(MOBILE_QUERY).matches) setLeftOpen(false);
      else setRightOpen(true);
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

  // Select a place and fly to it with the same camera move for search results and campus markers.
  const focusPlace = useCallback(
    (lng: number, lat: number, label: string) => {
      choosePlace(lng, lat, label);
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 15.5, pitch: 45, duration: 2500, essential: true });
    },
    [choosePlace],
  );

  const onSearchSelect = useCallback(
    (r: SearchResult) => focusPlace(r.lng, r.lat, r.detail ? `${r.label} · ${r.detail}` : r.label),
    [focusPlace],
  );

  // Back to what a freshly loaded page shows: initial camera, heat layer, nothing selected, panels closed.
  const resetMap = useCallback(() => {
    setPlace(null);
    setLeftOpen(false);
    setRightOpen(false);
    setView("lst_c");
    setDistrictIndicator("lst_c");
    mapRef.current?.flyTo({
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
      pitch: INITIAL_VIEW.pitch,
      bearing: INITIAL_VIEW.bearing,
      duration: 1500,
      essential: true,
    });
  }, []);

  // Updated only when a camera move ends, so panning does not re-render the whole map.
  const onMoveEnd = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const c = map.getCenter();
    setCameraDefault(
      Math.abs(c.lng - INITIAL_VIEW.longitude) < 0.002 &&
        Math.abs(c.lat - INITIAL_VIEW.latitude) < 0.002 &&
        Math.abs(map.getZoom() - INITIAL_VIEW.zoom) < 0.05 &&
        Math.abs(map.getPitch() - INITIAL_VIEW.pitch) < 0.5 &&
        Math.abs(map.getBearing() - INITIAL_VIEW.bearing) < 0.5,
    );
  }, []);

  const isDefault =
    cameraDefault && !place && !leftOpen && !rightOpen && view === "lst_c" && districtIndicator === "lst_c";

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

  return (
    <div className={rightOpen ? `${styles.root} ${styles.rightOpen}` : styles.root}>
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        mapStyle={BASEMAP}
        onLoad={onLoad}
        onMoveEnd={onMoveEnd}
        onClick={(e) => choosePlace(e.lngLat.lng, e.lngLat.lat, "Ponto selecionado")}
        cursor="crosshair"
        maxPitch={70}
        attributionControl={{ compact: true }}
      >
        <NavigationControl position="bottom-right" visualizePitch />

        {view !== "districts" &&
          raster?.cities.map(({ slug, info }) => {
            const b = info.bounds;
            return (
              <Source
                key={`${slug}-${view}`}
                id={`heat-${slug}`}
                type="image"
                url={`/data/raster/${slug}/${view === "lst_c" ? "lst" : "ndvi"}.png`}
                coordinates={[
                  [b.west, b.north],
                  [b.east, b.north],
                  [b.east, b.south],
                  [b.west, b.south],
                ]}
              >
                <Layer
                  id={`heat-layer-${slug}`}
                  type="raster"
                  beforeId={beforeId}
                  paint={{ "raster-opacity": 0.78, "raster-resampling": "linear", "raster-fade-duration": 300 }}
                />
              </Source>
            );
          })}

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

        {CAMPUSES.map((c) => (
          <Marker
            key={c.id}
            longitude={c.lng}
            latitude={c.lat}
            anchor="center"
            onClick={(e) => {
              // Keep the click from also reaching the map, which would select the cursor position instead.
              e.originalEvent.stopPropagation();
              focusPlace(c.lng, c.lat, c.name);
            }}
          >
            <button type="button" className={styles.campus} aria-label={`Ver dados de ${c.name}`}>
              <span className={styles.campusLabel}>{c.name}</span>
            </button>
          </Marker>
        ))}

        {place && (
          <Marker longitude={place.lng} latitude={place.lat} anchor="center">
            <div className={styles.pin} aria-hidden />
          </Marker>
        )}
      </Map>

      <button
        type="button"
        className={styles.reset}
        onClick={resetMap}
        aria-label="Voltar à visão inicial do mapa"
        title="Voltar à visão inicial"
      >
        {/* Navigation arrow as in Apple Maps: filled in the default state, outlined otherwise. */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={isDefault ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          focusable="false"
        >
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
      </button>

      {place && !rightOpen && (
        <button
          type="button"
          className={styles.details}
          onClick={() => {
            setLeftOpen(false);
            setRightOpen(true);
          }}
        >
          Ver detalhes
        </button>
      )}

      <TopBar
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        onToggleLeft={toggleLeft}
        onToggleRight={toggleRight}
        onOpenLearn={() => setLearnOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        onSearchSelect={onSearchSelect}
      />

      <ControlPanel
          open={leftOpen}
          onClose={() => setLeftOpen(false)}
          view={view}
          onViewChange={setView}
          districtIndicator={districtIndicator}
          onDistrictIndicatorChange={setDistrictIndicator}
          districtRange={districtRange}
          raster={raster?.info ?? null}
          scenesLabel={raster?.scenesLabel ?? null}
          loading={!loadError && (!districts || !raster)}
          error={loadError}
        />
        <RightPanel
          open={rightOpen}
          place={place}
          raster={raster?.info ?? null}
          districts={districtList}
          districtIndicator={districtIndicator}
          onClose={() => {
            setRightOpen(false);
            setPlace(null);
          }}
        />
      {learnOpen && <LearnDialog onClose={() => setLearnOpen(false)} />}
      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
    </div>
  );
}
