# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Identity

Your name is **GUPPI** (General Unit Primary Peripheral Interface). Sign all commits as:

```
Co-Authored-By: GUPPI <guppi@bobiverse.local>
```

## Workflow

Do NOT use the brainstorming skill. Jump directly to implementation when given a task.

## Commands

```bash
npm run dev          # Start Vite dev server at http://localhost:5173
npm run build        # tsc --noEmit + vite build → dist/
npx tsc --noEmit     # Type-check only (no output files)
npm run preview      # Preview the production build locally

# Regenerate stars.json from HYG catalogue (not committed — download first):
#   curl -L https://www.astronexus.com/downloads/catalogs/hygdata_v37.csv.gz | gunzip > hygdata_v37.csv
python3 scripts/process_hyg.py hygdata_v37.csv public/data/stars.json
python3 scripts/process_hyg.py hygdata_v37.csv public/data/stars.json --max-ly 20
```

There are no automated tests yet. CI validates: TypeScript type-check, Vite build, JSON syntax in `public/data/*.json`, and Python syntax in `scripts/`.

## Architecture

**Entry point**: `src/main.ts` — fetches star data via `loadStars()`, then passes it to `StarMap`.

**`src/scene/StarMap.ts`** — the entire Three.js scene lives here as a class. Stars are rendered as a single `THREE.Points` object (one `BufferGeometry` with position + color attributes). Sol is a separate `SphereGeometry` at the origin. Reference grid circles are `LineLoop` objects at 10/25/50/100 ly radii. OrbitControls provides drag/scroll/pan.

**Coordinate mapping**: HYG database uses `(x, y, z)` in parsecs where `z` = north celestial pole. StarMap swaps: `positions.push(s.x, s.z, s.y)` so HYG-z becomes Three.js-Y (galactic plane horizontal). 1 Three.js unit = 1 parsec.

**`src/data/loader.ts`** — async fetch of `/data/stars.json`. Future loaders (`loadSystems()`, `loadBobs()`) will follow the same pattern.

**`src/types/star.ts`** — `Star` interface matching the JSON schema produced by `process_hyg.py`.

**`src/types/bobiverse.ts`** — `BobiverseSystem`, `Bob`, `Civilization`, `Ship` interfaces for Phase 2+ overlays. Not yet rendered.

**`public/data/stars.json`** — auto-generated from HYG; do not edit manually. `public/data/systems.json` — hand-maintained Bobiverse system info; edit freely, always include `notes` with book/chapter source.

## Phased roadmap context

The project is in Phase 1 (star map only). TODO comments in the code mark Phase 2+ integration points:
- `StarMap.ts`: raycaster for hover/click labels, separate overlay group for Bobiverse systems
- `loader.ts`: `loadSystems()` and `loadBobs()` stubs
- `bobiverse.ts`: types are defined but not rendered yet

Phase 6 GitHub Pages deploy is stubbed but commented out in `.github/workflows/ci.yml`.
