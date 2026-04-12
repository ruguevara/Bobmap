import * as THREE from 'three'

/** Projection modes for layers that map 3-D positions onto a reference plane. */
export type ProjectionMode = 'vertical'

/**
 * Common contract for all scene layers.
 *
 * Each layer owns one or more Three.js objects and adds them to `parent` in
 * `build()`. It never touches anything outside its own objects.
 */
export interface SceneLayer {
  /** Add this layer's objects to `parent`. Must be called exactly once. */
  build(parent: THREE.Object3D): void

  /** Show or hide this layer without disposing geometry. */
  setVisible(visible: boolean): void

  /** Remove all objects from the parent and free GPU memory. */
  dispose(): void
}
