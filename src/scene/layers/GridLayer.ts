// src/scene/layers/GridLayer.ts
import * as THREE from 'three'
import type { SceneLayer } from './SceneLayer'

export interface GridLayerOptions {
  /** Grid half-extent in parsecs. Default 60 (= 120 pc span). */
  halfExtent?: number
  /** Number of grid divisions. Default 30. */
  divisions?: number
  /** ly radii for reference circles. Default [10, 25, 50, 100]. */
  radiusLy?: number[]
}

export class GridLayer implements SceneLayer {
  private objects: THREE.Object3D[] = []
  private parent: THREE.Object3D | null = null

  constructor(private options: GridLayerOptions = {}) {}

  build(parent: THREE.Object3D): void {
    this.parent = parent
    const {
      halfExtent = 60,
      divisions = 30,
      radiusLy = [10, 25, 50, 100],
    } = this.options

    const grid = new THREE.GridHelper(
      halfExtent * 2,
      divisions,
      0x2a2a5a,
      0x1a1a3a,
    )
    parent.add(grid)
    this.objects.push(grid)

    for (const ly of radiusLy) {
      const pc = ly / 3.26156
      const circle = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 64 }, (_, i) => {
            const a = (i / 64) * Math.PI * 2
            return new THREE.Vector3(
              Math.cos(a) * pc,
              0,
              Math.sin(a) * pc,
            )
          }),
        ),
        new THREE.LineBasicMaterial({
          color: 0x2233aa,
          transparent: true,
          opacity: 0.7,
        }),
      )
      parent.add(circle)
      this.objects.push(circle)
    }
  }

  setVisible(visible: boolean): void {
    for (const obj of this.objects) obj.visible = visible
  }

  dispose(): void {
    for (const obj of this.objects) {
      this.parent?.remove(obj)
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose()
    }
    this.objects = []
  }
}
