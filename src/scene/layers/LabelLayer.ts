// src/scene/layers/LabelLayer.ts
import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { SceneLayer } from './SceneLayer'
import type { StarSystem } from '../../types/system'

export class LabelLayer implements SceneLayer {
  private objects: CSS2DObject[] = []
  private parent: THREE.Object3D | null = null

  constructor(private systems: readonly StarSystem[]) {}

  build(parent: THREE.Object3D): void {
    this.parent = parent
    for (const s of this.systems) {
      if (!s.label) continue
      const offset = 0.25 + s.dist_ly * 0.002
      const color =
        s.id === 0 ? 'rgba(255,238,120,0.9)' : 'rgba(180,210,255,0.85)'
      const obj = this.makeLabel(s.label, color)
      obj.position.set(s.galacticPos.x, s.galacticPos.y + offset, s.galacticPos.z)
      parent.add(obj)
      this.objects.push(obj)
    }
  }

  setVisible(visible: boolean): void {
    for (const obj of this.objects) obj.visible = visible
  }

  dispose(): void {
    for (const obj of this.objects) this.parent?.remove(obj)
    this.objects = []
  }

  private makeLabel(text: string, color: string): CSS2DObject {
    const div = document.createElement('div')
    div.textContent = text
    div.style.cssText = [
      `color: ${color}`,
      'font-size: 10px',
      'font-family: monospace',
      'pointer-events: none',
      'padding: 0 2px',
      'text-shadow: 0 0 5px #000, 0 0 5px #000',
      'white-space: nowrap',
    ].join(';')
    return new CSS2DObject(div)
  }
}
