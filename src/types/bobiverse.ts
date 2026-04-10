/**
 * Bobiverse-specific data types.
 * These are maintained manually in data/systems.json, data/bobs.json, etc.
 *
 * TODO Phase 2: implement overlay rendering
 * TODO Phase 4: add timeline / dynamic positions
 */

/** A stellar system mentioned in the books */
export interface BobiverseSystem {
  /** Matches Star.hip or Star.id from stars.json */
  star_hip: number | null
  /** Display name used in the books (may differ from HYG) */
  book_name: string
  /** In-universe year of first Bob arrival (null = not yet visited) */
  first_visit_year: number | null
  /** IDs of Bobs that visited / colonised this system */
  bob_ids: string[]
  /** Notes visible on click */
  notes: string
}

/** A Bob (von Neumann probe / replicant) */
export interface Bob {
  /** Unique id, e.g. "Bob-1", "Riker", "Milo" */
  id: string
  /** Book display name */
  name: string
  /** HIP of origin system */
  origin_hip: number | null
  /** In-universe year of first activation */
  year_born: number
  status: 'active' | 'lost' | 'dead' | 'unknown'
  /** Ordered list of systems visited with arrival year */
  trajectory: Array<{ star_hip: number; year: number }>
}

/** A non-human civilisation */
export interface Civilization {
  id: string
  name: string
  /** HIP of home system */
  home_hip: number | null
  /** Systems under influence */
  territory_hips: number[]
  status: 'extinct' | 'active' | 'unknown'
  notes: string
}

/** A ship / probe */
export interface Ship {
  id: string
  name: string
  /** Owner Bob id */
  bob_id: string
  /** Position by in-universe year */
  positions: Array<{ year: number; star_hip: number }>
}

// TODO: Event type for the timeline
// export interface BobiverseEvent { ... }
