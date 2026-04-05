import { describe, expect, it } from "vitest";
import type {
  Exercise,
  ExerciseCategory,
  LoggedExerciseEntry,
  Workout,
  WorkoutSession,
} from "../model/types";
import { exerciseWithName, newId } from "../model/types";
import {
  buildExerciseLookupMaps,
  muscleSetCountsForSession,
  segmentsFromMuscleCounts,
  sessionMuscleBarSegments,
  UNKNOWN_MUSCLE,
} from "./sessionMuscleBar";

function ex(name: string, primary: ExerciseCategory): Exercise {
  const e = exerciseWithName(name);
  return { ...e, categories: [primary] };
}

describe("sessionMuscleBar", () => {
  it("single muscle: one full segment", () => {
    const counts = new Map<ExerciseCategory | typeof UNKNOWN_MUSCLE, number>([["Chest", 12]]);
    expect(segmentsFromMuscleCounts(counts)).toEqual([
      expect.objectContaining({ muscle: "Chest", flex: 1 }),
    ]);
  });

  it("two muscles: fifty-fifty flex regardless of counts", () => {
    const counts = new Map<ExerciseCategory | typeof UNKNOWN_MUSCLE, number>([
      ["Back", 10],
      ["Legs", 1],
    ]);
    const segs = segmentsFromMuscleCounts(counts);
    expect(segs).toHaveLength(2);
    expect(segs[0]!.flex).toBe(1);
    expect(segs[1]!.flex).toBe(1);
  });

  it("three muscles: proportional flex", () => {
    const counts = new Map<ExerciseCategory | typeof UNKNOWN_MUSCLE, number>([
      ["Back", 2],
      ["Chest", 1],
      ["Legs", 1],
    ]);
    const segs = segmentsFromMuscleCounts(counts);
    expect(segs.map((s) => s.flex)).toEqual([2, 1, 1]);
  });

  it("uses session snapshot sets for counting", () => {
    const squat = ex("Squat", "Legs");
    const maps = buildExerciseLookupMaps([squat]);
    const session: WorkoutSession = {
      id: "s1",
      workoutId: "w1",
      completedAt: new Date().toISOString(),
      sessionExercises: [
        {
          plannedExerciseId: "pe1",
          exerciseName: "Squat",
          sets: [
            { weight: 100, reps: 5 },
            { weight: 100, reps: 5 },
          ],
        },
      ],
    };
    const counts = muscleSetCountsForSession(session, undefined, maps, []);
    expect(counts.get("Legs")).toBe(2);
  });

  it("falls back to logged entries when snapshot missing", () => {
    const bench = ex("Bench", "Chest");
    const maps = buildExerciseLookupMaps([bench]);
    const session: WorkoutSession = {
      id: "s1",
      workoutId: "w1",
      completedAt: new Date().toISOString(),
    };
    const entries: LoggedExerciseEntry[] = [
      {
        id: newId(),
        sessionId: "s1",
        plannedExerciseId: "pe1",
        exerciseName: "Bench",
        setIndex: 0,
        weight: 60,
        reps: 8,
      },
    ];
    const counts = muscleSetCountsForSession(session, undefined, maps, entries);
    expect(counts.get("Chest")).toBe(1);
  });

  it("sessionMuscleBarSegments matches two-muscle split", () => {
    const a = ex("Row", "Back");
    const b = ex("Curl", "Biceps");
    const maps = buildExerciseLookupMaps([a, b]);
    const workout: Workout = {
      id: "w1",
      name: "W",
      plannedExercises: [
        { id: "pe1", name: "Row", sets: 1, targetReps: 8 },
        { id: "pe2", name: "Curl", sets: 1, targetReps: 10 },
      ],
    };
    const session: WorkoutSession = {
      id: "s1",
      workoutId: "w1",
      completedAt: new Date().toISOString(),
      sessionExercises: [
        { plannedExerciseId: "pe1", exerciseName: "Row", sets: [{ weight: 50, reps: 8 }] },
        { plannedExerciseId: "pe2", exerciseName: "Curl", sets: [{ weight: 20, reps: 10 }] },
      ],
    };
    const segs = sessionMuscleBarSegments(session, workout, maps, []);
    expect(segs).toHaveLength(2);
    expect(segs.every((s) => s.flex === 1)).toBe(true);
  });
});
