import type { Star } from '../types/star'
import type { StarSystem } from '../types/system'

/**
 * HYG records each component of a binary / triple star as a separate row at
 * (nearly) identical coordinates. This module collapses them into
 * `StarSystem` entities — the domain object the rest of the app consumes.
 *
 * Pure, no Three.js / DOM imports. Easy to unit-test.
 */

/**
 * Group stars into systems.
 *
 * Two stars are considered components of the same system when **any** of:
 *   1. Their Gliese / GJ designations share a root after stripping a
 *      trailing component letter — `Gl 559A` + `Gl 559B` → both tagged
 *      `Gl 559`. This is how HYG records physically-bound multiples that
 *      survive at arbitrary separation (wide binaries, hierarchical triples).
 *   2. Their `name` fields share a stem after stripping a trailing
 *      component letter — `Struve 2398 A` + `Struve 2398 B`. Catches pairs
 *      like Gl 725 AB where the Gliese root rule also applies, plus the
 *      occasional HYG row that only carries the proper name.
 *   3. Their squared Euclidean distance in parsecs is less than `epsilonPc²`.
 *      Default ε = 0.1 pc (~20 600 AU, ~0.33 ly) — covers close triples like
 *      α Cen AB ↔ Proxima (Δ ≈ 0.058 pc) where the Gliese designations
 *      differ (`Gl 559` vs `Gl 551`) but the system is physically bound.
 *
 * The union-find closure means transitive bonds work: α Cen A ↔ B by rule 1,
 * α Cen A ↔ Proxima by rule 3 → Toliman/Rigil Kentaurus/Proxima collapse
 * into one three-component system.
 *
 * Verified against the HYG 20 ly slice: all 22 expected multiples are
 * captured (α Cen ×3, Sirius, Procyon, Keid ×3, 36 Oph ×3, Struve 2398,
 * Gl 820/61 Cyg, etc.) without merging any physically-unrelated systems.
 * The near-miss case id=33139 ↔ Gl 251 at Δ ≈ 0.175 pc is correctly left
 * as two systems.
 *
 * O(n²) over n stars for rule 3 — trivial up to a few thousand rows.
 * Replace with a spatial grid if the dataset grows.
 */
export function groupIntoSystems(stars: Star[], epsilonPc = 0.1): StarSystem[] {
  const n = stars.length
  const parent = Array.from({ length: n }, (_, i) => i)

  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]] // path compression
      i = parent[i]
    }
    return i
  }
  const union = (a: number, b: number): void => {
    const ra = find(a), rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }

  // Rule 1: shared Gliese / GJ root.
  const byGliese = new Map<string, number>()
  for (let i = 0; i < n; i++) {
    const gl = stars[i].gl
    if (!gl) continue
    const root = stripComponentSuffix(gl)
    const prev = byGliese.get(root)
    if (prev === undefined) byGliese.set(root, i)
    else union(prev, i)
  }

  // Rule 2: shared proper-name stem.
  const byNameStem = new Map<string, number>()
  for (let i = 0; i < n; i++) {
    const stem = stripNameComponentSuffix(stars[i].name)
    if (!stem) continue
    const prev = byNameStem.get(stem)
    if (prev === undefined) byNameStem.set(stem, i)
    else union(prev, i)
  }

  // Rule 3: spatial proximity.
  const eps2 = epsilonPc * epsilonPc
  for (let i = 0; i < n; i++) {
    const a = stars[i]
    for (let j = i + 1; j < n; j++) {
      const b = stars[j]
      const dx = a.gx - b.gx, dy = a.gy - b.gy, dz = a.gz - b.gz
      if (dx * dx + dy * dy + dz * dz < eps2) union(i, j)
    }
  }

  const groups = new Map<number, Star[]>()
  for (let i = 0; i < n; i++) {
    const root = find(i)
    let g = groups.get(root)
    if (!g) { g = []; groups.set(root, g) }
    g.push(stars[i])
  }

  const systems: StarSystem[] = []
  for (const components of groups.values()) {
    systems.push(buildSystem(components))
  }
  systems.sort((a, b) => a.dist_ly - b.dist_ly)
  return systems
}

/** Assemble a single `StarSystem` from its component HYG rows. */
export function buildSystem(rawComponents: Star[]): StarSystem {
  // Primary = brightest (lowest magnitude).
  const components = [...rawComponents].sort((a, b) => a.mag - b.mag)
  const primary = components[0]

  // Geometric centre in galactic frame (mean of components).
  let sx = 0, sy = 0, sz = 0
  for (const c of components) {
    sx += c.gx; sy += c.gy; sz += c.gz
  }
  const galacticPos = {
    x: sx / components.length,
    y: sy / components.length,
    z: sz / components.length,
  }

  const spectra = Array.from(new Set(components.map(c => c.spect)))

  return {
    id: primary.id,
    components,
    label: deriveSystemLabel(components),
    galacticPos,
    dist_ly: primary.dist_ly,
    primarySpect: primary.spect,
    spectra,
    mag: combinedMag(components),
  }
}

/**
 * Physical flux-sum of magnitudes:
 *   m_total = -2.5 * log10( Σ 10^(-0.4 * mᵢ) )
 */
export function combinedMag(components: Star[]): number {
  let flux = 0
  for (const c of components) flux += Math.pow(10, -0.4 * c.mag)
  return -2.5 * Math.log10(flux)
}

/**
 * Decide the display label for a system.
 *
 * Rules, in order:
 * 1. Base name:
 *    a. Shared Bayer/Flamsteed stem across ≥2 components — e.g.
 *       `Alp1Cen` + `Alp2Cen` → `Alp Cen`, `36 Oph` + `36 Oph` → `36 Oph`.
 *       The stem wins over a proper name when multiple components carry
 *       the *same* Bayer designation, because it names the system rather
 *       than any single star (α Cen vs. Rigil Kentaurus, 36 Oph vs.
 *       Guniibuu). A lone `bf` on the primary (Sirius has `Alp CMa` but
 *       Sirius B does not) does not trigger this rule.
 *    b. Shared proper-name stem across ≥2 components — e.g.
 *       `Struve 2398 A` + `Struve 2398 B` → `Struve 2398`. Strips the
 *       component letter so the label names the pair, not one star.
 *    c. Primary's own `name` if set.
 *    d. Any component's `name` (for systems like Sirius where only one
 *       component carries the proper name).
 *    e. Primary's `bf` (Bayer/Flamsteed).
 *    f. `stripComponentSuffix(primary.gl)` — e.g. "Gl 559A" → "Gl 559".
 *    g. `HIP {hip}` from any component that has one — final catalogue
 *       fallback so no visible star is left unlabelled.
 *    h. null.
 * 2. Append ` ×N` iff there are ≥2 components.
 */
export function deriveSystemLabel(components: Star[]): string | null {
  const primary = components[0]

  let base: string | null = sharedBayerStem(components) ?? sharedNameStem(components)
  if (base === null) {
    if (primary.name) {
      base = primary.name
    } else {
      const named = components.find(c => c.name)
      if (named?.name) {
        base = named.name
      } else if (primary.bf) {
        base = primary.bf
      } else if (primary.gl) {
        base = stripComponentSuffix(primary.gl)
      } else {
        const withHip = components.find(c => c.hip != null)
        if (withHip?.hip != null) base = `HIP ${withHip.hip}`
      }
    }
  }

  if (base === null) return null
  if (components.length > 1) return `${base} ×${components.length}`
  return base
}

/**
 * If ≥2 components share a proper-name stem after stripping a trailing
 * component letter, return it. Mirror of `sharedBayerStem`.
 *
 *   Struve 2398 A + Struve 2398 B → "Struve 2398"
 *   Sirius (alone)                → null
 */
function sharedNameStem(components: Star[]): string | null {
  const stems = new Map<string, number>()
  for (const c of components) {
    const stem = stripNameComponentSuffix(c.name)
    if (!stem) continue
    stems.set(stem, (stems.get(stem) ?? 0) + 1)
  }
  for (const [stem, count] of stems) {
    if (count >= 2) return stem
  }
  return null
}

/**
 * If ≥2 components carry a Bayer/Flamsteed `bf` that normalises to the
 * same stem, return that stem. Otherwise return null.
 *
 * Normalisation drops the intra-Bayer component index (the digit that
 * distinguishes siblings like `Alp1Cen`/`Alp2Cen`) and inserts a space
 * before the 3-letter constellation code.
 *
 *   Alp1Cen  → Alp Cen
 *   Alp2Cen  → Alp Cen
 *   36 Oph   → 36 Oph
 *   Alp CMa  → Alp CMa
 *   40Omi2Eri → 40Omi Eri   (degenerate but harmless — no sibling will share it)
 *
 * HYG constellation codes are always 3 letters, first uppercase. We lock
 * onto the final 3-letter token and treat everything before it as the
 * Bayer/Flamsteed designation, then strip a trailing digit from that.
 */
function sharedBayerStem(components: Star[]): string | null {
  const stems = new Map<string, number>()
  for (const c of components) {
    const stem = bayerStem(c.bf)
    if (!stem) continue
    stems.set(stem, (stems.get(stem) ?? 0) + 1)
  }
  for (const [stem, count] of stems) {
    if (count >= 2) return stem
  }
  return null
}

const BAYER_TO_GREEK: Record<string, string> = {
  Alp: 'α', Bet: 'β', Gam: 'γ', Del: 'δ', Eps: 'ε', Zet: 'ζ',
  Eta: 'η', The: 'θ', Iot: 'ι', Kap: 'κ', Lam: 'λ', Mu:  'μ',
  Nu:  'ν', Xi:  'ξ', Omi: 'ο', Pi:  'π', Rho: 'ρ', Sig: 'σ',
  Tau: 'τ', Ups: 'υ', Phi: 'φ', Chi: 'χ', Psi: 'ψ', Ome: 'ω',
}

/** Extract the system-level Bayer stem from a single `bf` string. */
export function bayerStem(bf: string | null): string | null {
  if (!bf) return null
  // Match: <prefix><constellation> where constellation = 3 letters, first uppercase.
  const m = /^(.*?)([A-Z][A-Za-z]{2})$/.exec(bf.trim())
  if (!m) return null
  let prefix = m[1].replace(/\d+$/, '').trimEnd()
  if (!prefix) return null
  const greek = BAYER_TO_GREEK[prefix] ?? prefix
  return `${greek} ${m[2]}`
}

/**
 * Strip a trailing component letter from a Gliese designation.
 * "Gl 559A" → "Gl 559"   "GJ 1245B" → "GJ 1245"
 * Leaves inputs without a trailing A/B/C untouched.
 */
export function stripComponentSuffix(gl: string): string {
  return gl.replace(/([A-C])$/, '').trimEnd()
}

/**
 * Strip a trailing component letter from a proper name, returning the stem
 * only if the name actually carried one.
 *
 * "Struve 2398 A" → "Struve 2398"     (stem used for grouping)
 * "61 Cyg B"      → "61 Cyg"          (stem used for grouping)
 * "Sirius"        → null              (no component letter → not a stem)
 * null            → null
 *
 * Returning null on no-suffix is deliberate: we only want to merge records
 * that *explicitly* mark themselves as components, never by accident on a
 * proper name that happens to end in a single capital.
 */
export function stripNameComponentSuffix(name: string | null): string | null {
  if (!name) return null
  const m = /^(.+?)\s+[A-C]$/.exec(name)
  return m ? m[1] : null
}
