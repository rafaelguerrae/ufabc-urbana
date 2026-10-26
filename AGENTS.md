# AGENTS.md

Guidance for AI agents working in this repository.

## Project

- The project is always named **ufabc-urbana** (repo and package names) or **UFABC Urbana** (display name). Do not use "Cidade em Temperatura" or other former working titles.
- Everything is written in **English**: code, comments, docs, UI copy and commit messages. Portuguese appears only inside bibliographic citations (titles of cited papers, source URLs).
- Topic: urban heat islands and the role of vegetation in the urban microclimate. Do not widen it to generic "urban climate".
- Study area: municipality of São Paulo first; keep the pipeline expandable to the Metropolitan Region of São Paulo (RMSP).

## Architecture

- Turborepo + pnpm monorepo. `apps/web` is Next.js (App Router, strict TypeScript). Shared code lives in `packages/*`.
- `data-pipeline/` holds Python scripts (managed with uv) that turn public datasets into static GeoJSON/JSON consumed by `apps/web` (for example from `apps/web/public/data/`).
- No database or API server for now. Add one only if the feasibility work shows static files are insufficient.
- Planned map stack (see `temp-plan.md`): `react-map-gl` + MapLibre GL JS, `deck.gl` layers, Tremor charts.

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
