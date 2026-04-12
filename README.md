# Bobiverse Star Map

Interactive 3D map of stellar systems from the *Bobiverse* book series by Dennis E. Taylor.  
A fan project — reference and illustration for readers.

**Live demo:** https://bobmap.pixelmatter.org

_AI assistance provided by GUPPI (General Unit Primary Peripheral Interface)._

---

## Stack

| Layer | Technology |
|---|---|
| 3D scene | [Three.js](https://threejs.org) |
| Language | TypeScript |
| Build | [Vite](https://vitejs.dev) |
| Star data | [HYG Database v3.7](https://github.com/astronexus/HYGDatabase) |
| Bobiverse data | Hand-maintained JSON files in `public/data/` |
| Deploy | GitHub Pages via GitHub Actions |

---

## Quick start

```bash
npm install
npm run dev
# open http://localhost:5173
```

**Controls:** drag to rotate · scroll to zoom · right-drag to pan

---

## Star data

The repository ships with `public/data/stars.json` (~110 nearest stars, ≤ 20 ly).  
Coordinates are pre-rotated into the IAU J2000 galactic frame by `process_hyg.py`.

To regenerate from the full HYG catalogue:

```bash
# 1. Download HYG catalogue (not committed — large file)
curl -L https://www.astronexus.com/downloads/catalogs/hygdata_v37.csv.gz | gunzip > hygdata_v37.csv

# 2. Run the conversion script
python3 scripts/process_hyg.py hygdata_v37.csv public/data/stars.json --max-ly 20

# Optional: larger radius
python3 scripts/process_hyg.py hygdata_v37.csv public/data/stars.json --max-ly 50
```

---

## Architecture

```
src/
  main.ts               Entry point — loads data, boots StarMap
  scene/
    StarMap.ts          Three.js scene orchestrator (camera, renderer, controls)
    layers/
      SceneLayer.ts     Shared interface + ProjectionMode type
      GridLayer.ts      Reference grid + light-year radius circles
      ProjectionLayer.ts  Vertical drop lines to the galactic plane
      LabelLayer.ts     CSS2D star-name labels
  data/
    loader.ts           Async fetch of stars.json
    groupSystems.ts     Groups HYG star rows into StarSystem entities
    SystemStore.ts      Observable store — holds systems + current origin
  types/
    star.ts             Star interface (galactic coords gx/gy/gz, pre-rotated)
    system.ts           StarSystem interface
    bobiverse.ts        Phase 2+ overlay types (not yet rendered)

public/data/
  stars.json            Auto-generated from HYG. Do not edit manually.
  systems.json          Bobiverse-specific system info. Edit freely!

scripts/
  process_hyg.py        HYG CSV → stars.json (applies equatorial→galactic rotation)
```

**Coordinate convention (IAU J2000 galactic frame, 1 unit = 1 parsec):**  
`gx` → toward galactic centre (Sgr A*) · `gy` → galactic north pole (Three.js Y) · `gz` → completes the frame

---

## Data files

### Contributing Bobiverse data

You don't need to know TypeScript. Edit `public/data/systems.json` directly:

```json
{
  "star_hip": 16537,
  "book_name": "Epsilon Eridani",
  "first_visit_year": 2189,
  "bob_ids": ["Riker"],
  "notes": "First alien contact. Source: book 2, ch. 14."
}
```

Find `star_hip` values in `public/data/stars.json` (the `hip` field).  
Always add a `notes` with a book/chapter source so it can be verified.

---

## Roadmap

### Phase 1 — Star map ✦ _current_
- [x] Project skeleton (Vite + TypeScript + Three.js)
- [x] HYG processing script with equatorial→galactic rotation
- [x] Stars coloured by spectral class
- [x] OrbitControls (rotate / zoom / pan)
- [x] Sol highlighted
- [x] Star name labels (CSS2D, named systems ≤ 20 ly)
- [x] Multi-star systems grouped (binaries, triples) with component count
- [x] Vertical projection lines to galactic plane
- [x] Scene layers extracted (Grid, Projection, Labels) — individually toggleable
- [x] GitHub Pages deploy

### Phase 2 — Bobiverse overlay
- [ ] Render named systems from `systems.json`
- [ ] Click star → info panel (name, distance, Bobs, notes)
- [ ] Highlight Bobiverse systems vs background stars

### Phase 3 — Filters
- [ ] Filter by spectral class (O B A F G K M)
- [ ] Filter by distance (slider)
- [ ] Search by star name
- [ ] Toggle: show all stars / only named systems

### Phase 4 — Timeline
- [ ] Year slider (in-universe time)
- [ ] Bob positions at selected year
- [ ] Ship trajectory lines

### Phase 5 — Dynamic objects
- [ ] Ships with animated positions
- [ ] Civilisation territory markers
- [ ] Event log synced to timeline

### Phase 6 — Polish
- [ ] `CONTRIBUTING.md` with full guide
- [ ] JSON schema validation in CI
- [ ] Mobile touch controls

---

## Contributing

Pull requests welcome! Please:
- Add a source (book title + chapter) for any canon data
- Keep one logical change per PR
- For data-only PRs you only need to edit files in `public/data/` — no TypeScript knowledge needed

---

## License

MIT — fan project, not affiliated with Dennis E. Taylor or the official Bobiverse franchise.
