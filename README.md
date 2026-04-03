# GymOverload

GymOverload is a **progressive web app (PWA)** for **strength training**. It targets people who already program their own work: you maintain an **exercise library**, define **workouts** (planned sets and target reps), and keep everything **in the browser** via **IndexedDB**—no account or backend required for core use.

**Principles**

- **Local first**: Data stays on the device that runs the browser (same origin). Clear site data or another browser profile starts empty unless you re-import seed JSON (first visit loads bundled seed when the database is empty).
- **Your library**: Exercises with muscle categories, defaults (rest, weight unit, increments), movement **kind** (e.g. weight/reps or time), and notes. Workouts list ordered planned exercises with sets and target reps.
- **Installable**: Add to Home Screen / install where the browser supports it; offline shell and assets are handled by the service worker generated at build time.

## Vision vs current PWA

| Area | Goal | Status today |
|------|------|----------------|
| Exercises | Custom exercises; categories; kind string; rest and weight defaults | **Yes**: list, search, category filter, create/edit/delete |
| Workouts | Named plans with ordered exercises, sets, target reps | **Yes**: list, detail, add from library, reorder in edit mode |
| Session logging | Walk a plan; log sets; rest timer | **Not built** (same gap as the former native app) |
| Export / backup | Portable data | **Planned** (JSON export/import fits IndexedDB well) |
| Progress / charts | Trends over time | **Planned** |
| Watch companion | Wrist UI | **Removed** with the native stack; not part of the PWA |

## Requirements

- **Node.js** 20+ (CI uses 22)
- **npm** 10+

## Project layout

| Path | Role |
|------|------|
| `src/` | React UI, Dexie schema, routing, PWA registration |
| `public/seed/` | Bundled `exercises.json` and `workouts.json` (first-run seed) |
| `scripts/app-icon-source.png` | 1024×1024 master artwork (from the original iOS asset); `make-pwa-icons.mjs` resizes it to PWA icons, and emits brand-green silhouettes (`#28cd41`) for favicons and `apple-touch-icon.png` from the gray source art |
| `vite.config.ts` | Vite + `vite-plugin-pwa` (manifest + service worker) |

## Scripts

```bash
npm install    # dependencies
npm run dev    # local dev server
npm test       # Vitest (seed JSON + model helpers)
npm run build  # typecheck + production build to dist/
npm run preview # serve dist/ locally
```

## Deploying

Build with `npm run build` and host the `dist/` folder on any static host **over HTTPS** (required for service workers and installability). Configure the server so client-side routes fall back to `index.html` if you use deep links into `/exercises/:id` or `/workouts/:id`.

### GitHub Pages (this repo)

Pushes to `main` run `.github/workflows/deploy-pages.yml`, which builds with `VITE_BASE_PATH=/<repository-name>/` (required for project sites at `https://<user>.github.io/<repo>/`) and deploys `dist/` via **Actions → Deploy GitHub Pages**. In the repository **Settings → Pages**, set **Source** to **GitHub Actions** if it is not already.

## Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) runs on pushes and pull requests to `main`: `npm ci`, `npm test`, `npm run build`.

## Author

Pedro Lima e Silva (initial native project dates in prior history: June 2025). Repository direction is now **web-only PWA**.

For agent-oriented context, see [`AGENTS.md`](AGENTS.md).
