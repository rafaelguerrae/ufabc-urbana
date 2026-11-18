"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import pointOnFeature from "@turf/point-on-feature";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { setWorkerUrl } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Map, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre";

import { CAMPUSES } from "#lib/campuses";
import { unitTitle } from "#lib/cities";
import { reversePlace, type SearchResult } from "#lib/geocode";
import { colorAt, getIndicator, VIEWS, type DistrictProperties, type ViewMode } from "#lib/indicators";
import { loadRaster, type RasterData } from "#lib/raster";
import { buildTour } from "#lib/tour";
import { useHotkeys } from "#lib/use-hotkeys";
import { useSimulation } from "#lib/use-simulation";
import { useUserLocation } from "#lib/use-user-location";
import { ControlPanel } from "#components/panels/control-panel";
import { formatCoords, PIN_LABEL, type Place } from "#components/cards/place-card";
import { LESSONS, pickExamples, pickTargets, type MapTarget } from "#lib/learn";
import type { ComparePin, PinId } from "#components/cards/compare-card";
import { LearnPanel, type CompareState } from "#components/panels/learn-panel";
import { PlacePanel } from "#components/panels/place-panel";
import { SimulationPanel } from "#components/panels/simulation-panel";
import { TopBar } from "#components/controls/top-bar";
import { TourCard } from "#components/cards/tour-card";
import { ViewSwitch } from "#components/controls/view-switch";

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
// Floating bottom buttons ride on top of the open sheet (--sheet-height is set by SheetPanel).
const SHEET_BOTTOM = "calc(var(--sheet-height,0px)+24px),calc(100dvh-56px-env(safe-area-inset-top,0px))";
// Map buttons: laid out by the TopBar, in its right group, so the buttons that expand there push them aside. On mobile they
// are fixed to the bottom right and hide while a bottom sheet is open (flagged on <html> by SheetPanel).
const MAP_BUTTON = `relative inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-button shadow-panel [transition:background-color_0.18s_ease,scale_0.18s_cubic-bezier(0.3,0.7,0.4,1.4)] hover:bg-hover active:scale-[0.94] motion-reduce:[transition:none] mobile:fixed mobile:right-3 mobile:z-8 sheet-open:mobile:hidden ${FOCUS_RING}`;
const RESET_BUTTON = `${MAP_BUTTON} text-foreground mobile:bottom-[min(calc(var(--sheet-height,0px)+76px),calc(100dvh-108px-env(safe-area-inset-top,0px)))]`;
const LOCATE_BUTTON = `${MAP_BUTTON} mobile:bottom-[min(${SHEET_BOTTOM})] disabled:cursor-progress disabled:opacity-60`;
// "Ver detalhes": mobile only, on the same line as the reset button. On desktop the panel opens directly.
const DETAILS_BUTTON = `hidden cursor-pointer items-center rounded-xl border-0 bg-accent px-[18px] text-[0.9rem] font-semibold text-accent-contrast shadow-panel transition-[scale] duration-[180ms] ease-[cubic-bezier(0.3,0.7,0.4,1.4)] mobile:absolute mobile:bottom-[min(${SHEET_BOTTOM})] mobile:left-3 mobile:z-8 mobile:inline-flex mobile:h-11 mobile:active:scale-[0.96] ${FOCUS_RING}`;

// Worker file is copied into /public by scripts/copy-maplibre-worker.mjs.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type DistrictCollection = FeatureCollection<Polygon | MultiPolygon, DistrictProperties>;
type BuildingCollection = FeatureCollection<Polygon, { height_m: number; height_source: "height" | "levels"; lst_c: number | null }>;

const BASEMAP = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const MOBILE_QUERY = "(max-width: 700px)";
const INITIAL_VIEW = { longitude: -46.55, latitude: -23.68, zoom: 9.8, pitch: 0, bearing: 0 };

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [districts, setDistricts] = useState<DistrictCollection | null>(null);
  const [raster, setRaster] = useState<RasterData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("lst_c");
  const [place, setPlace] = useState<Place | null>(null);
  const [beforeId, setBeforeId] = useState<string | undefined>();
  // One panel at a time in the left slot, under the search bar: the layers or the details of the clicked point.
  const [leftPanel, setLeftPanel] = useState<"layers" | "place" | null>(null);
  const [learnOpen, setLearnOpen] = useState(false);
  const [learnStep, setLearnStep] = useState(0);
  // Map state to restore when the learning path is closed.
  const beforeLearn = useRef<{ view: ViewMode; place: Place | null } | null>(null);
  const [compare, setCompare] = useState<CompareState | null>(null);
  const [cameraDefault, setCameraDefault] = useState(true);
  const { position: userPosition, status: locationStatus, start: startLocation } = useUserLocation();
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const [buildings3d, setBuildings3d] = useState(false);
  const [buildings, setBuildings] = useState<BuildingCollection | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const simulation = useSimulation({ mapRef, raster, beforeId, mapReady });
  const closeSim = simulation.closeTool;
  const leftOpen = leftPanel === "layers";
  // The learning path shows the place itself, so the details panel steps aside while it is open.
  const placeOpen = leftPanel === "place" && !!place && !learnOpen;

  // On small screens the panels are bottom sheets, so only one can be open.
  const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;
  const toggleLeft = () => {
    if (!leftOpen && isMobile()) {
      closeLearn();
      closeSim();
    }
    setLeftPanel(leftOpen ? null : "layers");
  };
  // The brush takes the right slot (a bottom sheet on mobile) and works on the heat layer only. Closing it
  // keeps what was painted; it comes back when the tool is reopened.
  const toggleSim = () => {
    if (simulation.open) return closeSim();
    if (tourIndex !== null || !simulation.available) return;
    closeLearn();
    if (isMobile()) setLeftPanel(null);
    setView("lst_c");
    simulation.openTool();
  };
  // Any other layer closes the brush, since the simulation only exists on the heat layer.
  const changeView = (v: ViewMode) => {
    if (v !== "lst_c") closeSim();
    setView(v);
  };

  // On desktop the learning path takes the right slot from the brush; on mobile it is a bottom sheet like the others.
  const openLearn = () => {
    if (learnOpen) return closeLearn();
    beforeLearn.current = { view, place };
    closeSim();
    if (isMobile()) setLeftPanel(null);
    setLearnOpen(true);
  };
  function closeLearn() {
    if (!learnOpen) return;
    setLearnOpen(false);
    if (beforeLearn.current) {
      setView(beforeLearn.current.view);
      setPlace(beforeLearn.current.place);
      beforeLearn.current = null;
    }
    setCompare(null);
  }

  useEffect(() => {
    fetch("/data/districts.geojson")
      .then((r) => (r.ok ? (r.json() as Promise<DistrictCollection>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setDistricts)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Falha ao carregar os dados dos distritos e bairros"));
    loadRaster()
      .then(setRaster)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Falha ao carregar a grade de temperatura"));
  }, []);

  // 3D buildings start on for desktop and off for mobile, where extrusions are heavier to draw.
  useEffect(() => {
    if (!window.matchMedia(MOBILE_QUERY).matches) setBuildings3d(true);
  }, []);

  // The footprints file is only fetched the first time the layer is switched on.
  useEffect(() => {
    if (!buildings3d || buildings) return;
    fetch("/data/buildings.geojson")
      .then((r) => (r.ok ? (r.json() as Promise<BuildingCollection>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setBuildings)
      .catch(() => setBuildings3d(false));
  }, [buildings3d, buildings]);

  const districtList = useMemo(() => districts?.features.map((f) => f.properties) ?? null, [districts]);

  const tourSteps = useMemo(() => buildTour(districts?.features ?? null), [districts]);
  const tourFocus = tourIndex !== null ? tourSteps?.[tourIndex]?.focus : undefined;

  const startTour = useCallback(() => {
    closeSim();
    setPlace(null);
    setLearnOpen(false);
    setLeftPanel(null);
    setView("lst_c");
    setTourIndex(0);
  }, [closeSim]);

  // Each step flies the camera: to its district, or back to the initial view.
  useEffect(() => {
    if (tourIndex === null || !tourSteps) return;
    const map = mapRef.current;
    if (!map) return;
    const focus = tourSteps[tourIndex]?.focus;
    // essential is false so the move is skipped for people who prefer reduced motion.
    if (focus) {
      const padding = isMobile() ? { top: 120, bottom: 300, left: 24, right: 24 } : { top: 100, bottom: 260, left: 60, right: 60 };
      map.fitBounds(focus.bounds, { padding, duration: 2500, maxZoom: 13, essential: false });
    } else {
      map.flyTo({
        center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
        zoom: INITIAL_VIEW.zoom,
        duration: 2000,
        essential: false,
      });
    }
  }, [tourIndex, tourSteps]);

  // Real targets for the guided tasks: a point inside the hottest and the greenest unit of each city.
  const learnTargets = useMemo(() => {
    if (!districts) return {};
    const all = pickExamples(districtList ?? []).flatMap<MapTarget>((ex) => {
      const feature = districts.features.find((f) => f.properties.code === ex.unit.code && f.properties.city === ex.city);
      if (!feature) return [];
      const [lng, lat] = pointOnFeature(feature).geometry.coordinates as [number, number];
      return [{ ...ex, lng, lat }];
    });
    return pickTargets(all);
  }, [districts, districtList]);

  // Building color: ground temperature under the footprint on the same scale as the heat layer.
  const buildingColor = useMemo(() => {
    if (!raster) return "#9ca3af";
    const [min, max] = raster.info.lst.scale;
    const lst = getIndicator("lst_c");
    const stops = [0, 0.25, 0.5, 0.75, 1].flatMap((t) => [
      min + t * (max - min),
      `rgb(${colorAt(lst, t).join(",")})`,
    ]);
    return ["case", ["==", ["get", "lst_c"], null], "#9ca3af", ["interpolate", ["linear"], ["get", "lst_c"], ...stops]] as unknown as string;
  }, [raster]);

  // Satellite sample and district/bairro under a point.
  const locate = useCallback(
    (lng: number, lat: number): ComparePin => {
      const pt = point([lng, lat]);
      const district = districts?.features.find((f: Feature<Polygon | MultiPolygon, DistrictProperties>) =>
        booleanPointInPolygon(pt, f),
      );
      return { lng, lat, sample: raster?.sample(lng, lat) ?? null, district: district?.properties ?? null };
    },
    [districts, raster],
  );

  const choosePlace = useCallback(
    (lng: number, lat: number, label: string) => {
      // On mobile the details open on demand ("Ver detalhes"), so the selected point stays visible on the map;
      // an already open sheet just updates. While the learning path is open it shows the place itself.
      closeSim();
      if (window.matchMedia(MOBILE_QUERY).matches) setLeftPanel((p) => (p === "place" ? p : null));
      else if (!learnOpen) setLeftPanel("place");
      setPlace({ ...locate(lng, lat), label });
    },
    [locate, learnOpen, closeSim],
  );

  // A clicked point has no name, so look its address up (skipped in the learning path, which shows the point itself).
  // Without an address the search field shows the coordinates, like a dropped pin in Google Maps.
  const pinToLookUp = place && place.label === PIN_LABEL && place.address === undefined && !learnOpen ? place : null;
  const pinLng = pinToLookUp?.lng;
  const pinLat = pinToLookUp?.lat;
  useEffect(() => {
    if (pinLng === undefined || pinLat === undefined) return;
    const controller = new AbortController();
    reversePlace(pinLng, pinLat, controller.signal)
      .then((address) => ({ address }))
      .catch((e: unknown) => (e instanceof DOMException && e.name === "AbortError" ? null : { address: null }))
      .then((found) => {
        if (!found) return;
        setPlace((p) => (p && p.lng === pinLng && p.lat === pinLat && p.address === undefined ? { ...p, address: found.address } : p));
      });
    return () => controller.abort();
  }, [pinLng, pinLat]);
  const searchText = place ? (place.address ?? (place.label === PIN_LABEL ? formatCoords(place.lat, place.lng) : place.label)) : null;
  const clearPlace = () => {
    setLeftPanel((p) => (p === "place" ? null : p));
    setPlace(null);
  };

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

  const lesson = LESSONS[learnStep]!;
  const task = lesson.task;
  const target = task.type === "click" ? (learnTargets[task.target] ?? null) : null;

  // Entering a step shows its layer and clears the previous pick, so a task is only done by an action in that step.
  useEffect(() => {
    if (!learnOpen) return;
    const l = LESSONS[learnStep]!;
    if (l.view) setView(l.view);
    if (l.task.type === "click" || l.task.type === "free") setPlace(null);
  }, [learnOpen, learnStep]);

  // The compare step starts with A on the hottest and B on the greenest unit; leaving the step removes the pins.
  const { hot, green } = learnTargets;
  const compareReady = learnOpen && task.type === "compare" && !!hot && !!green;
  useEffect(() => {
    if (!compareReady) {
      setCompare(null);
      return;
    }
    setCompare((c) => c ?? { a: locate(hot!.lng, hot!.lat), b: locate(green!.lng, green!.lat), active: "a", moved: false });
  }, [compareReady, hot, green, locate]);

  const movePin = useCallback(
    (lng: number, lat: number) => setCompare((c) => (c ? { ...c, [c.active]: locate(lng, lat), moved: true } : c)),
    [locate],
  );

  const taskDone =
    task.type === "read" ||
    (task.type === "click" && !!target && place?.district?.code === target.unit.code && place.district.city === target.city) ||
    (task.type === "free" && !!place) ||
    (task.type === "compare" && !!compare?.moved);

  // "Mostrar para mim": does the step on the user's behalf.
  const showMe =
    task.type === "click" && target
      ? () => focusPlace(target.lng, target.lat, unitTitle(target.unit))
      : task.type === "compare" && compare
        ? () => {
            const c = mapRef.current?.getCenter();
            if (c) movePin(c.lng, c.lat);
          }
        : undefined;

  // First click asks the browser for permission; once granted the dot follows the user and clicks fly to it.
  const onLocateClick = useCallback(() => {
    const go = (p: { lng: number; lat: number }) => focusPlace(p.lng, p.lat, "Minha localização");
    if (userPosition) go(userPosition);
    else startLocation(go);
  }, [focusPlace, userPosition, startLocation]);

  useEffect(() => {
    if (locationStatus !== "denied" && locationStatus !== "unavailable") return;
    setLocationNote(
      locationStatus === "denied"
        ? "Não foi possível acessar sua localização. Ative a permissão nas configurações do navegador."
        : "Não foi possível descobrir sua localização agora. Tente de novo em instantes.",
    );
    const timer = window.setTimeout(() => setLocationNote(null), 6000);
    return () => window.clearTimeout(timer);
  }, [locationStatus]);

  // Back to what a freshly loaded page shows: initial camera, heat layer, nothing selected, panels closed.
  const resetMap = useCallback(() => {
    setPlace(null);
    setLeftPanel(null);
    setView("lst_c");
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

  // Esc closes only the top-most thing: tour, learning path, brush (then its panel), the place details (which also
  // clears the place), the other panels, then the selected place.
  const closeTopmost = () => {
    if (tourIndex !== null) setTourIndex(null);
    else if (learnOpen) closeLearn();
    else if (simulation.open && simulation.brush) simulation.setBrush(null);
    else if (simulation.open) closeSim();
    else if (placeOpen) {
      setLeftPanel(null);
      setPlace(null);
    } else if (leftOpen) setLeftPanel(null);
    else if (place) setPlace(null);
  };

  useHotkeys([
    { key: "p", ctrl: true, allowInInput: true, handler: () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    } },
    { key: "Escape", handler: closeTopmost },
    { key: "s", handler: toggleLeft },
    { key: "l", handler: openLearn },
    { key: "v", handler: toggleSim },
    { key: "e", handler: () => simulation.open && simulation.setBrush(simulation.brush === "erase" ? "paint" : "erase") },
    { key: "-", handler: () => simulation.open && simulation.stepRadius(-1) },
    { key: "=", handler: () => simulation.open && simulation.stepRadius(1) },
    { key: "+", handler: () => simulation.open && simulation.stepRadius(1) },
    { key: "z", ctrl: true, handler: (e) => simulation.open && (e.shiftKey ? simulation.redo() : simulation.undo()) },
    { key: "y", ctrl: true, handler: () => simulation.open && simulation.redo() },
    ...VIEWS.map((v, i) => ({ key: String(i + 1), handler: () => tourIndex === null && changeView(v) })),
    { key: "b", handler: () => view === "lst_c" && setBuildings3d((on) => !on) },
    { key: "r", handler: () => tourIndex === null && resetMap() },
    { key: "m", handler: () => tourIndex === null && locationStatus !== "asking" && onLocateClick() },
  ]);

  const isDefault =
    cameraDefault && !place && leftPanel === null && !learnOpen && view === "lst_c";

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    // Draw data below roads, water and labels so streets stay readable.
    setBeforeId(map.getStyle().layers.find((l) => l.type === "line" || l.type === "symbol")?.id);
    setMapReady(true);
    // Let the heat layer show through building footprints.
    for (const id of ["building", "building-top"]) {
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-opacity", 0.3);
    }
  }, []);

  return (
    <div
      className={[
        "relative h-dvh w-screen overflow-hidden mobile:[&_.maplibregl-ctrl-bottom-right]:hidden",
        // Keep the zoom controls clear of the right panel.
        (learnOpen || simulation.open) && "[&_.maplibregl-ctrl-bottom-right]:right-[432px]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        mapStyle={BASEMAP}
        onLoad={onLoad}
        onMoveEnd={onMoveEnd}
        {...simulation.handlers}
        onClick={(e) => {
          // Painting must not also pick a place, and the brush panel owns the right slot.
          if (tourIndex !== null || simulation.open) return;
          if (learnOpen && task.type === "compare") movePin(e.lngLat.lng, e.lngLat.lat);
          else choosePlace(e.lngLat.lng, e.lngLat.lat, PIN_LABEL);
        }}
        // Left unset, MapLibre shows an open hand (a closed one while dragging); only the brush needs a crosshair.
        cursor={simulation.open && simulation.brush ? "crosshair" : undefined}
        maxPitch={70}
        attributionControl={{ compact: true }}
      >
        <NavigationControl position="bottom-right" visualizePitch />

        {raster?.cities.map(({ slug, info }) => {
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
                layout={{ visibility: simulation.overlayActive ? "none" : "visible" }}
                paint={{ "raster-opacity": 0.78, "raster-resampling": "linear", "raster-fade-duration": 300 }}
              />
            </Source>
          );
        })}

        {view === "lst_c" && buildings3d && buildings && !simulation.open && (
          <Source id="buildings" type="geojson" data={buildings}>
            <Layer
              id="buildings-3d"
              type="fill-extrusion"
              minzoom={14}
              paint={{
                "fill-extrusion-color": buildingColor,
                "fill-extrusion-height": ["get", "height_m"],
                "fill-extrusion-opacity": 0.85,
              }}
            />
          </Source>
        )}

        {tourFocus && districts && (
          <Source id="tour-district" type="geojson" data={districts}>
            <Layer
              id="tour-district-line"
              type="line"
              filter={["==", ["get", "code"], tourFocus.code]}
              paint={{ "line-color": "#111111", "line-width": 3 }}
            />
          </Source>
        )}

        {learnOpen && target && !taskDone && districts && (
          <Source id="learn-target" type="geojson" data={districts}>
            <Layer
              id="learn-target-line"
              type="line"
              filter={["all", ["==", ["get", "code"], target.unit.code], ["==", ["get", "city"], target.city]]}
              paint={{ "line-color": "#111111", "line-width": 3 }}
            />
          </Source>
        )}

        {learnOpen && target && !taskDone && (
          <Marker
            longitude={target.lng}
            latitude={target.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              choosePlace(target.lng, target.lat, unitTitle(target.unit));
            }}
          >
            <button type="button" className="relative size-7 cursor-pointer rounded-full border-[3px] border-[#111] bg-white/50 p-0 after:absolute after:-inset-[3px] after:animate-target-pulse after:rounded-full after:border-[3px] after:border-accent after:content-[''] motion-reduce:after:animate-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" aria-label={`Tocar em ${unitTitle(target.unit)}`} />
          </Marker>
        )}

        {learnOpen &&
          compare &&
          (["a", "b"] as const).map((id) => (
            <Marker key={id} longitude={compare[id].lng} latitude={compare[id].lat} anchor="center" style={{ pointerEvents: "none" }}>
              <div
                className={[
                  "flex size-7 items-center justify-center rounded-full border-[3px] border-white text-[0.8rem] font-bold text-white shadow-panel",
                  id === "a" ? "bg-[#b91c1c]" : "bg-[#15803d]",
                  compare.active === id && "outline-3 outline-offset-2 outline-accent",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden
              >
                {id.toUpperCase()}
              </div>
            </Marker>
          ))}

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
            <button type="button" className="group relative size-4 cursor-pointer rounded-full border-[3px] border-white bg-[#22c55e] p-0 shadow-[0_0_0_1px_#15803d,0_2px_8px_rgb(0_0_0/0.4)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#15803d]" aria-label={`Ver dados de ${c.name}`}>
              <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 rounded-lg border border-border bg-surface px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-foreground opacity-0 shadow-[0_2px_8px_rgb(0_0_0/0.25)] transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100">{c.name}</span>
            </button>
          </Marker>
        ))}

        {userPosition && (
          <Marker longitude={userPosition.lng} latitude={userPosition.lat} anchor="center" style={{ pointerEvents: "none" }}>
            <div className="relative size-4 rounded-full border-[3px] border-white bg-[#2563eb] shadow-[0_0_0_1px_#1d4ed8,0_2px_8px_rgb(0_0_0/0.4)] after:absolute after:-inset-[3px] after:animate-user-pulse after:rounded-full after:bg-[#2563eb] after:content-[''] motion-reduce:after:hidden" aria-hidden />
          </Marker>
        )}

        {place && (
          <Marker longitude={place.lng} latitude={place.lat} anchor="center">
            <div className="size-[18px] rounded-full border-[3px] border-white bg-[#111] shadow-[0_0_0_2px_#111,0_2px_8px_rgb(0_0_0/0.4)]" aria-hidden />
          </Marker>
        )}
      </Map>

      {locationNote && (
        <p className="absolute bottom-6 left-1/2 z-9 w-max max-w-[calc(100%-24px)] -translate-x-1/2 rounded-xl border border-border bg-panel px-3.5 py-2.5 text-[0.85rem] text-foreground shadow-panel mobile:bottom-[min(calc(var(--sheet-height,0px)+84px),calc(100dvh-120px-env(safe-area-inset-top,0px)))] sheet-open:mobile:hidden" role="status">
          {locationNote}
        </p>
      )}

      {place && !placeOpen && !learnOpen && !simulation.open && (
        <button
          type="button"
          className={tourIndex !== null ? "hidden" : DETAILS_BUTTON}
          onClick={() => setLeftPanel("place")}
        >
          Ver detalhes
        </button>
      )}

      {tourIndex === null && <ViewSwitch view={view} onChange={changeView} panelOpen={leftPanel !== null || learnOpen || simulation.open} />}

      <TopBar
        searchInputRef={searchInputRef}
        leftOpen={leftOpen}
        onToggleLeft={toggleLeft}
        learnOpen={learnOpen}
        onOpenLearn={openLearn}
        simOpen={simulation.open}
        simAvailable={simulation.available}
        onToggleSim={toggleSim}
        onSearchSelect={onSearchSelect}
        searchText={searchText}
        onSearchClear={clearPlace}
        mapButtons={
          <>
          <button
            type="button"
            className={tourIndex !== null ? "hidden" : RESET_BUTTON}
            onClick={resetMap}
            aria-label="Voltar à visão inicial do mapa"
            aria-keyshortcuts="R"
            title="Voltar à visão inicial (R)"
          >
            {/* Folded map: tinted in the default state, outlined otherwise (a solid fill would hide the fold lines). */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={isDefault ? "currentColor" : "none"}
              fillOpacity={0.25}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              focusable="false"
            >
              <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
              <path d="M15 5.764v15" />
              <path d="M9 3.236v15" />
            </svg>
          </button>

          <button
            type="button"
            className={tourIndex !== null ? "hidden" : `${LOCATE_BUTTON} ${locationStatus === "active" ? "text-[#2563eb]" : "text-foreground"}`}
            onClick={onLocateClick}
            disabled={locationStatus === "asking"}
            aria-label="Ir para a minha localização"
            aria-keyshortcuts="M"
            title="Minha localização (M)"
          >
            {/* Navigation arrow as in Apple Maps: filled blue while the location is being followed. */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={locationStatus === "active" ? "currentColor" : "none"}
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
          </>
        }
      />

      <ControlPanel
          open={leftOpen}
          onClose={() => setLeftPanel(null)}
          view={view}
          onViewChange={changeView}
          buildings3d={buildings3d}
          onBuildings3dChange={setBuildings3d}
          onStartTour={tourSteps ? startTour : undefined}
          raster={raster?.info ?? null}
          scenesLabel={raster?.scenesLabel ?? null}
          loading={!loadError && (!districts || !raster)}
          error={loadError}
        />
        <PlacePanel
          open={placeOpen}
          place={place}
          raster={raster?.info ?? null}
          districts={districtList}
          onClose={clearPlace}
        />
      <SimulationPanel
        open={simulation.open}
        sim={simulation.sim}
        brush={simulation.brush}
        radiusM={simulation.radiusM}
        onBrushChange={simulation.setBrush}
        onRadiusChange={simulation.setRadiusM}
        onUndo={simulation.undo}
        onRedo={simulation.redo}
        onClear={simulation.clear}
        onClose={closeSim}
      />
      {tourIndex !== null && tourSteps && (
        <TourCard steps={tourSteps} index={tourIndex} onIndexChange={setTourIndex} onClose={() => setTourIndex(null)} />
      )}
      <LearnPanel
        open={learnOpen}
        step={learnStep}
        onStepChange={setLearnStep}
        target={target}
        place={place}
        compare={compare}
        onCompareActiveChange={(id: PinId) => setCompare((c) => (c ? { ...c, active: id } : c))}
        raster={raster?.info ?? null}
        done={taskDone}
        onShowMe={showMe}
        onClose={closeLearn}
      />
    </div>
  );
}
