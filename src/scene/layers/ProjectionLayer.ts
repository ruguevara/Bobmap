// src/scene/layers/ProjectionLayer.ts
import * as THREE from 'three'
import type { SceneLayer, ProjectionMode } from './SceneLayer'
import type { StarSystem } from '../../types/system'

export class ProjectionLayer implements SceneLayer {
  private segments: THREE.LineSegments | null = null
  private parent: THREE.Object3D | null = null
  private floorY = 0

  constructor(
    private systems: readonly StarSystem[],
    /** Which projection to draw. Currently only 'vertical' is implemented. */
    public mode: ProjectionMode = 'vertical',
  ) {}

  build(parent: THREE.Object3D): void {
    this.parent = parent
    this.segments = this.buildVertical(this.systems)
    parent.add(this.segments)
  }

  setVisible(visible: boolean): void {
    if (this.segments) this.segments.visible = visible
  }

  /** Update the plane floor to match the current origin's galactic Y, then rebuild lines. */
  setOrigin(origin: StarSystem): void {
    this.floorY = origin.galacticPos.y
    if (!this.parent || !this.segments) return
    this.parent.remove(this.segments)
    this.segments.geometry.dispose()
    this.segments = this.buildVertical(this.systems)
    this.parent.add(this.segments)
  }

  /** Replace displayed lines with a new mode without full rebuild. */
  setMode(mode: ProjectionMode): void {
    this.mode = mode
    if (!this.parent || !this.segments) return
    this.parent.remove(this.segments)
    this.segments.geometry.dispose()
    this.segments = this.buildVertical(this.systems)
    this.parent.add(this.segments)
  }

  dispose(): void {
    if (this.segments) {
      this.parent?.remove(this.segments)
      this.segments.geometry.dispose()
      this.segments = null
    }
  }

  private buildVertical(systems: readonly StarSystem[]): THREE.LineSegments {
    const positions: number[] = []
    const floor = this.floorY
    for (const s of systems) {
      const { x, y, z } = s.galacticPos
      if (Math.abs(y - floor) < 0.01) continue
      positions.push(x, y, z, x, floor, z)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({
        color: 0x4466aa,
        transparent: true,
        opacity: 0.7,
      }),
    )
  }
}
