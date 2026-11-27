# WIMS Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static recruiter-facing page showing every WIMS function through real screenshots, plus the script that captures them.

**Architecture:** `capture/` runs the real WIMS app locally (in-memory MongoDB, backend on :5001, Vite frontend on :5173),
seeds sample data through the app's REST API, and drives Chrome with Playwright to write PNGs into `site/media/`.
`site/` is plain HTML/CSS/JS that works from `file://` and on any static host.

**Tech Stack:** Node 22, Playwright (system Chrome, `channel: 'chrome'`), mongodb-memory-server, vanilla HTML/CSS/JS.

**Spec:** `docs/2026-11-27-wims-showcase-design.md`

## Global Constraints
- No writes to the live WIMS database or live demo; capture only from the local stack.
- WIMS source comes from https://github.com/Danica-YI/WareHouse-Inventory-Management-System, cloned into `.wims/` (gitignored).
- The site works opened from `file://` (no `fetch` of local JSON) and needs no build step.
- Screenshots: viewport 1440×900, device scale factor 1 for page shots; PNG.
- Sample data is fictional (no real companies or people); prices in AUD.
- Feature sections, in order: roles, stock, movements (inbound/outbound), alerts, orders, suppliers, adjustments, users, search.

## Review Focus
1. Phone width (390 px): screenshots readable via tap-to-zoom lightbox, no horizontal scroll.
2. A recruiter who never scrolls past the hero still sees what the app is and both links.
3. A missing or broken image (capture step failed) must fail the site check, not ship silently.
4. Admin-only functions (suppliers CRUD, approvals, users, resolve alerts) are labelled Admin so roles are clear.
5. Slow machine: capture waits on network idle and visible content, not fixed sleeps alone.

---

### Task 1: Local stack runner
**Files:** Create `capture/stack.mjs`, `package.json` scripts, `.gitignore` (`node_modules/ .wims/`).
**Interfaces:** Produces `startStack({ wimsDir }) -> Promise<{ apiUrl, webUrl, mongoUri, stop(): Promise<void> }>` and
`ensureWims(dir) -> Promise<string>` (clones + `npm ci` in backend and frontend if missing).
- [ ] Implement: MongoMemoryServer; spawn `node server.js` (cwd backend, env PORT=5001, MONGO_URI, JWT_SECRET=showcase-local);
  spawn Vite (cwd frontend, `--port 5173 --strictPort`, env VITE_API_URL=http://localhost:5001/api); poll until ready.
- [ ] Verify: `node capture/stack.mjs --check` prints `api 401` (GET /api/stocks unauthenticated) and `web 200`, then exits 0 and leaves no process on :5001/:5173.

### Task 2: Seed data
**Files:** Create `capture/data.mjs` (fixtures), `capture/seed.mjs`.
**Interfaces:** Consumes `startStack`. Produces `seed({ apiUrl, mongoUri }) -> Promise<{ adminToken, staffToken, ids }>`;
accounts `admin@wims.demo` / `staff@wims.demo`, password `demo123`.
- [ ] Data: 2 users (admin promoted via MongoDB), 5 suppliers, 14 stock items over 5 categories, inbound and outbound
  movements over the past weeks, 3 stock items below threshold (active alerts) plus 1 resolved as reorder,
  orders in every status (draft, pending, approved with tracking, shipped, received, cancelled), adjustments pending/approved/rejected.
- [ ] Verify: `node capture/seed.mjs --check` prints counts: stocks 14, suppliers 5, alerts ≥ 3 active, orders ≥ 6 across 6 statuses, adjustments 3.

### Task 3: Capture
**Files:** Create `capture/capture.mjs`; output `site/media/*.png`.
**Interfaces:** Consumes `startStack`, `seed`. Produces PNGs named `<section>-<n>-<slug>.png`.
- [ ] Page shots for every section as admin, plus staff dashboard and staff views where they differ.
- [ ] Flow sequences: core loop (outbound below threshold → alert → reorder → order draft→received), order lifecycle, adjustment approval.
- [ ] Verify: `npm run capture` exits 0; every PNG > 10 KB; spot-check 5 images by eye.

### Task 4: Showcase page
**Files:** Create `site/index.html`, `site/style.css`, `site/main.js`, `capture/check-site.mjs`.
**Interfaces:** Consumes `site/media/*.png` names from Task 3.
- [ ] Sections per the spec's page outline; flow sequences auto-advance (pause on hover, dots to jump); lightbox on click.
- [ ] Verify: `npm run check` loads `site/index.html` at 1440 and 390 wide; asserts 0 console errors, every `<img>` loaded,
  `scrollWidth <= innerWidth`, the 9 section ids present; saves `check-1440.png` and `check-390.png` for review.

### Task 5: README and handoff
**Files:** Create `README.md` (what it is, `npm run capture`, `npm run check`, hosting on GitHub Pages / Vercel).
- [ ] Commit all; report the live-demo findings (Vercel deep-link 404, Render backend down).
