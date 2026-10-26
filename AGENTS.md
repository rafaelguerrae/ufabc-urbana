# AGENTS.md

Guidance for AI agents working in this repository.

## Project

- The project is always named **ufabc-urbana** (repo and package names) or **UFABC Urbana** (display name). Do not use "Cidade em Temperatura" or other former working titles.
- Code, comments, docs and commit messages are written in **English**.
- All user-facing text in `apps/web` (UI copy, labels, errors, metadata) is **Brazilian Portuguese (pt-BR)**, written in plain language for people with no background on urban heat islands or vegetation. Number formatting uses the `pt-BR` locale.
- Topic: urban heat islands and the role of vegetation in the urban microclimate. Do not widen it to generic "urban climate".
- Study area: municipality of São Paulo first; keep the pipeline expandable to the Metropolitan Region of São Paulo (RMSP).

## Architecture

- Turborepo + pnpm monorepo. `apps/web` is Next.js (App Router, strict TypeScript). Shared code lives in `packages/*`.
- `data-pipeline/` holds Python scripts (managed with uv) that turn public datasets into static GeoJSON/JSON consumed by `apps/web` (for example from `apps/web/public/data/`).
- No database or API server for now. Add one only if the feasibility work shows static files are insufficient.
- Map stack: `react-map-gl` + MapLibre GL JS with native layers (a 30 m heat raster image overlay and a district GeoJSON choropleth), CARTO Positron basemap, Photon geocoding. `deck.gl` and Tremor from `temp-plan.md` are not used yet; MapLibre layers are needed to draw data under roads and labels.
- Data flow: `data-pipeline` (Earth Engine + IBGE) writes `apps/web/public/data/districts.geojson` and `public/data/raster/*` (`uv run python -m src.export_web`, `uv run python -m src.export_raster`). The web app only reads these static files.

## Data-integrity rules

1. Never fabricate data. Placeholder values in mockups must be labelled as placeholders and never hard-coded as real.
2. Keep observed measurements, derived indicators and simulated/hypothetical results visibly distinct.
3. Preserve provenance: source, dataset version/collection, period, units and processing steps.
4. Do not overstate causality; spatial association is not proof of causation.
5. Respect scale (station, pixel, census tract, municipality are different units) and explain any aggregation or interpolation.
6. Document uncertainty and missing data; never silently fill gaps.
7. "What if?" scenarios need a documented, defensible method; otherwise present them as conceptual only.
8. Link scientific claims to literature or official data documentation.
9. Verify that a dataset is actually accessible and licensed for this use before relying on it; a catalog listing is not proof.

## Development order

1. Scope and data feasibility (`data-pipeline/FEASIBILITY.md`).
2. Data validation and a reproducible processing prototype.
3. Web platform built only on validated indicators.
4. Scenario exploration, only after a validated model exists.

## Commands

```sh
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm check-types
pnpm format
```

Data pipeline commands are listed in `data-pipeline/README.md`.

## References

- `tmp/general-plan.md` (local, git-ignored): product and research reference. Treat it as context, not verified fact.
- `temp-plan.md`: technical implementation plan for the web app.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
