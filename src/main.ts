import { StarMap } from './scene/StarMap'
import { loadStars } from './data/loader'

const container = document.getElementById('app')!
const statusEl = document.getElementById('status')!

const map = new StarMap(container)

loadStars()
  .then(stars => {
    map.loadStars(stars)
    statusEl.textContent = `${stars.length} stars · <100 ly`
  })
  .catch(err => {
    console.error(err)
    statusEl.textContent = 'Error loading star data'
  })
