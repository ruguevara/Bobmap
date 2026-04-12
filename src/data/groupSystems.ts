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
 * Transform HYG equatorial Cartesian (x,y,z in parsecs) into the IAU J2000
 * galactic frame used by `StarSystem.galacticPos`.
 *
 *   X → toward galactic centre (Sgr A*)
 *   Y → galactic north pole ("up")
 *   Z → completes a right-handed frame
 */
export function toGalactic(hx: number, hy: number, hz: number): { x: number; y: number; z: number } {
  // IAU J2000 equatorial → galactic rotation matrix
  const xg = -0.054876 * hx - 0.873437 * hy - 0.483835 * hz
  const yg =  0.494109 * hx - 0.444830 * hy + 0.746982 * hz
  const zg = -0.867666 * hx - 0.198076 * hy + 0.455984 * hz
  // Re-map so galactic north (zg) becomes Three.js Y (up).
  return { x: xg, y: zg, z: yg }
}

/**
 * Group stars into systems by spatial proximity.
 *
 * Two stars are considered components of the same system when their
 * squared Euclidean distance in parsecs is less than `epsilonPc²`.
 *
 * Default ε = 0.1 pc (~20 600 AU, ~0.33 ly) — a physically-motivated upper
 * bound for wide binaries. Verified against the HYG 20 ly slice: ε=0.1 pc
 * captures all real multiples (incl. α Cen AB–Proxima at Δ≈0.058 pc and
 * Keid AB–C at Δ≈0.059 pc) without merging any physically-unrelated systems.
 * A smaller ε around 0.05 pc would miss α Cen's triple nature.
 *
 * O(n²) over n stars — trivial up to a few thousand rows. Replace with a
 * spatial grid if the dataset grows.
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

  const eps2 = epsilonPc * epsilonPc
  for (let i = 0; i < n; i++) {
    const a = stars[i]
    for (let j = i + 1; j < n; j++) {
      const b = stars[j]
      const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z
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
    const g = toGalactic(c.x, c.y, c.z)
    sx += g.x; sy += g.y; sz += g.z
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
 *    a. Primary's own `name` if set.
 *    b. Any component's `name` (for systems like Sirius where only the
 *       primary carries the name on one of its components).
 *    c. Primary's `bf` (Bayer/Flamsteed).
 *    d. `stripComponentSuffix(primary.gl)` — e.g. "Gl 559A" → "Gl 559".
 *    e. null.
 * 2. Append ` ×N` iff there are ≥2 components.
 */
export function deriveSystemLabel(components: Star[]): string | null {
  const primary = components[0]

  let base: string | null = null
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
    }
  }

  if (base === null) return null
  if (components.length > 1) return `${base} ×${components.length}`
  return base
}

/**
 * Strip a trailing component letter from a Gliese designation.
 * "Gl 559A" → "Gl 559"   "GJ 1245B" → "GJ 1245"
 * Leaves inputs without a trailing A/B/C untouched.
 */
export function stripComponentSuffix(gl: string): string {
  return gl.replace(/([A-C])$/, '').trimEnd()
}
