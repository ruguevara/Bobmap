import type { StarSystem } from '../types/system'

/**
 * Typed facade over the in-memory star-system collection.
 *
 * The interface is deliberately shaped so that swapping the backend to
 * LokiJS (or sql.js, or whatever) later is a local change in this file:
 *
 *   getById(id)     ↔  coll.by('id', id)
 *   filter(pred)    ↔  coll.where(pred) / dynamic view
 *   snapshotAt(y)   ↔  timeline-aware dynamic view
 *
 * For ~100 systems and the queries we actually need today (origin, filter,
 * getById, observers), a hand-rolled Map + Array is strictly simpler than
 * pulling in a document database. We'll revisit once dynamic views or
 * multi-collection joins earn their keep.
 */
export class SystemStore {
  private readonly byId = new Map<number, StarSystem>()
  private readonly list: StarSystem[]
  private originId: number
  private readonly observers = new Set<(origin: StarSystem) => void>()

  constructor(systems: StarSystem[], initialOriginId = 0) {
    this.list = [...systems]
    for (const s of systems) this.byId.set(s.id, s)
    if (!this.byId.has(initialOriginId)) {
      throw new Error(`SystemStore: initial origin id ${initialOriginId} not found`)
    }
    this.originId = initialOriginId
  }

  // ── Queries ────────────────────────────────────────────────────────────

  get origin(): StarSystem {
    return this.byId.get(this.originId)!
  }

  get all(): readonly StarSystem[] {
    return this.list
  }

  getById(id: number): StarSystem | undefined {
    return this.byId.get(id)
  }

  filter(pred: (s: StarSystem) => boolean): StarSystem[] {
    return this.list.filter(pred)
  }

  /**
   * Temporal-query placeholder. When Bobiverse data (ships / Bobs / events)
   * arrives, this returns a store scoped to the state-of-the-world at `year`.
   * Today it's a pass-through so callers can already be written in the
   * intended form: `store.snapshotAt(year).filter(...)`.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  snapshotAt(_year: number): SystemStore {
    return this
  }

  // ── Mutation ───────────────────────────────────────────────────────────

  /** Re-center the map on a different system. Notifies subscribers. */
  setOrigin(id: number): void {
    if (id === this.originId) return
    if (!this.byId.has(id)) {
      throw new Error(`SystemStore: unknown system id ${id}`)
    }
    this.originId = id
    const origin = this.origin
    for (const cb of this.observers) cb(origin)
  }

  /**
   * Subscribe to origin changes. Returns an unsubscribe function.
   * `StarMap` uses this to translate its world group without owning
   * origin state itself.
   */
  onOriginChange(cb: (origin: StarSystem) => void): () => void {
    this.observers.add(cb)
    return () => { this.observers.delete(cb) }
  }
}
