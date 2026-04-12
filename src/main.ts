import { StarMap } from './scene/StarMap'
import { loadStars } from './data/loader'
import { groupIntoSystems } from './data/groupSystems'
import { SystemStore } from './data/SystemStore'
import type { StarSystem } from './types/system'

const container = document.getElementById('app')!
const statusEl = document.getElementById('status')!
const slider = document.getElementById('dist-slider') as HTMLInputElement
const distValueEl = document.getElementById('dist-value')!

loadStars()
  .then(stars => {
    const systems = groupIntoSystems(stars)
    const store = new SystemStore(systems, /* origin = Sol */ 0)
    const starMap = new StarMap(container, store)

    let currentMaxLy = Number(slider.value)

    const applyFilter = (): void => {
      const origin = store.origin
      const filtered = store.filter(s => {
        const dx = s.galacticPos.x - origin.galacticPos.x
        const dy = s.galacticPos.y - origin.galacticPos.y
        const dz = s.galacticPos.z - origin.galacticPos.z
        const distLy = Math.sqrt(dx * dx + dy * dy + dz * dz) * 3.26156
        return distLy <= currentMaxLy
      })
      starMap.setVisibleSystems(filtered)
      distValueEl.textContent = `${currentMaxLy} ly`
      statusEl.textContent = `${filtered.length} systems · ${stars.length} stars · <${currentMaxLy} ly`
    }

    slider.addEventListener('input', () => {
      currentMaxLy = Number(slider.value)
      applyFilter()
    })

    store.onOriginChange(() => applyFilter())

    const originNameEl = document.getElementById('origin-name')!
    const originDetailsEl = document.getElementById('origin-details')!

    const updateOriginPanel = (sys: StarSystem): void => {
      originNameEl.textContent = sys.label ?? `HIP ${sys.id}`
      originDetailsEl.innerHTML = [
        `${sys.dist_ly.toFixed(2)} ly from Sol`,
        `Type: ${sys.primarySpect}`,
        sys.components.length > 1 ? `${sys.components.length} components` : '',
      ].filter(Boolean).join('<br>')
    }

    updateOriginPanel(store.origin)
    store.onOriginChange(updateOriginPanel)
    applyFilter()
  })
  .catch(err => {
    console.error(err)
    statusEl.textContent = 'Error loading star data'
  })
