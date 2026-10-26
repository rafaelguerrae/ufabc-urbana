# ufabc-urbana - tech implementation plan

## 1. Project Overview & Agent Context
**Project Name:** UFABC Urbana
**Objective:** Develop an interactive, web-based scientific communication platform that allows non-expert users to explore the relationship between urban environments (vegetation, urbanization) and urban climate phenomena (like urban heat islands). 
**Context for the AI Agent:** You are assisting a solo software engineer in building this platform. The project requires strict separation of concerns, high-performance geospatial rendering, and precise scientific data presentation. Do not overcomplicate the infrastructure; rely on static data processing where possible.

## 2. Architecture & Tech Stack
The project uses a Monorepo architecture managed by **Turborepo** (`turbo.json`). 

### Core Stack
*   **Framework:** Next.js (App Router) + React.
*   **Language:** Strict TypeScript.
*   **Styling:** Tailwind CSS.

### Data Visualization & Geospatial (Core Features)
*   **Base Map rendering:** `react-map-gl` (https://github.com/visgl/react-map-gl) utilizing MapLibre GL JS underneath (not Mapbox, to avoid licensing/API key dependencies for the MVP).
*   **Data Layers & Overlays:** `deck.gl` (https://github.com/visgl/deck.gl). This is crucial for rendering heavy data layers (heatmaps, polygons, temporal transitions) over the base map with WebGL performance.
*   **Charts & Dashboards:** Tremor (https://www.tremor.so/). Used for rendering the comparative data (e.g., Temperature vs. Vegetation percentages over time) in sidebars and data panels.

### Data Strategy
*   **No active Database for MVP:** All geospatial and historical data (from MapBiomas and thermal measurements) will be pre-processed off-thread via Python scripts into optimized `GeoJSON` or `JSON` files.
*   The Next.js app will consume these static files (hosted in the `public/` directory or a static bucket) to ensure instantaneous load times.

## 3. Structure

```
ufabc-urbana/
├── turbo.json
├── package.json
├── apps/
│   └── web/                   # Next.js App Router (Main Application)
│       ├── app/               # Page routes & layouts
│       ├── components/        # React components (Map, Sidebar, Charts)
│       ├── lib/               # Utility functions & Deck.gl layer configs
│       └── public/data/       # Static JSON/GeoJSON data files
├── packages/
│   ├── ui/                    # Shared UI components (Tailwind + Tremor base)
│   ├── tsconfig/              # Shared TS configurations
└── data-pipeline/             # Python scripts for data preparation (Outside TS scope)
```

## 4. Implementation Phases

### Phase 1: Scaffold & Map Boilerplate

1. Initialize the Next.js `apps/web` environment.
2. Install `react-map-gl`, `maplibre-gl`, and `@deck.gl/react`, `@deck.gl/layers`, `@deck.gl/mapbox`.
3. Create a base `<MapContainer />` component. Integrate `react-map-gl` using a free base map tile provider (e.g., CartoDB Positron or standard MapLibre tiles).
4. Implement a basic `DeckGL` overlay on top of the `Map` component to ensure WebGL context synchronization.

### Phase 2: Geospatial Data Layers (Deck.gl)

1. Create mock `GeoJSON` files representing distinct urban regions (e.g., municipalities or neighborhoods).
2. Implement a `GeoJsonLayer` in Deck.gl to render these regions.
3. Add interactive states: Hover effects, onClick handlers to select a region.
4. Implement color-coding (choropleth) based on mock variables (e.g., fill color based on temperature or vegetation percentage).

### Phase 3: Dashboard & Scientific Charts (Tremor)

1. Install Tremor (`@tremor/react`) and configure it with Tailwind CSS.
2. Create a `<DataPanel />` component (e.g., a right-side drawer or overlay floating panel).
3. When a region is clicked on the map, populate the panel with Tremor components:
* `BarChart` or `LineChart` comparing the selected region's temperature and vegetation over time.
* `DonutChart` for land use distribution (urban vs. vegetation).

### Phase 4: Temporal Animation & UI Controls

1. Implement a slider component (Timeline) to allow users to scrub through years (e.g., 1985 to 2025).
2. Connect the slider state to the Deck.gl layer data source.
3. Ensure Deck.gl layer transitions are smooth using the `transitions` prop (e.g., fading between yearly datasets).

### Phase 5: Scientific Contextualization

1. Implement UI sections dedicated to scientific explanations (RF05).
2. Create easily readable "Info Cards" using Tremor/Tailwind that explain physical phenomena like "Urban Heat Islands", "Evapotranspiration", and "Albedo" when the user interacts with specific metrics.

## 5. Development Rules for the AI Agent

* **Performance First:** Always use `useMemo` for Deck.gl layers and data parsing to prevent unnecessary re-renders of the WebGL canvas.
* **Component Isolation:** Keep Map state (viewport, layers) separate from UI state (modals, open panels) using a state manager (Zustand or React Context) to avoid layout thrashing.
* **Accessibility:** Ensure all Tremor charts and UI elements have proper aria-labels and descriptive fallbacks.
* **Type Safety:** Create strict TypeScript interfaces for the expected structure of the static `JSON` data (e.g., `RegionData`, `TimeSeriesData`).
* **Deck.gl Integration:** Always use the `DeckGL` component as the parent and pass the `react-map-gl` `Map` component as a child to ensure proper camera synchronization, as recommended in the official vis.gl documentation.
