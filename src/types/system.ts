import type { Star } from './star'

/**
 * A stellar system on the map: one visual entity that may contain one or
 * more gravitationally-bound HYG components (binaries, triples, …).
 *
 * Built by `groupIntoSystems` — see `src/data/groupSystems.ts`.
 *
 * Single stars are just systems with `components.length === 1`, so the
 * renderer has a single code path for everything — Sol included.
 */
export interface StarSystem {
  /** Stable id = HYG id of the primary (brightest) component. Sol has id = 0. */
  id: number

  /** All components, sorted brightest-first; `components[0]` is the primary. */
  components: Star[]

  /** Display label (e.g. "Sol", "Rigil Kentaurus ×3", "61 Cyg ×2"). */
  label: string | null

  /**
   * Position in the IAU J2000 galactic frame, parsecs, origin = Sol.
   * Pre-computed at grouping time so the renderer does no coordinate math.
   * Axis convention: X→galactic centre, Y→north pole, Z→completes the frame.
   */
  galacticPos: { x: number; y: number; z: number }

  /** HYG distance in light-years (from Sol) — historical fact, not recomputed. */
  dist_ly: number

  /** Spectral class of the primary — drives point colour. */
  primarySpect: string

  /** Deduplicated spectral classes across ALL components — drives filters. */
  spectra: string[]

  /** Flux-sum combined magnitude across components. */
  mag: number
}
