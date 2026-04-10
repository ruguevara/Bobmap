import type { Star } from '../types/star'

/**
 * Load the pre-processed HYG star catalogue from /data/stars.json.
 *
 * To regenerate stars.json from the full HYG CSV:
 *   python3 scripts/process_hyg.py hygdata_v3.csv data/stars.json
 */
export async function loadStars(): Promise<Star[]> {
  const res = await fetch('./data/stars.json')
  if (!res.ok) throw new Error(`Failed to load stars.json: ${res.status} ${res.statusText}`)
  return res.json() as Promise<Star[]>
}

// TODO Phase 2: loadSystems() → BobiverseSystem[]
// TODO Phase 4: loadBobs() → Bob[]
