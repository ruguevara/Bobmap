import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages: set to '/bobiverse-star-map/' if deploying to a subpath
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
