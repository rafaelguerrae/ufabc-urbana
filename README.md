# ufabc-urbana

UFABC Urbana is a scientific communication platform about **urban heat islands and the role of vegetation in the microclimate of cities**. It is a project for the *Projeto Dirigido* course of the Bachelor's degree in Science and Technology at UFABC.

## What is UFABC Urbana

An interactive web map that helps a non-specialist audience explore how the way cities are built relates to local temperature. Users select an area, inspect the indicators that are genuinely available for it (temperature, vegetation cover, built-up area, population density), learn why those indicators matter, and access the related scientific sources.

- **Main research question:** How do the characteristics of urbanization influence the temperature of different areas of a city?
- **Secondary research question:** What is the relationship between vegetation cover and urban temperature?
- **Study area:** the municipality of São Paulo (the pipeline is designed to expand to the Metropolitan Region of São Paulo later).

The platform is meant for exploration and communication, not to present unsupported causal claims or invented measurements. Every indicator shows its source, period, unit and data type (observed, derived or simulated).

## Getting started

Requirements: Node.js >= 24, pnpm, and uv

```sh
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm check-types
```
