# WIMS Showcase

A one-page site that shows recruiters every function of
[WIMS, the Warehouse Inventory Management System](https://github.com/Danica-YI/WareHouse-Inventory-Management-System),
without anyone having to log in and try it.

Every screenshot comes from the real app, running locally with sample data.

## View it

Open `site/index.html` in a browser. It needs no server and no build step.

## Refresh the screenshots

When the app changes, re-run the capture. It clones WIMS into `.wims/`, starts the real backend and frontend
against a throwaway in-memory MongoDB, seeds sample data through the app's own API, and drives Chrome to
re-take every screenshot in `site/media/`. Nothing touches the live database.

```bash
npm install
npm run capture        # about 2 minutes; needs Google Chrome installed
npm run check          # loads the page on desktop and phone widths and checks it
```

To capture a newer version of WIMS, delete `.wims/` first so it is cloned again.

| Script | What it checks |
|---|---|
| `npm run check:stack` | the local app starts and stops cleanly |
| `npm run check:seed` | the sample data loads (14 products, 5 suppliers, orders in every status) |
| `npm run capture` | re-takes all screenshots |
| `npm run check` | the page: images load, no errors, no sideways scrolling, lightbox and walkthrough work |

The sample data lives in `capture/data.mjs`; the multi-step walkthroughs in `capture/flows.mjs`.

## Publish it

- **GitHub Pages:** push this repository to GitHub, then in *Settings → Pages* set *Source* to *GitHub Actions*.
  `.github/workflows/pages.yml` publishes the `site/` folder on every push to `master` or `main`.
- **Vercel:** import the repository, choose the *Other* framework preset and set the root directory to `site`.
