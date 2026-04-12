import { StarMap } from './scene/StarMap'
import { loadStars } from './data/loader'
import { groupIntoSystems } from './data/groupSystems'
import { SystemStore } from './data/SystemStore'

const container = document.getElementById('app')!
const statusEl = document.getElementById('status')!

loadStars()
  .then(stars => {
    const systems = groupIntoSystems(stars)
    const store = new SystemStore(systems, /* origin = Sol */ 0)
    new StarMap(container, store)
    statusEl.textContent = `${systems.length} systems · ${stars.length} stars · <20 ly`

    // Expose for devtools smoke-testing (origin change, spectral filter).
    // TODO: remove once Phase 2 raycaster UI exists.
    ;(window as unknown as { __store: SystemStore }).__store = store
  })
  .catch(err => {
    console.error(err)
    statusEl.textContent = 'Error loading star data'
  })
