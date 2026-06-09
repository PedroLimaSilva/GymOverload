import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  Exercise,
  LoggedExerciseEntry,
  Workout,
  WorkoutGroup,
  WorkoutSession,
} from "../model/types";
import { db } from "./database";
import { gatherGroupExportPayload } from "./profileData";

describe("gatherGroupExportPayload", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it("includes only the group, its workouts, matching sessions, entries, and exercises by planned name", async () => {
    const g1: WorkoutGroup = { id: "g1", name: "Alpha", sortOrder: 0 };
    const g2: WorkoutGroup = { id: "g2", name: "Beta", sortOrder: 10 };
    const w1: Workout = {
      id: "w1",
      name: "A",
      plannedExercises: [{ id: "p1", name: "Squat", sets: 3, targetReps: 5 }],
      groupId: "g1",
      sortOrder: 0,
    };
    const w2: Workout = {
      id: "w2",
      name: "B",
      plannedExercises: [{ id: "p2", name: "Press", sets: 2, targetReps: 8 }],
      groupId: "g2",
      sortOrder: 0,
    };
    const exSquat: Exercise = {
      id: "e-squat",
      createdAt: "2026-01-01T00:00:00.000Z",
      name: "Squat",
      categories: ["Legs"],
      defaultRestSeconds: 120,
      weightIncrementKg: 2.5,
      weightIncrementLb: 5,
      weightUnit: "kg",
      kind: "Weight, Reps",
      doubleWeightForVolume: false,
    };
    const exBench: Exercise = {
      id: "e-bench",
      createdAt: "2026-01-01T00:00:00.000Z",
      name: "Bench",
      categories: ["Chest"],
      defaultRestSeconds: 90,
      weightIncrementKg: 2.5,
      weightIncrementLb: 5,
      weightUnit: "kg",
      kind: "Weight, Reps",
      doubleWeightForVolume: false,
    };
    const s1: WorkoutSession = {
      id: "s1",
      workoutId: "w1",
      completedAt: "2026-01-02T00:00:00.000Z",
    };
    const s2: WorkoutSession = {
      id: "s2",
      workoutId: "w2",
      completedAt: "2026-01-03T00:00:00.000Z",
    };
    const le1: LoggedExerciseEntry = {
      id: "le1",
      sessionId: "s1",
      plannedExerciseId: "p1",
      exerciseName: "Squat",
      setIndex: 0,
      weight: 100,
      reps: 5,
    };
    const le2: LoggedExerciseEntry = {
      id: "le2",
      sessionId: "s2",
      plannedExerciseId: "p2",
      exerciseName: "Press",
      setIndex: 0,
      weight: 50,
      reps: 8,
    };

    await db.transaction(
      "rw",
      [
        db.exercises,
        db.workouts,
        db.workoutGroups,
        db.workoutSessions,
        db.loggedExerciseEntries,
      ],
      async () => {
        await db.exercises.bulkAdd([exSquat, exBench]);
        await db.workoutGroups.bulkAdd([g1, g2]);
        await db.workouts.bulkAdd([w1, w2]);
        await db.workoutSessions.bulkAdd([s1, s2]);
        await db.loggedExerciseEntries.bulkAdd([le1, le2]);
      },
    );

    const payload = await gatherGroupExportPayload("g1");
    expect(payload.workoutGroups).toEqual([g1]);
    expect(payload.workouts).toEqual([w1]);
    expect(payload.workoutSessions).toEqual([s1]);
    expect(payload.loggedExerciseEntries).toEqual([le1]);
    expect(payload.exercises.map((e) => e.id)).toEqual(["e-squat"]);
  });
});
