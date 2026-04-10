# GitHub Pages Deploy — Design Spec

**Date:** 2026-04-10  
**Repo:** ruguevara/Bobmap (public)  
**Target URL:** https://bobmap.pixelmatter.org  
**DNS:** Cloudflare (pixelmatter.org)

---

## Goal

Deploy the Bobiverse star map to `bobmap.pixelmatter.org` via GitHub Pages, triggered automatically on every push to `main`.

## Changes Required

### 1. `vite.config.ts` — base path

Change `base: './'` to `base: '/'`.

The app is served at the domain root (`bobmap.pixelmatter.org/`), not a subpath. An explicit `/` avoids edge cases with asset resolution.

### 2. `public/CNAME`

Create `public/CNAME` containing exactly:

```
bobmap.pixelmatter.org
```

Vite copies `public/` into `dist/` at build time. GH Pages reads `CNAME` from the deploy artifact to set (and persist) the custom domain — without this file the domain resets on every deploy.

### 3. `.github/workflows/ci.yml` — uncomment deploy job

Uncomment the existing `deploy` job stub and fill in the correct steps. Final job:

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
    - run: npm ci && npm run build
    - uses: actions/configure-pages@v4
    - uses: actions/upload-pages-artifact@v3
      with:
        path: dist/
    - id: deploy
      uses: actions/deploy-pages@v4
```

### 4. GitHub repo settings (manual, one-time)

In **Settings → Pages**:
- Source: **GitHub Actions**
- Custom domain: `bobmap.pixelmatter.org` (GH will verify DNS)
- Enforce HTTPS: enabled (after cert provisions)

### 5. Cloudflare DNS (manual, one-time)

Add one DNS record in the Cloudflare dashboard for `pixelmatter.org`:

| Type  | Name   | Target                  | Proxy     |
|-------|--------|-------------------------|-----------|
| CNAME | bobmap | ruguevara.github.io     | DNS only (grey cloud) |

Proxy must be **disabled** — GH Pages provisions a Let's Encrypt cert by verifying the domain directly; Cloudflare's proxy would intercept that verification and break TLS.

---

## Sequence

1. Code changes committed and pushed to `main`
2. CI runs `build` + `validate-data` jobs
3. `deploy` job runs: builds, uploads `dist/` as Pages artifact, deploys
4. GitHub provisions TLS cert for `bobmap.pixelmatter.org` (first deploy only, ~1–2 min)
5. Site live at https://bobmap.pixelmatter.org

---

## Out of Scope

- Cloudflare proxy / WAF (breaks GH Pages TLS)
- Preview deploys on PRs (not supported by GH Pages; can add later with a separate service)
- Any changes to app functionality
