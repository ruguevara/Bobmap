import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { Star } from '../types/star'

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
 * Coordinate convention (from HYG):
 *   x → vernal equinox (RA 0h, Dec 0°)
 *   y → RA 6h, Dec 0°
 *   z → north celestial pole
 *
 * We map HYG z → Three.js Y ("up") so the galactic plane
 * is roughly horizontal in the default view.
 * Units: 1 Three.js unit = 1 parsec.
 */
export class StarMap {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private labelRenderer: CSS2DRenderer
  private controls: OrbitControls
  private animId: number | null = null

  // TODO Phase 2: separate group for Bobiverse overlays
  // private overlayGroup = new THREE.Group()

  constructor(private container: HTMLElement) {
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

    this.addGrid()
    this.addSol()

    window.addEventListener('resize', this.onResize)
    this.animate()
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  loadStars(stars: Star[]): void {
    const positions: number[] = []
    const colors: number[] = []
    const col = new THREE.Color()

    for (const s of stars) {
      if (s.dist_ly === 0) continue // Sol rendered separately
      const x = s.x, y = s.z, z = s.y // HYG z → Three.js Y
      positions.push(x, y, z)
      col.set(SPECTRAL_COLOR[s.spect] ?? SPECTRAL_COLOR.default)
      colors.push(col.r, col.g, col.b)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1.0,
      map: StarMap.makeStarTexture(),
      alphaTest: 0.01,
    })))

    // Faint vertical lines projecting each star down to the reference plane
    const linePositions: number[] = []
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i + 1], z = positions[i + 2]
      if (Math.abs(y) < 0.01) continue // skip stars on the plane
      linePositions.push(x, y, z)  // star position
      linePositions.push(x, 0, z)  // foot on plane
    }
    const projGeo = new THREE.BufferGeometry()
    projGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
    this.scene.add(new THREE.LineSegments(projGeo, new THREE.LineBasicMaterial({
      color: 0x4466aa,
      transparent: true,
      opacity: 0.7,
    })))

    // Star name labels for all named stars
    const addLabel = (text: string, x: number, y: number, z: number, color = 'rgba(180,210,255,0.85)') => {
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
      this.scene.add(obj)
    }

    // Sol label
    addLabel('Sol', 0, 0.35, 0, 'rgba(255,238,120,0.9)')

    for (const s of stars) {
      if (s.dist_ly === 0) continue
      const label = s.name ?? s.bf
      if (!label) continue
      // HYG→Three.js coord swap; offset label above star in Y
      const offset = 0.25 + s.dist_ly * 0.002
      addLabel(label, s.x, s.z + offset, s.y)
    }

    // TODO Phase 2: raycaster for hover/click labels
    // TODO Phase 3: rebuild Points when filters change
  }

  dispose(): void {
    if (this.animId !== null) cancelAnimationFrame(this.animId)
    window.removeEventListener('resize', this.onResize)
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
    this.container.removeChild(this.labelRenderer.domElement)
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  /** Sol: bright yellow disk at origin */
  private addSol(): void {
    const geo = new THREE.SphereGeometry(0.12, 16, 16)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffee44 })
    this.scene.add(new THREE.Mesh(geo, mat))

    // Soft glow ring
    const ringGeo = new THREE.RingGeometry(0.18, 0.28, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffee44,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    })
    this.scene.add(new THREE.Mesh(ringGeo, ringMat))
  }

  /** Faint reference grid on the celestial equatorial plane (HYG z=0) */
  private addGrid(): void {
    const grid = new THREE.GridHelper(120, 30, 0x2a2a5a, 0x1a1a3a)
    this.scene.add(grid)

    // 10 ly and 25 ly reference circles (approximate: 1 pc ≈ 3.26 ly)
    for (const radiusLy of [10, 25, 50, 100]) {
      const radiusPc = radiusLy / 3.26156
      const circle = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 64 }, (_, i) => {
            const a = (i / 64) * Math.PI * 2
            return new THREE.Vector3(Math.cos(a) * radiusPc, 0, Math.sin(a) * radiusPc)
          }),
        ),
        new THREE.LineBasicMaterial({ color: 0x2233aa, transparent: true, opacity: 0.7 }),
      )
      this.scene.add(circle)
    }
  }

  /** Generate a soft circular disk texture for star points */
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
