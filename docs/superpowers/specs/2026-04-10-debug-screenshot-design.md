# Debug & Screenshot Setup — Design Spec

**Date:** 2026-04-10
**Status:** Approved

## Problem

The app shows "error loading star data." because `loader.ts` fetches `./data/stars.json` (relative path), which fails when Vite serves the file at `/data/stars.json` (root-relative). Beyond the immediate bug, there is no automated feedback loop: when Claude edits source files, it has no visibility into whether the change broke or fixed the app.

## Goals

1. Fix the star data fetch failure.
2. After every source file edit, automatically take a screenshot of the running app and surface any browser console errors back into the conversation so Claude can self-correct.

## Out of Scope

- Live HMR watching / daemon mode
- Visual regression diffing between screenshots
- CI screenshot capture

---

## Architecture

Three pieces:

### 1. Fetch Path Fix

`src/data/loader.ts` line 10: change `./data/stars.json` → `/data/stars.json`.

Vite serves everything under `public/` and project-root directories from `/`. The relative path breaks when the page base is not `/` (e.g., nested routes or direct file open). The absolute path is always correct.

### 2. Screenshot Script — `scripts/screenshot.js`

A Node.js script using `puppeteer` (full package, bundled Chromium). Responsibilities:

- Navigate to `http://localhost:5173`
- Collect all `console.error` and `console.warn` messages
- Wait for either:
  - A `<canvas>` element to appear (success), or
  - 5 seconds timeout (failure)
- Save a PNG screenshot to `.debug/latest.png` (created automatically, overwritten each run)
- Print collected console errors/warnings to stdout
- If the page body text contains "error loading star data", exit with code 1

The script is silent on success beyond writing the PNG. On failure it prints errors and exits non-zero.

### 3. PostToolUse Hook — `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/screenshot.js 2>&1 || true"
          }
        ]
      }
    ]
  }
}
```

The hook fires after every `Edit` or `Write` tool call. Its stdout is injected back into the conversation. Claude reads the output on the next turn — if errors are present, it fixes them and the loop repeats.

`|| true` prevents the hook from blocking on script failure (e.g., dev server not running). The error text in stdout is sufficient for Claude to act on.

---

## File Changes

| File | Change |
|------|--------|
| `src/data/loader.ts` | `./data/stars.json` → `/data/stars.json` |
| `scripts/screenshot.js` | New — Puppeteer headless screenshot script |
| `.claude/settings.json` | New or updated — PostToolUse hook |
| `package.json` | Add `puppeteer` to `devDependencies` |
| `.gitignore` | Add `.debug/` |
| `.gitignore` | Add `.superpowers/` |

---

## Prerequisites

- `npm run dev` must be running before edits that trigger the hook
- Node.js 18+ (already required by Vite)
- Puppeteer downloads Chromium on `npm install` (~170MB one-time)

---

## Success Criteria

- `npm run dev` loads the star map without errors
- After a Claude edit to any `src/` file, `.debug/latest.png` is updated and any console errors appear in the conversation output
- Claude can observe and self-correct visual/runtime errors without manual prompting
