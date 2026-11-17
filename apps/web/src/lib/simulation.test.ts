import { describe, expect, it } from "vitest";

import { gridMapping, type CityGrid, type RasterInfo, type ScenarioModel } from "./raster";
import { brushRing, lstDelta, Simulation } from "./simulation";

const R = 6378137;
const SIZE = 100;
const PX_M = 30;
const WEST = -46.6;
const SOUTH = -23.6;
// 100 px of 30 projected metres, in Web Mercator.
const EAST = WEST + (SIZE * PX_M) / R / (Math.PI / 180);
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const NORTH = ((Math.atan(Math.sinh(mercY(SOUTH) + (SIZE * PX_M) / R)) * 180) / Math.PI);

const SCENARIO: ScenarioModel = {
  target_ndvi: 0.7,
  target_ndvi_land_share: 0.5,
  curve: [
    { ndvi: 0, lst: 42, n: 1000 },
    { ndvi: 0.5, lst: 36, n: 1000 },
    { ndvi: 1, lst: 30, n: 1000 },
  ],
  pixels: 3000,
  pearson_r: -0.8,
  r2: 0.7,
  rmse: 2,
  holdout_r2: 0.7,
  holdout_rmse: 2,
  usable: true,
  reason: null,
};

const LST_BYTE = Math.round(((40 - 15) / 40) * 255); // 40 °C
const NDVI_BARE = Math.round(((0.2 + 0.2) / 1.2) * 255); // NDVI 0.2
const NDVI_WATER = Math.round(((-0.1 + 0.2) / 1.2) * 255); // NDVI -0.1

/** 100 x 100 grid: NDVI 0.2 everywhere, water in columns 0-9, no data in rows 90-99. */
function makeGrid(scenario: ScenarioModel | null = SCENARIO): CityGrid {
  const info: RasterInfo = {
    bounds: { west: WEST, south: SOUTH, east: EAST, north: NORTH },
    width: SIZE,
    height: SIZE,
    lst: { encoding: [15, 55], scale: [27, 45], unit: "°C" },
    ndvi: { encoding: [-0.2, 1], scale: [-0.2, 0.9], unit: "index" },
    period: ["2023-12-01", "2024-03-31"],
    scenes: 26,
    pixel_size_m_projected: [PX_M, PX_M],
  };
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const o = (y * SIZE + x) * 4;
      data[o] = LST_BYTE;
      data[o + 1] = x < 10 ? NDVI_WATER : NDVI_BARE;
      data[o + 3] = y >= 90 ? 0 : 255;
    }
  }
  return { slug: "sao-paulo", info, scenario, data, ...gridMapping(info) };
}

const grid = makeGrid();
const at = (x: number, y: number): [number, number] => [WEST + (x / SIZE) * (EAST - WEST), grid.toLat(y)];

function paint(sim: Simulation, x: number, y: number, radiusM: number, mode: "paint" | "erase" = "paint") {
  sim.beginStroke(mode, radiusM, ...at(x, y));
  sim.finishStroke();
  sim.commit();
}

describe("lstDelta", () => {
  it("cools bare land toward the target and never warms", () => {
    expect(lstDelta(SCENARIO, 0.2)).toBeCloseTo(33.6 - 39.6, 6);
    for (let n = 0; n <= 1; n += 0.05) expect(lstDelta(SCENARIO, n)).toBeLessThanOrEqual(0);
  });

  it("shrinks monotonically as NDVI approaches the target", () => {
    let prev = -Infinity;
    for (let n = 0; n < 0.7; n += 0.05) {
      const d = lstDelta(SCENARIO, n);
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
  });

  it("leaves water and already-green pixels alone", () => {
    expect(lstDelta(SCENARIO, -0.1)).toBe(0);
    expect(lstDelta(SCENARIO, 0.7)).toBe(0);
    expect(lstDelta(SCENARIO, 0.9)).toBe(0);
  });
});

describe("Simulation", () => {
  it("reports real ground area, corrected for the Mercator stretch", () => {
    const sim = new Simulation([grid]);
    paint(sim, 55, 45, 300);
    const ha = sim.stats()!.areaHa;
    const circle = (Math.PI * 300 ** 2) / 10000; // 28.3 ha
    expect(ha).toBeGreaterThan(circle * 0.95);
    expect(ha).toBeLessThan(circle * 1.05);
    // pixels x 900 m² would overstate it by 1 / cos²(lat), about 19% here
    expect(sim.stats()!.pixels * 900 / 10000).toBeGreaterThan(circle * 1.1);
  });

  it("cools painted land by the curve and raises its NDVI to the target", () => {
    const sim = new Simulation([grid]);
    paint(sim, 55, 45, 150);
    const s = sim.stats()!;
    expect(s.lstAfter - s.lstBefore).toBeCloseTo(-6, 5);
    expect(s.ndviBefore).toBeCloseTo(0.2, 2);
    expect(s.ndviAfter).toBeCloseTo(0.7, 6);
  });

  it("never paints water or pixels without data", () => {
    const sim = new Simulation([grid]);
    paint(sim, 4, 45, 90); // water: the whole 3 px circle stays inside columns 0-9
    expect(sim.stats()).toBeNull();
    paint(sim, 50, 98, 90); // no data: rows 90-99
    expect(sim.stats()).toBeNull();
    expect(sim.getSnapshot().canUndo).toBe(false); // strokes that change nothing leave no history
  });

  it("skips a city whose model failed validation", () => {
    const sim = new Simulation([makeGrid({ ...SCENARIO, usable: false, reason: "test" })]);
    expect(sim.usable).toBe(false);
    paint(sim, 55, 45, 200);
    expect(sim.stats()).toBeNull();
  });

  it("paints a continuous band between two distant pointer samples", () => {
    const sim = new Simulation([grid]);
    sim.beginStroke("paint", 90, ...at(20, 45));
    sim.extendStroke(...at(80, 45));
    sim.finishStroke();
    // 60 px x 27.5 m long, 180 m wide, plus the round ends: about 32 ha; two lone circles would be 5 ha
    expect(sim.stats()!.areaHa).toBeGreaterThan(25);
  });

  it("erases back to nothing", () => {
    const sim = new Simulation([grid]);
    paint(sim, 55, 45, 200);
    paint(sim, 55, 45, 400, "erase");
    expect(sim.stats()).toBeNull();
  });

  it("undo, redo and clear reproduce exactly what direct painting gives", () => {
    const strokes: [number, number, number][] = [
      [30, 30, 200],
      [60, 50, 300],
      [45, 40, 150],
    ];
    const direct = (n: number) => {
      const s = new Simulation([makeGrid()]);
      for (const [x, y, r] of strokes.slice(0, n)) paint(s, x, y, r);
      s.flush();
      return s;
    };
    const same = (a: Simulation, b: Simulation) => {
      expect(a.stats()).toEqual(b.stats());
      expect(a.buffers()[0]!.rgba).toEqual(b.buffers()[0]!.rgba);
    };

    const sim = new Simulation([makeGrid()]);
    for (const [x, y, r] of strokes) paint(sim, x, y, r);
    sim.flush();
    same(sim, direct(3));

    sim.undo();
    sim.flush();
    same(sim, direct(2));
    sim.undo();
    sim.flush();
    same(sim, direct(1));

    sim.redo();
    sim.redo();
    sim.flush();
    same(sim, direct(3));

    sim.clear();
    sim.flush();
    same(sim, direct(0));
    expect(sim.stats()).toBeNull();
  });

  it("drops the redo history when painting after an undo", () => {
    const sim = new Simulation([grid]);
    paint(sim, 30, 30, 150);
    sim.undo();
    sim.commit();
    expect(sim.getSnapshot().canRedo).toBe(true);
    paint(sim, 60, 60, 150);
    expect(sim.getSnapshot().canRedo).toBe(false);
  });

  it("cancelStroke removes a barely started gesture but keeps a real stroke", () => {
    const sim = new Simulation([grid]);
    sim.beginStroke("paint", 150, ...at(30, 30));
    sim.cancelStroke();
    expect(sim.stats()).toBeNull();

    sim.beginStroke("paint", 150, ...at(30, 30));
    sim.extendStroke(...at(40, 30));
    sim.extendStroke(...at(50, 30));
    sim.cancelStroke();
    expect(sim.stats()).not.toBeNull();
  });

  it("tints the outline of the painted area and leaves the rest of the map as observed", () => {
    const sim = new Simulation([grid]);
    const before = sim.buffers()[0]!.rgba.slice();
    paint(sim, 55, 45, 200);
    sim.flush();
    const after = sim.buffers()[0]!.rgba;
    const px = (buf: Uint8ClampedArray, x: number, y: number) => Array.from(buf.slice((y * SIZE + x) * 4, (y * SIZE + x) * 4 + 4));
    expect(px(after, 90, 5)).toEqual(px(before, 90, 5)); // far away: untouched
    expect(px(after, 55, 45)).not.toEqual(px(before, 55, 45)); // painted: cooler color
    expect(px(after, 4, 5)).toEqual(px(before, 4, 5)); // water: untouched
  });
});

describe("brushRing", () => {
  it("is a closed ring of the requested ground radius", () => {
    const ring = brushRing(-46.6, -23.55, 500);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    const [lng, lat] = ring[16]!; // a quarter turn: due north
    expect(lng).toBeCloseTo(-46.6, 6);
    expect((lat + 23.55) * 110574).toBeCloseTo(500, 0);
  });
});
