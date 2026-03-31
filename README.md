# GymOverload

GymOverload is a **native iOS** (and watchOS companion) app for **strength training**. It is aimed at people who already know their way around the gym: they define their own exercises and plans and want a reliable way to **track sets** during a session—on device, without depending on a server.

**Principles**

- **On-device first**: Workouts and data stay local; no account or cloud service is required for core use (future **iCloud** sync is a goal, not a dependency).
- **Your library**: Create **exercises** (muscle group / type), build **templates** (workout plans—ordered exercises for a session), then **log sessions** (per-set weight and reps, with a **rest timer** between sets).

## Vision vs current app

| Area | Goal | Status today |
|------|------|----------------|
| Exercises | Custom exercises; categorize by muscle group; type as weight+reps, time (e.g. isometric), or both | **Partial**: create/edit exercises, categories, `kind` string, rest defaults, weight units/increments |
| Templates / plans | Named plans grouping exercises for one session | **Partial**: templates with planned sets and target reps |
| Session logging | Walk through a plan; log each set (weight, reps); rest timer | **Not built yet** (logging UI stub exists but is commented out; no session model) |
| Data & portability | Export plans; durable on-device storage; optional iCloud | **Partial**: SwiftData on device; export and iCloud **planned** |
| Progress | Charts for progression over time | **Planned** |
| Watch | Companion on the wrist | **Partial**: receives exercises/templates from iPhone via WatchConnectivity |

The sections below describe what exists in the repo **today**; the table is the north star for future work.

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

## Current features

- **Exercises**: Name, categories (muscle groups), default rest, weight increments (kg/lb), movement kind (e.g. weight/reps), optional notes.
- **Workout templates**: Named routines with planned exercises (sets and target reps).
- **First launch**: If the store is empty, exercises and templates are seeded from bundled JSON.
- **Watch sync**: `SyncObserver` on iOS polls SwiftData every 10 seconds and sends encoded DTOs via `WCSession.transferUserInfo`. The watch’s `WatchDataReceiver` decodes and replaces its local store.

## Building and running

1. Open `GymOverload.xcodeproj` in Xcode.
2. Select the **GymOverload** scheme for the iOS app or the watch app scheme for the Watch target.
3. Build and run on device or simulator (watch sync is most reliable on real hardware).

## Author

Pedro Lima e Silva (initial project dates in source: June 2025).

For architecture notes and agent-oriented context, see [`AGENTS.md`](AGENTS.md).
