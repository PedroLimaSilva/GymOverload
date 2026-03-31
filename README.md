# GymOverload

GymOverload is an iOS and watchOS companion app for managing **exercises** and **workout templates**. The iPhone app is the primary editor; data is persisted with **SwiftData** and pushed to the Apple Watch over **WatchConnectivity** so the watch can browse the same library offline.

## Requirements

- Xcode (project targets **iOS 26** and **watchOS 26**)
- Swift **5**
- A physical iPhone and Apple Watch pair for full WatchConnectivity behavior (simulators have limitations)

## Project layout

| Path | Role |
|------|------|
| `GymOverload/` | iOS app: SwiftUI `TabView` (Exercises, Templates), sync observer |
| `GymOverloadWatch Watch App/` | watchOS app: receives synced data, lists templates |
| `Shared/` | SwiftData models, bundled JSON seed data, assets shared by both targets |
| `GymOverload.xcodeproj/` | Xcode project |

Shared code includes `Exercise` and `WorkoutTemplate` models, `SharedModelContainer`, `InitialDataLoader`, and `ModelDataLoader` (loads `Shared/Resources/exercises.json` and `templates.json`).

## Features

- **Exercises**: Name, categories (e.g. chest, back), rest defaults, weight increments (kg/lb), movement kind, optional notes.
- **Workout templates**: Named routines with planned exercises (sets and target reps).
- **First launch**: If the store is empty, exercises and templates are seeded from bundled JSON.
- **Watch sync**: `SyncObserver` on iOS polls SwiftData every 10 seconds and sends encoded DTOs via `WCSession.transferUserInfo`. The watch’s `WatchDataReceiver` decodes and replaces its local store.

## Building and running

1. Open `GymOverload.xcodeproj` in Xcode.
2. Select the **GymOverload** scheme for the iOS app or the watch app scheme for the Watch target.
3. Build and run on device or simulator (watch sync is most reliable on real hardware).

## Author

Pedro Lima e Silva (initial project dates in source: June 2025).

For automated tooling and coding agents, see [`AGENTS.md`](AGENTS.md).
