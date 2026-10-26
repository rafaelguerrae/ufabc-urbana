"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { GeoJsonLayer } from "@deck.gl/layers";
import DeckGL from "@deck.gl/react";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { Map } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";

import { colorAt, getIndicator, type DistrictProperties, type IndicatorKey } from "../lib/indicators";
import { Sidebar } from "./Sidebar";
import styles from "./MapView.module.css";

type DistrictFeature = Feature<Polygon | MultiPolygon, DistrictProperties>;
type DistrictCollection = FeatureCollection<Polygon | MultiPolygon, DistrictProperties>;

// Worker file is copied into /public by scripts/copy-maplibre-worker.mjs.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const BASEMAP = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const INITIAL_VIEW_STATE = { longitude: -46.64, latitude: -23.68, zoom: 9.3, pitch: 0, bearing: 0 };

export function MapView() {
  const [data, setData] = useState<DistrictCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [indicatorKey, setIndicatorKey] = useState<IndicatorKey>("lst_c");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hoverCode, setHoverCode] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/districts.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<DistrictCollection>;
      })
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load data"));
  }, []);

  const indicator = getIndicator(indicatorKey);

  const range = useMemo(() => {
    if (!data) return { min: 0, max: 1 };
    const values = data.features.map((f) => f.properties[indicatorKey]);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [data, indicatorKey]);

  const selected = useMemo(
    () => data?.features.find((f) => f.properties.code === selectedCode)?.properties ?? null,
    [data, selectedCode],
  );

  const layers = useMemo(() => {
    if (!data) return [];
    const span = range.max - range.min || 1;
    return [
      new GeoJsonLayer<DistrictProperties>({
        id: "districts",
        data: data as DistrictCollection,
        pickable: true,
        stroked: true,
        filled: true,
        getFillColor: (f) => {
          const t = (f.properties[indicatorKey] - range.min) / span;
          const isHover = f.properties.code === hoverCode;
          return [...colorAt(indicator, t), isHover ? 255 : 215] as [number, number, number, number];
        },
        getLineColor: (f) => (f.properties.code === selectedCode ? [0, 0, 0, 255] : [255, 255, 255, 200]),
        getLineWidth: (f) => (f.properties.code === selectedCode ? 3 : 1),
        lineWidthUnits: "pixels",
        updateTriggers: {
          getFillColor: [indicatorKey, range.min, range.max, hoverCode],
          getLineColor: [selectedCode],
          getLineWidth: [selectedCode],
        },
      }),
    ];
  }, [data, indicator, indicatorKey, range, hoverCode, selectedCode]);

  return (
    <div className={styles.root}>
      <div className={styles.map}>
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller
          layers={layers}
          onHover={(info) => setHoverCode((info.object as DistrictFeature | undefined)?.properties.code ?? null)}
          onClick={(info) => setSelectedCode((info.object as DistrictFeature | undefined)?.properties.code ?? null)}
          getCursor={({ isHovering }) => (isHovering ? "pointer" : "grab")}
        >
          <Map mapStyle={BASEMAP} />
        </DeckGL>
      </div>
      <Sidebar
        indicator={indicator}
        onIndicatorChange={setIndicatorKey}
        range={range}
        selected={selected}
        loading={!data && !error}
        error={error}
      />
    </div>
  );
}
