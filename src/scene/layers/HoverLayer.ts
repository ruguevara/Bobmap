import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { SceneLayer } from './SceneLayer'
import type { StarSystem } from '../../types/system'

export class HoverLayer implements SceneLayer {
  private line: THREE.Line | null = null
  private label: CSS2DObject | null = null
  private parent: THREE.Object3D | null = null

  build(parent: THREE.Object3D): void {
    this.parent = parent

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3))
    this.line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.6 }),
    )
    this.line.visible = false
    parent.add(this.line)

    const div = document.createElement('div')
    div.style.cssText =
      'color:#44ffaa;font-size:10px;font-family:monospace;pointer-events:none;white-space:nowrap;text-shadow:0 0 5px #000,0 0 5px #000'
    this.label = new CSS2DObject(div)
    this.label.visible = false
    parent.add(this.label)
  }

  /** Update the line and label for the hovered system relative to the current origin. */
  setHover(system: StarSystem | null, origin: StarSystem): void {
    if (!this.line || !this.label) return
    if (!system || system.id === origin.id) {
      this.line.visible = false
      this.label.visible = false
      return
    }

    const { x, y, z } = system.galacticPos
    const ox = origin.galacticPos.x
    const oy = origin.galacticPos.y
    const oz = origin.galacticPos.z

    // worldGroup is translated by -origin, so absolute galactic coords work as-is.
    const pos = this.line.geometry.attributes['position'] as THREE.BufferAttribute
    pos.setXYZ(0, ox, oy, oz)
    pos.setXYZ(1, x, y, z)
    pos.needsUpdate = true

    this.label.position.set((ox + x) / 2, (oy + y) / 2, (oz + z) / 2)

    const dx = x - ox, dy = y - oy, dz = z - oz
    const distLy = Math.sqrt(dx * dx + dy * dy + dz * dz) * 3.26156
    ;(this.label.element as HTMLElement).textContent = `${distLy.toFixed(2)} ly`

    this.line.visible = true
    this.label.visible = true
  }

  setVisible(visible: boolean): void {
    if (this.line) this.line.visible = visible
    if (this.label) this.label.visible = visible
  }

  dispose(): void {
    if (this.line) {
      this.parent?.remove(this.line)
      this.line.geometry.dispose()
      ;(this.line.material as THREE.LineBasicMaterial).dispose()
      this.line = null
    }
    if (this.label) {
      this.parent?.remove(this.label)
      this.label = null
    }
  }
}
