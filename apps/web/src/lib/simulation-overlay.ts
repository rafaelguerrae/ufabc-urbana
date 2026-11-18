import type { CanvasSource, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

import { brushRing, type Simulation } from "./simulation";

/** Same opacity as the heat layer it replaces, so unpainted areas look unchanged. */
const HEAT_OPACITY = 0.78;
const BRUSH_SOURCE = "sim-brush";
// Canvas sources only re-upload their texture while "playing", so play for a moment after each change.
const PAUSE_AFTER_MS = 250;

export interface SimulationOverlay {
  /** Uploads the pixels changed since the last call. */
  flush: () => void;
  showBrush: (lng: number, lat: number, radiusM: number) => void;
  hideBrush: () => void;
  destroy: () => void;
}

/**
 * Draws the simulated map (observed colors, simulated where painted) over every city as MapLibre canvas
 * sources, plus the brush cursor. Imperative on purpose: strokes must not re-render the React tree.
 */
export function mountOverlay(map: MapLibreMap, sim: Simulation, beforeId: string | undefined): SimulationOverlay {
  const layers: string[] = [];
  const sources: string[] = [];
  const contexts = new Map<string, CanvasRenderingContext2D>();
  const images = new Map<string, ImageData>();

  for (const { grid, rgba } of sim.buffers()) {
    const { width, height, bounds: b } = grid.info;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    const image = new ImageData(rgba as Uint8ClampedArray<ArrayBuffer>, width, height);
    ctx.putImageData(image, 0, 0);
    contexts.set(grid.slug, ctx);
    images.set(grid.slug, image);

    map.addSource(`sim-${grid.slug}`, {
      type: "canvas",
      canvas,
      animate: false,
      coordinates: [
        [b.west, b.north],
        [b.east, b.north],
        [b.east, b.south],
        [b.west, b.south],
      ],
    });
    map.addLayer(
      {
        id: `sim-layer-${grid.slug}`,
        type: "raster",
        source: `sim-${grid.slug}`,
        paint: { "raster-opacity": HEAT_OPACITY, "raster-resampling": "linear", "raster-fade-duration": 0 },
      },
      beforeId,
    );
    sources.push(`sim-${grid.slug}`);
    layers.push(`sim-layer-${grid.slug}`);
  }

  map.addSource(BRUSH_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "sim-brush-fill", type: "fill", source: BRUSH_SOURCE, paint: { "fill-color": "#15803d", "fill-opacity": 0.12 } });
  map.addLayer({ id: "sim-brush-halo", type: "line", source: BRUSH_SOURCE, paint: { "line-color": "#ffffff", "line-width": 4, "line-opacity": 0.9 } });
  map.addLayer({ id: "sim-brush-line", type: "line", source: BRUSH_SOURCE, paint: { "line-color": "#14532d", "line-width": 2 } });
  sources.push(BRUSH_SOURCE);
  layers.push("sim-brush-fill", "sim-brush-halo", "sim-brush-line");

  let pauseTimer: number | undefined;
  const setPlaying = (playing: boolean) => {
    for (const { grid } of sim.buffers()) {
      const src = map.getSource(`sim-${grid.slug}`) as CanvasSource | undefined;
      if (playing) src?.play();
      else src?.pause();
    }
  };

  return {
    flush() {
      const changes = sim.flush();
      if (changes.length === 0) return;
      for (const { grid, rect } of changes) {
        contexts.get(grid.slug)?.putImageData(images.get(grid.slug)!, 0, 0, rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
      }
      setPlaying(true);
      window.clearTimeout(pauseTimer);
      pauseTimer = window.setTimeout(() => setPlaying(false), PAUSE_AFTER_MS);
    },
    showBrush(lng, lat, radiusM) {
      (map.getSource(BRUSH_SOURCE) as GeoJSONSource | undefined)?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [brushRing(lng, lat, radiusM)] },
      });
    },
    hideBrush() {
      (map.getSource(BRUSH_SOURCE) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: [] });
    },
    destroy() {
      window.clearTimeout(pauseTimer);
      // The map may already be gone when React unmounts.
      try {
        for (const id of layers) if (map.getLayer(id)) map.removeLayer(id);
        for (const id of sources) if (map.getSource(id)) map.removeSource(id);
      } catch {
        /* map already removed */
      }
    },
  };
}
