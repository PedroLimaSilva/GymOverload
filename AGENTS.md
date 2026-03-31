# Agent context: GymOverload

Use this file when editing or reviewing this repository in an automated or assistant context.

## Product goals (north star)

GymOverload is an **iOS-native**, **on-device** strength training tracker for users who already program their own training.

They must be able to:

1. **Exercises** — Create and categorize exercises (muscle group and/or **type**: weight + reps, **time** for isometric holds, or **both** where applicable).
2. **Templates / workout plans** — Define named plans: a group of exercises to perform in a session, with planned structure (sets, targets).
3. **Session logging** — Run a workout: move exercise by exercise, **log each set** (weight, reps—and time-based metrics when the exercise type requires it), and use a **rest timer** between sets.

**Future / ideal** (not requirements for every MVP slice, but explicit product direction):

- **Export** workout plans (and eventually history) for backup or portability.
- **Storage**: stay on device by default; **iCloud** (or CloudKit/SwiftData sync) as an optional way to keep data across devices.
- **Charts** showing progression (e.g. volume, e1RM, or simple trend per exercise) over time.

**Non-goals for positioning**: The app is not aimed at beginners who need program prescription; it supports people who know their exercises and want accurate logging.

## Current implementation vs goals

| Goal | Codebase reality |
|------|-------------------|
| Exercise CRUD + categories + kind string | Implemented (`Exercise`, `ExerciseCategory`, `kind`, rest, weight fields). Formal **enum** for modality (weight/reps vs time vs hybrid) may still be needed for UI and logging rules. |
| Templates with planned sets/reps | Implemented (`WorkoutTemplate`, `PlannedExercise`). |
| **Logged workouts / sets / rest timer** | **Not implemented**. `GymOverload/Views/Logging/LoggedSet.swift` is commented-out stub; no `WorkoutSession` / `LoggedSet` SwiftData models in schema. |
| Export / iCloud / charts | **Not implemented**. |
| Watch companion | Partial: mirror exercises + templates only; no session logging on watch implied yet. |

When adding features, extend `SharedModelContainer` schema deliberately (migrations) and keep DTOs + WatchConnectivity payloads in sync if the watch should receive new entity types.

## What this repo is (technical)

- **GymOverload**: Native Apple platforms app (iOS + watchOS) in **Swift** / **SwiftUI**, **SwiftData** persistence.
- **Today**: Catalog of exercises and templates; iPhone → Watch sync of that catalog.

## Architecture

### Data layer

- **Models** (`Shared/Model/`): `@Model` types `Exercise` and `WorkoutTemplate`. `PlannedExercise` is a nested `Codable` struct inside templates (sets, target reps, exercise name).
- **Schema**: `SharedModelContainer` registers `Exercise` and `WorkoutTemplate` only.
- **Seed data**: `InitialDataLoader.preloadIfNeeded` runs when both fetches are empty; it inserts entities from `ModelDataLoader`, which decodes `Shared/Resources/exercises.json` and `templates.json` via DTOs (`ExerciseDTO`, `WorkoutTemplateDTO`, etc.).
- **Categories**: `ExerciseCategory` is a string-backed enum; persistence uses `categoryRawValues: [String]` with a computed `categories` bridge.

### iOS app (`GymOverload/`)

- Entry: `GymOverloadApp` → `ContentView` with `.modelContainer(SharedModelContainer.container)`.
- UI: Two tabs — `ExerciseListView`, `WorkoutTemplateList` (and related detail views under `Views/`).
- **Watch sync**: `ContentView` creates `SyncObserver(context:)` on appear. `SyncObserver` keeps `WatchSyncManager.shared` alive and uses a **10-second** `Timer` to fetch all exercises/templates and call `WCSession.transferUserInfo` with JSON-encoded DTOs. `WatchSyncManager` also exists and can send similarly; the live path for periodic sync is primarily `SyncObserver`.
- **Logging UI**: `Views/Logging/LoggedSet.swift` is fully commented out — no active set-logging model in tree.

### watchOS app (`GymOverloadWatch Watch App/`)

- `ContentView` uses `@StateObject WatchDataReceiver` initialized with `ModelContext.placeholder`, then calls `setContext` with the real environment `modelContext` on appear.
- **DEBUG-only**: On appear, may delete `default.store` under Application Support to recover from a corrupted SwiftData store.
- `WatchDataReceiver` implements `WCSessionDelegate`, decodes `didReceiveUserInfo` payloads, then `replaceContextData` (delete all exercises/templates, insert new, save) and updates `@Published` arrays.

### WatchConnectivity contract

- Payload keys: `"exercises"` and `"templates"`, each `Data` from JSON arrays of `ExerciseDTO` / `WorkoutTemplateDTO`.
- Transport: `transferUserInfo` (queued, not guaranteed instant delivery).

## Conventions for changes

- New persisted fields: update SwiftData models, DTOs, and any JSON seed shape if defaults should ship with the app.
- Shared types used on both targets should live under `Shared/` and stay import-clean for watchOS (avoid iOS-only APIs in shared files).
- Xcode uses **PBXFileSystemSynchronizedRootGroup** for `GymOverload`, `Shared`, and the Watch app folder — new files under those roots are usually picked up automatically; exceptions are listed in `project.pbxproj` if the build omits something.
- Deployment targets in the project are **iOS 26** / **watchOS 26** — do not assume older OS APIs without checking availability.

## Testing

- **Unit tests**: `GymOverloadTests` target (host app: GymOverload). `SeedJSONTests` decodes bundled `exercises.json` / `templates.json` in the test bundle and checks `ExerciseDTO` round-trip via `Exercise.toModel()`.
- **CI**: `.github/workflows/ci.yml` — iOS tests + watchOS build on `macos-15`, with an optional Xcode 26 app selection step. Update simulator names or `DEVELOPER_DIR` if GitHub’s runner image changes.
- **Manual**: WatchConnectivity still needs verification on real hardware.

## Related docs

- Human-oriented overview and vision table: [`README.md`](README.md).
