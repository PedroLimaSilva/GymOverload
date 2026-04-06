import { describe, expect, it } from "vitest";
import type { LiveWorkoutSessionDraft, Workout } from "../model/types";
import { plannedFromDTO, workoutFromDTO, workoutPlanFingerprint } from "../model/types";
import { liveDraftMatchesWorkout, mergeInitialSetStatesWithDraft } from "./liveSessionDraft";

const workout: Workout = workoutFromDTO({
  name: "Test",
  plannedExercises: [
    { name: "Squat", sets: 2, targetReps: 5 },
    { name: "Press", sets: 1, targetReps: 8 },
  ],
});

const fp = workoutPlanFingerprint(workout);

function baseDraft(over: Partial<LiveWorkoutSessionDraft> = {}): LiveWorkoutSessionDraft {
  return {
    id: "_live",
    workoutId: workout.id,
    planFingerprint: fp,
    sessionSetStates: {
      [workout.plannedExercises[0]!.id]: [
        { weight: 100, reps: 5 },
        { weight: 100, reps: 5 },
      ],
      [workout.plannedExercises[1]!.id]: [{ weight: 50, reps: 8 }],
    },
    completedSetKeys: [],
    wallAccumMs: 0,
    wallPaused: true,
    wallRunSinceEpoch: null,
    focusPlannedId: workout.plannedExercises[0]!.id,
    focusSetIndex: 0,
    restEndsAt: null,
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

describe("liveSessionDraft", () => {
  it("liveDraftMatchesWorkout rejects wrong fingerprint", () => {
    const d = baseDraft({ planFingerprint: "stale" });
    expect(liveDraftMatchesWorkout(d, workout)).toBe(false);
  });

  it("liveDraftMatchesWorkout accepts matching plan", () => {
    expect(liveDraftMatchesWorkout(baseDraft(), workout)).toBe(true);
  });

  it("mergeInitialSetStatesWithDraft overlays draft cells on initial", () => {
    const draft = baseDraft();
    const initial = {
      [workout.plannedExercises[0]!.id]: [
        { weight: 0, reps: 5 },
        { weight: 0, reps: 5 },
      ],
      [workout.plannedExercises[1]!.id]: [{ weight: 0, reps: 8 }],
    };
    const merged = mergeInitialSetStatesWithDraft(initial, draft, workout);
    expect(merged[workout.plannedExercises[0]!.id]![0]).toEqual({ weight: 100, reps: 5 });
    expect(merged[workout.plannedExercises[1]!.id]![0]).toEqual({ weight: 50, reps: 8 });
  });

  it("rejects draft when set count changes", () => {
    const w2: Workout = {
      ...workout,
      plannedExercises: workout.plannedExercises.map((pe, i) =>
        i === 0 ? { ...pe, sets: 3 } : pe,
      ),
    };
    expect(liveDraftMatchesWorkout(baseDraft(), w2)).toBe(false);
  });

  it("rejects draft when planned exercise id is unknown", () => {
    const orphan = plannedFromDTO({ name: "New", sets: 1, targetReps: 10 });
    const w2: Workout = { ...workout, plannedExercises: [...workout.plannedExercises, orphan] };
    expect(liveDraftMatchesWorkout(baseDraft(), w2)).toBe(false);
  });
});
