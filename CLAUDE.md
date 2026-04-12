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

**Entry point**: `src/main.ts` — fetches star data via `loadStars()`, groups it into systems via `groupIntoSystems()`, wraps it in a `SystemStore`, then hands it to `StarMap`.

**`src/scene/StarMap.ts`** — Three.js scene orchestrator. Holds `private store: SystemStore`. Stars are rendered as a single `THREE.Points` object. The scene is split into two groups:
- `worldGroup` — stars, labels, projection lines. Translated by `-origin` on every `setOrigin` so the current origin sits at (0,0,0).
- `staticOverlay` — grid and ly reference circles. Always centred on (0,0,0).

The constructor does **not** call `rebuildWorld` — `main.ts` calls `setVisibleSystems(systems)` on init via `applyFilter()`. `setVisibleSystems` is the public API for updating the visible star set; it delegates to the private `rebuildWorld`.

Rendering is delegated to **scene layers** (`src/scene/layers/`):
- `GridLayer` — `GridHelper` + `LineLoop` radius circles (10/25/50/100 ly)
- `ProjectionLayer` — faint vertical drop lines to the galactic plane; supports `setMode(ProjectionMode)`
- `LabelLayer` — CSS2D star-name labels
- `HoverLayer` — distance line + CSS2D distance label shown on star hover

Each layer implements `SceneLayer` (`build / setVisible / dispose`).

**Coordinate convention** (IAU J2000 galactic frame, 1 unit = 1 parsec):  
`Star.gx` → galactic centre · `Star.gy` → galactic north pole (Three.js Y / "up") · `Star.gz` → completes frame.  
The equatorial→galactic rotation is applied once in `process_hyg.py` and stored in `stars.json` — no runtime coordinate math.

**`src/data/groupSystems.ts`** — pure function `groupIntoSystems(stars)`. Collapses HYG component rows into `StarSystem` entities using union-find (Gliese root, name stem, proximity rules). `buildSystem` reads `gx/gy/gz` directly for the centroid.

**`src/data/SystemStore.ts`** — observable store. Holds `systems` array and `origin` (current viewpoint system). Call `store.setOrigin(id)` to re-centre the map; `StarMap` subscribes via `store.onOriginChange()`.

**`src/types/star.ts`** — `Star` interface matching the JSON schema produced by `process_hyg.py`.

**`src/types/bobiverse.ts`** — `BobiverseSystem`, `Bob`, `Civilization`, `Ship` interfaces for Phase 2+ overlays. Not yet rendered.

**`public/data/stars.json`** — auto-generated from HYG; do not edit manually. `public/data/systems.json` — hand-maintained Bobiverse system info; edit freely, always include `notes` with book/chapter source.

## Phased roadmap context

Phase 1 (star map) is complete and includes interactive features:
- Click a star → `store.setOrigin(id)` re-centres the map
- Hover a star → `HoverLayer` shows a distance line + distance label
- Radius slider (5–20 ly) calls `starMap.setVisibleSystems()` via `applyFilter()` in `main.ts`
- Star class legend (bottom-right corner of `index.html`)
- Origin info panel (top-left, wired in `main.ts` via `store.onOriginChange`)

Phase 2 integration points remain (TODO comments in the code):
- `loader.ts`: `loadSystems()` and `loadBobs()` stubs
- `bobiverse.ts`: types are defined but not rendered yet

GitHub Pages deploy is live at `bobmap.pixelmatter.org`.
