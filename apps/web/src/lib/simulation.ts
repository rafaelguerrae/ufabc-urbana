import { colorAt, getIndicator } from "./indicators";
import type { CityGrid, ScenarioModel } from "./raster";

/*
 * Vegetation brush engine (no React, no DOM). Painted pixels of the observed 30 m raster are moved
 * along the city's empirical NDVI -> land-surface-temperature curve (data-pipeline/src/fit_scenario.py):
 *
 *   LST_sim = LST_obs + min(0, f(target NDVI) - f(NDVI_obs))      for land pixels below the target NDVI
 *
 * This is an observed association inside one satellite composite, not the causal effect of planting
 * trees. Everything it produces must be shown as simulated.
 */

export type BrushMode = "paint" | "erase";
type LngLat = [number, number];

/** One pointer gesture: its raw points are kept so undo/redo can replay it exactly. */
interface Stroke {
  mode: BrushMode;
  radiusM: number;
  points: LngLat[];
}

/** Pixel rectangle, x1 and y1 exclusive. */
interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Means are over the painted pixels. */
export interface SimStats {
  pixels: number;
  /** Real ground area (the EPSG:3857 grid is stretched by 1 / cos(latitude)). */
  areaHa: number;
  lstBefore: number;
  lstAfter: number;
  ndviBefore: number;
  ndviAfter: number;
}

export interface SimSnapshot {
  /** Null while nothing is painted. */
  stats: SimStats | null;
  canUndo: boolean;
  canRedo: boolean;
}

export const MIN_RADIUS_M = 90; // 3 pixels: finer than the 3 x 3 sampling window the app already uses
export const MAX_RADIUS_M = 1000;
const DAB_SPACING = 1 / 3; // dabs along a stroke are at most a third of the radius apart
const LUT_SIZE = 1024;
// Painted-area outline: edge pixels are tinted toward this green so "simulated" stays visible even where
// the temperature does not change (already green pixels).
const EDGE_RGB = [20, 83, 45] as const;
const EDGE_MIX = 0.55;

const lstIndicator = getIndicator("lst_c");
const rgbLut = new Map<string, Uint8ClampedArray>();

/** Color of the heat layer for 1024 steps of the shared LST scale. */
function colorLut(scale: [number, number]): Uint8ClampedArray {
  const key = scale.join();
  let lut = rgbLut.get(key);
  if (!lut) {
    lut = new Uint8ClampedArray(LUT_SIZE * 3);
    for (let i = 0; i < LUT_SIZE; i++) lut.set(colorAt(lstIndicator, i / (LUT_SIZE - 1)), i * 3);
    rgbLut.set(key, lut);
  }
  return lut;
}

/** Linear interpolation of the curve, clamped to its range (never extrapolated). */
function curveAt(curve: ScenarioModel["curve"], ndvi: number): number {
  const first = curve[0]!;
  const last = curve[curve.length - 1]!;
  if (ndvi <= first.ndvi) return first.lst;
  if (ndvi >= last.ndvi) return last.lst;
  let i = 1;
  while (curve[i]!.ndvi < ndvi) i++;
  const a = curve[i - 1]!;
  const b = curve[i]!;
  return a.lst + ((b.lst - a.lst) * (ndvi - a.ndvi)) / (b.ndvi - a.ndvi);
}

/** LST change (°C, never positive) for an NDVI that is already known to be land. */
export function lstDelta(scenario: ScenarioModel, ndvi: number): number {
  if (ndvi < 0 || ndvi >= scenario.target_ndvi) return 0;
  return Math.min(0, curveAt(scenario.curve, scenario.target_ndvi) - curveAt(scenario.curve, ndvi));
}

/** Closed ring of a circle with a ground radius in metres, for the brush cursor. */
export function brushRing(lng: number, lat: number, radiusM: number, steps = 64): LngLat[] {
  const dLat = radiusM / 110574;
  const dLng = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  const ring: LngLat[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return ring;
}

const union = (a: Rect | null, b: Rect): Rect =>
  a ? { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) } : { ...b };

interface Sums {
  n: number;
  area: number; // m²
  lstBefore: number;
  lstAfter: number;
  ndviBefore: number;
  ndviAfter: number;
}

const emptySums = (): Sums => ({ n: 0, area: 0, lstBefore: 0, lstAfter: 0, ndviBefore: 0, ndviAfter: 0 });

class GridState {
  readonly mask: Uint8Array;
  /** Map-as-now composite: observed colors, simulated where painted. Alpha 0 where there is no data. */
  readonly rgba: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly usable: boolean;
  sums = emptySums();
  /** Pixels changed since the last flush, and every pixel ever touched (for cheap undo/clear). */
  dirty: Rect | null = null;
  touched: Rect | null = null;

  private readonly res: number;
  private readonly lstLut = new Float32Array(256);
  private readonly ndviLut = new Float32Array(256);
  private readonly deltaLut = new Float32Array(256);
  private readonly ndviAfterLut = new Float32Array(256);
  private readonly colors: Uint8ClampedArray;
  private readonly lstMin: number;
  private readonly lstSpan: number;
  private readonly rowCos: Float64Array;

  constructor(readonly grid: CityGrid) {
    const { info, scenario } = grid;
    this.width = info.width;
    this.height = info.height;
    this.mask = new Uint8Array(this.width * this.height);
    this.rgba = new Uint8ClampedArray(this.width * this.height * 4);
    this.usable = !!scenario?.usable;
    this.res = info.pixel_size_m_projected?.[0] ?? 30;

    const [lo, hi] = info.lst.encoding;
    const [nLo, nHi] = info.ndvi.encoding;
    for (let g = 0; g < 256; g++) {
      this.lstLut[g] = lo + (g / 255) * (hi - lo);
      const ndvi = nLo + (g / 255) * (nHi - nLo);
      this.ndviLut[g] = ndvi;
      this.deltaLut[g] = scenario?.usable ? lstDelta(scenario, ndvi) : 0;
      this.ndviAfterLut[g] = scenario?.usable && ndvi >= 0 ? Math.max(ndvi, scenario.target_ndvi) : ndvi;
    }
    this.lstMin = info.lst.scale[0];
    this.lstSpan = info.lst.scale[1] - info.lst.scale[0];
    this.colors = colorLut(info.lst.scale);

    this.rowCos = new Float64Array(this.height);
    for (let y = 0; y < this.height; y++) this.rowCos[y] = Math.cos((grid.toLat(y + 0.5) * Math.PI) / 180);

    this.renderRect({ x0: 0, y0: 0, x1: this.width, y1: this.height });
  }

  /** Land with data (water, NDVI < 0, is never painted) in a city whose curve passed validation. */
  private eligible(i: number): boolean {
    const d = this.grid.data;
    return this.usable && d[i * 4 + 3]! > 0 && this.ndviLut[d[i * 4 + 1]!]! >= 0;
  }

  /** Paints or erases a ground-metre circle. Returns how many pixels changed. */
  stamp(mode: BrushMode, lng: number, lat: number, radiusM: number): number {
    const [cx, cy] = this.grid.toPixel(lng, lat);
    const r = radiusM / (this.res * Math.cos((lat * Math.PI) / 180));
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(this.width, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(this.height, Math.ceil(cy + r));
    if (x0 >= x1 || y0 >= y1) return 0;

    const paint = mode === "paint";
    const d = this.grid.data;
    let changed = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        if (dx * dx + dy * dy > r * r) continue;
        const i = y * this.width + x;
        if (paint ? this.mask[i] || !this.eligible(i) : !this.mask[i]) continue;
        this.mask[i] = paint ? 1 : 0;
        const sign = paint ? 1 : -1;
        const gL = d[i * 4]!;
        const gN = d[i * 4 + 1]!;
        const side = this.res * this.rowCos[y]!;
        this.sums.n += sign;
        this.sums.area += sign * side * side;
        this.sums.lstBefore += sign * this.lstLut[gL]!;
        this.sums.lstAfter += sign * (this.lstLut[gL]! + this.deltaLut[gN]!);
        this.sums.ndviBefore += sign * this.ndviLut[gN]!;
        this.sums.ndviAfter += sign * this.ndviAfterLut[gN]!;
        changed++;
      }
    }
    if (changed) {
      const rect = { x0, y0, x1, y1 };
      this.dirty = union(this.dirty, rect);
      this.touched = union(this.touched, rect);
    }
    return changed;
  }

  /** Redraws a rectangle (grown by one pixel for the outline) of the composite. */
  renderRect(rect: Rect) {
    const x0 = Math.max(0, rect.x0 - 1);
    const y0 = Math.max(0, rect.y0 - 1);
    const x1 = Math.min(this.width, rect.x1 + 1);
    const y1 = Math.min(this.height, rect.y1 + 1);
    const { data } = this.grid;
    const w = this.width;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * w + x;
        const o = i * 4;
        if (data[o + 3] === 0) {
          this.rgba[o + 3] = 0;
          continue;
        }
        const painted = this.mask[i] === 1;
        let lst = this.lstLut[data[o]!]!;
        if (painted) lst += this.deltaLut[data[o + 1]!]!;
        const k = Math.round(Math.min(1, Math.max(0, (lst - this.lstMin) / this.lstSpan)) * (LUT_SIZE - 1)) * 3;
        let r = this.colors[k]!;
        let g = this.colors[k + 1]!;
        let b = this.colors[k + 2]!;
        if (painted) {
          const edge =
            x === 0 || y === 0 || x === w - 1 || y === this.height - 1 ||
            !this.mask[i - 1] || !this.mask[i + 1] || !this.mask[i - w] || !this.mask[i + w];
          if (edge) {
            r += (EDGE_RGB[0] - r) * EDGE_MIX;
            g += (EDGE_RGB[1] - g) * EDGE_MIX;
            b += (EDGE_RGB[2] - b) * EDGE_MIX;
          }
        }
        this.rgba[o] = r;
        this.rgba[o + 1] = g;
        this.rgba[o + 2] = b;
        this.rgba[o + 3] = 255;
      }
    }
  }

  /** Empties the mask where anything was ever painted. The caller replays the strokes that remain. */
  reset() {
    const t = this.touched;
    if (t) for (let y = t.y0; y < t.y1; y++) this.mask.fill(0, y * this.width + t.x0, y * this.width + t.x1);
    this.sums = emptySums();
    // The old extent still has to be redrawn, whatever the replay paints.
    if (t) this.dirty = union(this.dirty, t);
    this.touched = null;
  }
}

/** Painted vegetation over the observed rasters of every city, with undo/redo history. */
export class Simulation {
  private readonly states: GridState[];
  private strokes: Stroke[] = [];
  private redoStack: Stroke[] = [];
  private current: Stroke | null = null;
  private currentChanged = 0;
  private listeners = new Set<() => void>();
  private snapshot: SimSnapshot = { stats: null, canUndo: false, canRedo: false };

  constructor(grids: CityGrid[]) {
    this.states = grids.map((g) => new GridState(g));
  }

  /** Per-city models, for showing how well the curve fits. Null where the model file is missing. */
  get scenarios(): { slug: CityGrid["slug"]; scenario: ScenarioModel | null }[] {
    return this.states.map((s) => ({ slug: s.grid.slug, scenario: s.grid.scenario }));
  }

  get usable(): boolean {
    return this.states.some((s) => s.usable);
  }

  /** The composite buffer of a city, for drawing it on a canvas. */
  buffers(): { grid: CityGrid; rgba: Uint8ClampedArray }[] {
    return this.states.map((s) => ({ grid: s.grid, rgba: s.rgba }));
  }

  // --- painting ---------------------------------------------------------------------------------

  beginStroke(mode: BrushMode, radiusM: number, lng: number, lat: number) {
    this.finishStroke();
    this.redoStack = [];
    this.current = { mode, radiusM, points: [[lng, lat]] };
    this.currentChanged = this.stampAll(this.current, lng, lat);
    this.strokes.push(this.current);
  }

  extendStroke(lng: number, lat: number) {
    const s = this.current;
    if (!s) return;
    const last = s.points[s.points.length - 1]!;
    for (const p of segmentDabs(last, [lng, lat], s.radiusM)) this.currentChanged += this.stampAll(s, p[0], p[1]);
    s.points.push([lng, lat]);
  }

  /** Ends the gesture; a stroke that changed nothing is dropped so undo never "does nothing". */
  finishStroke() {
    if (this.current && this.currentChanged === 0) this.strokes.pop();
    this.current = null;
    this.currentChanged = 0;
  }

  /** Drops a gesture that barely started (a second finger landing for a pinch); keeps a real stroke. */
  cancelStroke() {
    if (this.current && this.current.points.length <= 2) {
      this.strokes.pop();
      this.current = null;
      this.currentChanged = 0;
      this.rebuild();
    } else this.finishStroke();
  }

  undo() {
    this.finishStroke();
    const s = this.strokes.pop();
    if (!s) return;
    this.redoStack.push(s);
    this.rebuild();
  }

  redo() {
    this.finishStroke();
    const s = this.redoStack.pop();
    if (!s) return;
    this.strokes.push(s);
    this.replay(s);
  }

  clear() {
    this.finishStroke();
    this.strokes = [];
    this.redoStack = [];
    this.rebuild();
  }

  private stampAll(s: Stroke, lng: number, lat: number): number {
    let changed = 0;
    for (const st of this.states) changed += st.stamp(s.mode, lng, lat, s.radiusM);
    return changed;
  }

  private replay(s: Stroke) {
    const [first, ...rest] = s.points;
    if (!first) return;
    this.stampAll(s, first[0], first[1]);
    let prev = first;
    for (const p of rest) {
      for (const d of segmentDabs(prev, p, s.radiusM)) this.stampAll(s, d[0], d[1]);
      prev = p;
    }
  }

  private rebuild() {
    for (const st of this.states) st.reset();
    for (const s of this.strokes) this.replay(s);
  }

  // --- output -----------------------------------------------------------------------------------

  /**
   * Redraws what changed and returns it as per-city rectangles to upload. Call once per frame while
   * painting, then `commit()` to publish the new numbers.
   */
  flush(): { grid: CityGrid; rgba: Uint8ClampedArray; rect: Rect }[] {
    const out = [];
    for (const st of this.states) {
      if (!st.dirty) continue;
      st.renderRect(st.dirty);
      const d = st.dirty;
      out.push({
        grid: st.grid,
        rgba: st.rgba,
        rect: { x0: Math.max(0, d.x0 - 1), y0: Math.max(0, d.y0 - 1), x1: Math.min(st.width, d.x1 + 1), y1: Math.min(st.height, d.y1 + 1) },
      });
      st.dirty = null;
    }
    return out;
  }

  /** Recomputes the snapshot and tells subscribers. */
  commit() {
    this.snapshot = { stats: this.stats(), canUndo: this.strokes.length > 0, canRedo: this.redoStack.length > 0 };
    for (const l of this.listeners) l();
  }

  stats(): SimStats | null {
    const t = emptySums();
    for (const { sums } of this.states) {
      t.n += sums.n;
      t.area += sums.area;
      t.lstBefore += sums.lstBefore;
      t.lstAfter += sums.lstAfter;
      t.ndviBefore += sums.ndviBefore;
      t.ndviAfter += sums.ndviAfter;
    }
    if (t.n <= 0) return null;
    return {
      pixels: t.n,
      areaHa: t.area / 10000,
      lstBefore: t.lstBefore / t.n,
      lstAfter: t.lstAfter / t.n,
      ndviBefore: t.ndviBefore / t.n,
      ndviAfter: t.ndviAfter / t.n,
    };
  }

  // useSyncExternalStore contract
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };
  getSnapshot = () => this.snapshot;
}

/** Points between two pointer samples, at most `radius / 3` apart, so fast strokes stay continuous. */
function segmentDabs(a: LngLat, b: LngLat, radiusM: number): LngLat[] {
  const midLat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dist = Math.hypot((b[0] - a[0]) * 111320 * Math.cos(midLat), (b[1] - a[1]) * 110574);
  const n = Math.ceil(dist / (radiusM * DAB_SPACING));
  const out: LngLat[] = [];
  for (let i = 1; i <= n; i++) out.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  return out;
}
