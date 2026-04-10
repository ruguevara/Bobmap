# Bobiverse Star Map

Interactive 3D map of stellar systems from the *Bobiverse* book series by Dennis E. Taylor.  
A fan project — reference and illustration for readers.

**Live demo:** _coming soon (GitHub Pages)_

---

## Stack

| Layer | Technology |
|---|---|
| 3D scene | [Three.js](https://threejs.org) |
| Language | TypeScript |
| Build | [Vite](https://vitejs.dev) |
| Star data | [HYG Database v3](https://github.com/astronexus/HYGDatabase) |
| Bobiverse data | Hand-maintained JSON files in `/data` |
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

The repository ships with a small sample (`data/stars.json`, ~25 nearest stars).  
To generate the full dataset (≈ 2 000 stars within 100 ly):

```bash
# 1. Download HYG catalogue (do NOT commit this file — it's in .gitignore)
curl -L https://raw.githubusercontent.com/astronexus/HYGDatabase/master/hygdata_v3.csv \
     -o hygdata_v3.csv

# 2. Run the conversion script
python3 scripts/process_hyg.py hygdata_v3.csv data/stars.json

# Optional: different radius
python3 scripts/process_hyg.py hygdata_v3.csv data/stars.json --max-ly 50
```

---

## Data files

```
data/
  stars.json       Auto-generated from HYG. Do not edit manually.
  systems.json     Bobiverse-specific system info. Edit freely!

  # planned (Phase 2+)
  bobs.json        Bob characters, origin, status, trajectory
  civilizations.json  Races and territories
  ships.json       Ships with positions by in-universe year
```

### Contributing Bobiverse data

You don't need to know TypeScript. Edit the JSON files directly:

**`data/systems.json`** — add a system:
```json
{
  "star_hip": 16537,
  "book_name": "Epsilon Eridani",
  "first_visit_year": 2189,
  "bob_ids": ["Riker"],
  "notes": "First alien contact. Source: book 2, ch. 14."
}
```

Find `star_hip` values in `data/stars.json` (the `hip` field).  
Always add a `notes` with a book/chapter source so it can be verified.

---

## Roadmap

### Phase 1 — Star map ✦ _current_
- [x] Project skeleton (Vite + TypeScript + Three.js)
- [x] Sample star data (25 nearest stars)
- [x] HYG processing script
- [ ] Full HYG dataset loaded and rendered (≤ 100 ly)
- [ ] Stars coloured by spectral class
- [ ] Orbit controls (rotate / zoom / pan)
- [ ] Sol highlighted
- [ ] Star name labels on hover / click

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

### Phase 6 — Polish & deploy
- [ ] GitHub Pages deploy via GitHub Actions
- [ ] `CONTRIBUTING.md` with full guide
- [ ] JSON schema validation in CI (so bad PRs are caught automatically)
- [ ] Mobile touch controls

---

## Contributing

Pull requests welcome! Please:
- Add a source (book title + chapter) for any canon data
- Keep one logical change per PR
- For data-only PRs you only need to edit files in `/data` — no TypeScript knowledge needed

---

## License

MIT — fan project, not affiliated with Dennis E. Taylor or the official Bobiverse franchise.
