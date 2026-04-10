# GitHub Pages Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the Bobiverse star map to `bobmap.pixelmatter.org` via GitHub Pages, auto-deploying on every push to `main`.

**Architecture:** Vite builds to `dist/`, GitHub Actions uploads it as a Pages artifact, GitHub Pages serves it at `bobmap.pixelmatter.org`. A `CNAME` file in `public/` persists the custom domain across deploys. Cloudflare provides DNS only (no proxy).

**Tech Stack:** Vite, GitHub Actions, GitHub Pages

---

### Task 1: Fix Vite base path and add CNAME file

**Files:**
- Modify: `vite.config.ts`
- Create: `public/CNAME`

- [ ] **Step 1: Update Vite base path**

In `vite.config.ts`, change `base: './'` to `base: '/'`:

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
```

- [ ] **Step 2: Create `public/CNAME`**

Create `public/CNAME` with exactly this content (no trailing newline issues matter — just one line):

```
bobmap.pixelmatter.org
```

- [ ] **Step 3: Verify build includes CNAME**

Run:
```bash
npm run build
```

Expected output ends with something like:
```
dist/index.html       x.xx kB
dist/assets/...
```

Then confirm:
```bash
cat dist/CNAME
```

Expected: `bobmap.pixelmatter.org`

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts public/CNAME
git commit -m "feat: set base path to / and add CNAME for bobmap.pixelmatter.org"
```

---

### Task 2: Enable deploy job in CI workflow

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Replace the commented-out deploy block**

Remove the entire commented-out `# deploy:` block (lines 67–91 in the current file) and replace it with:

```yaml
  deploy:
    name: Deploy to GitHub Pages
    needs: [build, validate-data]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Build
        run: npm ci && npm run build

      - uses: actions/configure-pages@v4

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/

      - id: deploy
        uses: actions/deploy-pages@v4
```

Note: indentation is 2 spaces; the `deploy:` key is at the same level as `build:` and `validate-data:`.

- [ ] **Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo "valid"
```

Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat: enable GitHub Pages deploy job in CI"
```

---

### Task 3: Enable GitHub Pages in repo settings (manual)

These steps are done in the browser — no code changes.

- [ ] **Step 1: Enable GitHub Pages**

Go to `https://github.com/ruguevara/Bobmap/settings/pages`

Set:
- **Source:** GitHub Actions
- **Custom domain:** `bobmap.pixelmatter.org`

Click Save. GitHub will check DNS and show a green checkmark when verified (Cloudflare CNAME is already set).

- [ ] **Step 2: Push to main and watch CI**

```bash
git push origin HEAD:main
```

Go to `https://github.com/ruguevara/Bobmap/actions` and confirm all four jobs pass: `Type-check & build`, `Validate JSON data files`, `Validate Python scripts`, `Deploy to GitHub Pages`.

- [ ] **Step 3: Enable HTTPS**

Once the deploy job completes and the cert provisions (~1–2 min), return to `https://github.com/ruguevara/Bobmap/settings/pages` and check **Enforce HTTPS**.

- [ ] **Step 4: Verify live site**

Open `https://bobmap.pixelmatter.org` in a browser.

Expected: The star map loads, the status bar shows star count, and the padlock/TLS is valid.
