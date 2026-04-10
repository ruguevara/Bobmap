#!/usr/bin/env node
/**
 * Headless screenshot of the Vite dev server.
 * Saves .debug/latest.png and prints any console errors to stdout.
 * Exit 1 if the app shows an error state.
 *
 * Usage: node scripts/screenshot.js [url]
 * Default url: http://localhost:5173
 */

import puppeteer from 'puppeteer'
import { mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT = resolve(ROOT, '.debug', 'latest.png')
const URL = process.argv[2] ?? 'http://localhost:5173'

mkdirSync(resolve(ROOT, '.debug'), { recursive: true })

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })

const consoleErrors = []
page.on('console', msg => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    consoleErrors.push(`[${msg.type()}] ${msg.text()}`)
  }
})

page.on('pageerror', err => {
  consoleErrors.push(`[pageerror] ${err.message}`)
})

let failed = false
try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 10000 })
} catch (e) {
  console.error(`Could not reach ${URL} — is npm run dev running?`)
  await browser.close()
  process.exit(1)
}

// Wait for canvas (success) or timeout (possible error)
try {
  await page.waitForSelector('canvas', { timeout: 5000 })
} catch {
  failed = true
}

// Check for error text in the page
const bodyText = await page.evaluate(() => document.body.innerText)
if (bodyText.toLowerCase().includes('error loading star data')) {
  failed = true
  consoleErrors.push('[app] "error loading star data" visible on screen')
}

await page.screenshot({ path: OUT })
await browser.close()

if (consoleErrors.length > 0) {
  console.log('Console output:')
  consoleErrors.forEach(e => console.log(' ', e))
}

console.log(`Screenshot saved: .debug/latest.png`)

if (failed) {
  process.exit(1)
}
