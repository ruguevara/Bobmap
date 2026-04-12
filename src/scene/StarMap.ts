import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { StarSystem } from '../types/system'
import type { SystemStore } from '../data/SystemStore'
import { GridLayer } from './layers/GridLayer'
import { ProjectionLayer } from './layers/ProjectionLayer'

/** Harvard spectral class → approximate colour */
const SPECTRAL_COLOR: Record<string, number> = {
  O: 0x9bb0ff, // blue
  B: 0xaabfff, // blue-white
  A: 0xcad7ff, // white-blue
  F: 0xf8f7ff, // white
  G: 0xfff4ea, // yellow-white (Sol)
  K: 0xffd2a1, // orange
  M: 0xff9966, // red-orange
  default: 0xffffff,
}

/**
 * Three.js scene: interactive 3D star map.
 *
 * Consumes a `SystemStore` — never touches raw `Star` rows. The scene is
 * split into two groups:
 *
 *   worldGroup    — stars, labels, projection lines. Lives in
 *                   absolute galactic parsecs; translated by -origin on
 *                   every `setOrigin` so the current origin sits at (0,0,0).
 *   staticOverlay — grid and ly reference circles. Stay put, always
 *                   centred on (0,0,0), which is where the current origin
 *                   lives after worldGroup's translation.
 *
 * Axis convention (IAU J2000 galactic):
 *   Three.js X → toward galactic center (Sgr A*)
 *   Three.js Y → galactic north pole ("up")
 *   Three.js Z → completes the frame
 * Units: 1 Three.js unit = 1 parsec.
 */
export class StarMap {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private labelRenderer: CSS2DRenderer
  private controls: OrbitControls
  private animId: number | null = null

  private worldGroup: THREE.Group
  private staticOverlay: THREE.Group
  private unsubscribeOrigin: () => void
  private gridLayer: GridLayer
  private projectionLayer!: ProjectionLayer

  // TODO Phase 2: separate group for Bobiverse overlays

  constructor(private container: HTMLElement, store: SystemStore) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000008)

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.01,
      2000,
    )
    this.camera.position.set(0, 6, 14)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)

    this.labelRenderer = new CSS2DRenderer()
    this.labelRenderer.setSize(container.clientWidth, container.clientHeight)
    this.labelRenderer.domElement.style.position = 'absolute'
    this.labelRenderer.domElement.style.top = '0'
    this.labelRenderer.domElement.style.pointerEvents = 'none'
    container.appendChild(this.labelRenderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.minDistance = 0.5
    this.controls.maxDistance = 400

    this.worldGroup = new THREE.Group()
    this.staticOverlay = new THREE.Group()
    this.scene.add(this.worldGroup)
    this.scene.add(this.staticOverlay)

    this.gridLayer = new GridLayer()
    this.gridLayer.build(this.staticOverlay)
    this.buildWorld(store.all)
    this.applyOrigin(store.origin)

    this.unsubscribeOrigin = store.onOriginChange(origin => this.applyOrigin(origin))

    window.addEventListener('resize', this.onResize)
    this.animate()
  }

  dispose(): void {
    if (this.animId !== null) cancelAnimationFrame(this.animId)
    this.unsubscribeOrigin()
    window.removeEventListener('resize', this.onResize)
    this.gridLayer.dispose()
    this.projectionLayer.dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
    this.container.removeChild(this.labelRenderer.domElement)
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  /** Translate the world group so that `origin` sits at (0,0,0). */
  private applyOrigin(origin: StarSystem): void {
    const { x, y, z } = origin.galacticPos
    this.worldGroup.position.set(-x, -y, -z)
  }

  /** Build all per-system visuals in absolute galactic coords. */
  private buildWorld(systems: readonly StarSystem[]): void {
    const positions: number[] = []
    const colors: number[] = []
    const col = new THREE.Color()

    for (const s of systems) {
      positions.push(s.galacticPos.x, s.galacticPos.y, s.galacticPos.z)
      col.set(SPECTRAL_COLOR[s.primarySpect] ?? SPECTRAL_COLOR.default)
      colors.push(col.r, col.g, col.b)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    this.worldGroup.add(new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1.0,
      map: StarMap.makeStarTexture(),
      alphaTest: 0.01,
    })))

    this.projectionLayer = new ProjectionLayer(systems)
    this.projectionLayer.build(this.worldGroup)

    // Halo rings for multiple-component systems (billboarded sprites).
    // Disabled — too noisy. Re-enable when view-settings panel is wired up.
    // const haloTex = StarMap.makeHaloTexture()
    // const haloMat = new THREE.SpriteMaterial({
    //   map: haloTex,
    //   color: 0xaad4ff,
    //   transparent: true,
    //   opacity: 0.75,
    //   depthWrite: false,
    // })
    // for (const s of systems) {
    //   if (s.components.length < 2) continue
    //   const sprite = new THREE.Sprite(haloMat)
    //   sprite.position.set(s.galacticPos.x, s.galacticPos.y, s.galacticPos.z)
    //   sprite.scale.set(0.9, 0.9, 0.9)
    //   this.worldGroup.add(sprite)
    // }

    // Labels
    for (const s of systems) {
      if (!s.label) continue
      const offset = 0.25 + s.dist_ly * 0.002
      this.addLabel(
        s.label,
        s.galacticPos.x,
        s.galacticPos.y + offset,
        s.galacticPos.z,
        s.id === 0 ? 'rgba(255,238,120,0.9)' : 'rgba(180,210,255,0.85)',
      )
    }

    // TODO Phase 2: raycaster for hover/click — call store.setOrigin(s.id) on click
    // TODO Phase 3: rebuild world when filters change
  }

  private addLabel(text: string, x: number, y: number, z: number, color: string): void {
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
    const obj = new CSS2DObject(div)
    obj.position.set(x, y, z)
    this.worldGroup.add(obj)
  }

  /** Generate a soft circular disk texture for star points. */
  private static makeStarTexture(): THREE.CanvasTexture {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const r = size / 2
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.4, 'rgba(255,255,255,0.9)')
    grad.addColorStop(0.7, 'rgba(255,255,255,0.3)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(canvas)
  }

  /** Thin ring texture used as a halo around multi-component systems. */
  private static makeHaloTexture(): THREE.CanvasTexture {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, size, size)
    const cx = size / 2, cy = size / 2
    ctx.strokeStyle = 'rgba(255,255,255,1)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, size * 0.38, 0, Math.PI * 2)
    ctx.stroke()
    // Soft outer glow
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(cx, cy, size * 0.42, 0, Math.PI * 2)
    ctx.stroke()
    return new THREE.CanvasTexture(canvas)
  }

  private animate = (): void => {
    this.animId = requestAnimationFrame(this.animate)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    this.labelRenderer.render(this.scene, this.camera)
  }

  private onResize = (): void => {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.labelRenderer.setSize(w, h)
  }
}
