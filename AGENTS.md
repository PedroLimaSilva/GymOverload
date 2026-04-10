# Agent context: GymOverload (PWA)

Use this file when editing or reviewing this repository in an automated or assistant context.

## Product goals (north star)

GymOverload is a **browser-based**, **local-first** strength training tracker for users who already program their own training.

They must be able to:

1. **Exercises** — Create and categorize exercises (muscle group and **kind**: e.g. weight + reps, **time** for holds, or labels you choose).
2. **Workouts** — Define named plans: ordered exercises for a session with planned structure (sets, target reps).
3. **Session logging** (future) — Run a workout, log each set, use a **rest timer** between sets.

**Future / ideal** (not all implemented):

- **Export** workout data for backup or portability (JSON).
- **Charts** for progression over time.
- Optional **sync** (not required for MVP): would be a separate layer (e.g. user-owned cloud storage), not assumed by the core app.

**Non-goals for positioning**: The app is not aimed at beginners who need program prescription; it supports people who know their exercises and want accurate logging.

## Current implementation vs goals

| Goal                              | Codebase reality                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exercise CRUD + categories + kind | Implemented in React (`ExerciseListPage`, `ExerciseDetailPage`), types in `src/model/types.ts`, persistence in Dexie (`src/db/database.ts`).                                                                                                                                                                                                                                                                           |
| Workouts with planned sets/reps   | Implemented (`WorkoutListPage`, `WorkoutDetailPage`). Planned rows have stable `id` fields in IndexedDB. Optional **workout groups** (`workoutGroups` table) organize plans on the list; **Create** opens a choice (new workout vs new group), and detail has a **Group** picker when groups exist.                                                                                                                                                                                                                                                                                                               |
| **Session logging / rest timer**  | Live session on `/workouts/:id?session=1`; in-progress state is saved to IndexedDB (`liveWorkoutSessionDrafts`) and restored after reload; **Workouts** lists **Resume** when a draft exists. Finish opens `/history/:sessionId`. History calendar at `/history` (≥3 months back; day bars = primary muscle per set from exercise categories, 50/50 when exactly two muscles in a session). Rest timer during session. |
| Export / charts / sync            | **Not implemented**.                                                                                                                                                                                                                                                                                                                                                                                                   |
| Native iOS / watchOS              | **Removed**. This repo is **web-only**.                                                                                                                                                                                                                                                                                                                                                                                |

## Technical stack

- **Vite** + **React 19** + **TypeScript**
- **React Router** for `/exercises`, `/exercises/:id`, `/workouts`, `/workouts/:id`, `/history`, `/history/:id` (session detail); old `/workouts/:id/sessions/:sessionId` redirects to `/history/:sessionId` (legacy `/templates` URLs redirect)
- **Dexie** (IndexedDB) for `exercises`, `workouts`, `workoutGroups`, `workoutSessions`, `loggedExerciseEntries`, and `liveWorkoutSessionDrafts` (single active in-flight session)
- **vite-plugin-pwa**: Web App Manifest, `generateSW` Workbox build, `registerSW` in `src/pwa.ts`
- **App icon**: `scripts/app-icon-source.png` (legacy 1024×1024); `scripts/make-pwa-icons.mjs` writes all shipped icons under `public/` as brand green (#28cd41) with the source PNG’s alpha channel (resize only): `pwa-192.png`, `pwa-512.png`, `favicon-32-light.png`, `favicon-32-dark.png`, `apple-touch-icon.png`, before `dev`/`build`
- **Vitest** for lightweight tests (`src/model/types.test.ts` imports seed JSON)

## Data contract

- **Seed files**: `public/seed/exercises.json` and `public/seed/workouts.json` mirror the historical Swift DTO shapes (categories as string enum values, planned exercises without persisted UUIDs in JSON—IDs are assigned at import).
- **Bootstrap**: `ensureSeeded` in `src/db/bootstrap.ts` runs on app load; if both tables are empty, it fetches the two JSON files and bulk-inserts.

When changing persisted fields:

1. Update TypeScript types in `src/model/types.ts`.
2. Bump Dexie schema in `src/db/database.ts` (new `version()` with upgrade handlers if needed).
3. Update seed JSON if defaults should ship with the app.
4. Adjust UI forms and any tests.

## Conventions for changes

- Keep the UI **mobile-first** (safe areas, bottom tab nav).
- Avoid adding a backend unless the task explicitly requires it; prefer local persistence and optional export.
- Do not reintroduce Xcode or Swift targets in this repo without an explicit product decision.
- Prefer small, focused commits and keep `README.md` / `AGENTS.md` aligned when behavior or layout of the project changes.

## Testing

- **Unit tests**: `yarn test` (Vitest).
- **Formatting**: `yarn format` (write) / `yarn format:check` (verify).
- **CI**: `.github/workflows/ci.yml` — install, format check, test, build on Ubuntu; Node version from [`.nvmrc`](.nvmrc).

## Related docs

Human-oriented overview: [`README.md`](README.md).

## Cursor Cloud specific instructions

### Services

This is a single-service, client-side-only PWA. There is no backend, no database server, and no Docker.

| Service         | Command    | Notes                                                                                                              |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| Vite dev server | `yarn dev` | Runs `predev` hook (`scripts/make-pwa-icons.mjs`) automatically. Add `--host 0.0.0.0` to expose outside localhost. |

### Quick reference

- **Install deps**: `corepack enable` then `yarn install` (CI: `yarn install --immutable`)
- **Tests**: `yarn test` (Vitest, fast — currently one test file)
- **Type-check + build**: `yarn build` (runs `tsc --noEmit` then `vite build`)
- **Format**: `yarn format` / `yarn format:check` (Prettier; enforced in CI)
- **Lint**: No ESLint; type-checking is done via `tsc --noEmit` as part of `yarn build`.

### Gotchas

- The `predev` / `prebuild` hook runs `scripts/make-pwa-icons.mjs`, which requires the `pngjs` dev dependency and `scripts/app-icon-source.png`. If either is missing the dev server will fail to start.
- Data is seeded from `public/seed/*.json` on first load into IndexedDB via Dexie. Clearing browser data resets the database; a fresh visit re-seeds automatically.
