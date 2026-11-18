"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { MapMouseEvent, MapRef, MapTouchEvent } from "react-map-gl/maplibre";

import type { RasterData } from "./raster";
import { MAX_RADIUS_M, MIN_RADIUS_M, Simulation, type BrushMode } from "./simulation";
import { mountOverlay, type SimulationOverlay } from "./simulation-overlay";

const DEFAULT_RADIUS_M = 200;
const RADIUS_STEP_M = 10;

interface Options {
  mapRef: RefObject<MapRef | null>;
  raster: RasterData | null;
  /** First line or symbol layer of the basemap: the simulated layer is drawn below it. */
  beforeId: string | undefined;
  mapReady: boolean;
}

/**
 * State and map wiring of the vegetation brush. The painted pixels live in a `Simulation` that survives
 * closing the tool (reopening shows them again); the panel reads its numbers through the `sim` store.
 */
export function useSimulation({ mapRef, raster, beforeId, mapReady }: Options) {
  const simRef = useRef<Simulation | null>(null);
  const [sim, setSim] = useState<Simulation | null>(null);
  const [open, setOpen] = useState(false);
  /** Null while the tool is open but the map is being moved instead of painted. */
  const [brush, setBrush] = useState<BrushMode | null>(null);
  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);
  const [overlayActive, setOverlayActive] = useState(false);
  const overlay = useRef<SimulationOverlay | null>(null);
  const drawing = useRef(false);
  const frame = useRef<number | null>(null);
  const pointer = useRef<[number, number] | null>(null);

  // Draw the simulated map while the tool is open.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!open || !sim || !map || !mapReady) return;
    const o = mountOverlay(map, sim, beforeId);
    overlay.current = o;
    setOverlayActive(true);
    return () => {
      o.destroy();
      overlay.current = null;
      setOverlayActive(false);
    };
  }, [open, sim, mapReady, beforeId, mapRef]);

  // While a brush is active, dragging and double-clicking paint instead of moving or zooming the map.
  const painting = open && brush !== null;
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !painting) return;
    map.dragPan.disable();
    map.doubleClickZoom.disable();
    return () => {
      map.dragPan.enable();
      map.doubleClickZoom.enable();
    };
  }, [painting, mapRef]);

  // Redraw and publish the numbers at most once per frame.
  const schedule = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      overlay.current?.flush();
      simRef.current?.commit();
    });
  }, []);
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const endStroke = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    simRef.current?.finishStroke();
    schedule();
  }, [schedule]);

  // A drag that ends outside the map must still end the stroke.
  useEffect(() => {
    window.addEventListener("mouseup", endStroke);
    window.addEventListener("touchend", endStroke);
    window.addEventListener("touchcancel", endStroke);
    return () => {
      window.removeEventListener("mouseup", endStroke);
      window.removeEventListener("touchend", endStroke);
      window.removeEventListener("touchcancel", endStroke);
    };
  }, [endStroke]);

  // The cursor ring follows the radius slider even when the pointer is still.
  useEffect(() => {
    if (painting && pointer.current) overlay.current?.showBrush(...pointer.current, radiusM);
  }, [radiusM, painting, overlayActive]);

  const ready = painting && overlayActive && !!sim?.usable;

  const begin = (lng: number, lat: number) => {
    if (!sim || brush === null) return;
    sim.beginStroke(brush, radiusM, lng, lat);
    drawing.current = true;
    schedule();
  };
  const move = (lng: number, lat: number) => {
    pointer.current = [lng, lat];
    overlay.current?.showBrush(lng, lat, radiusM);
    if (drawing.current && sim) {
      sim.extendStroke(lng, lat);
      schedule();
    }
  };
  const leave = () => {
    pointer.current = null;
    overlay.current?.hideBrush();
    endStroke();
  };

  const handlers = {
    onMouseDown: (e: MapMouseEvent) => {
      if (!ready || e.originalEvent.button !== 0) return;
      begin(e.lngLat.lng, e.lngLat.lat);
    },
    onMouseMove: (e: MapMouseEvent) => {
      if (ready) move(e.lngLat.lng, e.lngLat.lat);
    },
    onMouseOut: () => {
      if (ready) leave();
    },
    onTouchStart: (e: MapTouchEvent) => {
      if (!ready) return;
      // A second finger means pinch or pan: drop the dab the first finger just made.
      if (e.originalEvent.touches.length > 1) {
        if (drawing.current) {
          drawing.current = false;
          sim?.cancelStroke();
          schedule();
        }
        return;
      }
      move(e.lngLat.lng, e.lngLat.lat);
      begin(e.lngLat.lng, e.lngLat.lat);
    },
    onTouchMove: (e: MapTouchEvent) => {
      if (ready && e.originalEvent.touches.length === 1) move(e.lngLat.lng, e.lngLat.lat);
    },
    onTouchEnd: () => {
      if (ready) leave();
    },
  };

  const openTool = useCallback(() => {
    if (!raster) return;
    simRef.current ??= new Simulation(raster.grids);
    setSim(simRef.current);
    setOpen(true);
    setBrush("paint");
  }, [raster]);

  const closeTool = useCallback(() => {
    setOpen(false);
    setBrush(null);
  }, []);

  const apply = (action: (s: Simulation) => void) => {
    if (!sim) return;
    action(sim);
    schedule();
  };

  return {
    sim,
    open,
    brush,
    radiusM,
    /** The tool can open once the rasters are loaded. */
    available: !!raster,
    /** The overlay is on the map, so the heat layer underneath can be hidden. */
    overlayActive,
    handlers,
    openTool,
    closeTool,
    setBrush,
    setRadiusM: (r: number) => setRadiusM(Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, r))),
    stepRadius: (direction: 1 | -1) =>
      setRadiusM((r) => Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, r + direction * RADIUS_STEP_M * 5))),
    undo: () => apply((s) => s.undo()),
    redo: () => apply((s) => s.redo()),
    clear: () => apply((s) => s.clear()),
  };
}

export type SimulationTool = ReturnType<typeof useSimulation>;
