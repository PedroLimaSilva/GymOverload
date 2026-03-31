# Agent context: GymOverload

Use this file when editing or reviewing this repository in an automated or assistant context.

## What this repo is

- **GymOverload**: Native Apple platforms app (iOS + watchOS) written in **Swift** and **SwiftUI**, with **SwiftData** for persistence.
- **Purpose**: Maintain a catalog of gym **exercises** and **workout templates**; mirror that data to the Watch for quick access.

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

- No XCTest targets or CI config are present in this repository as of documentation update. Verify behavior in Xcode on device for WatchConnectivity.

## Related docs

- Human-oriented overview: [`README.md`](README.md).
