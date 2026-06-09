import { describe, expect, it } from "vitest";
import type { LoggedExerciseEntry, PlannedExercise, WorkoutSession } from "../model/types";
import {
  completedAtFromStartAndDuration,
  formatSetPerformanceLabel,
  lastPerformanceBySetForExercise,
  sessionTimingAfterDurationChange,
  sessionTimingAfterStartChange,
} from "./workoutHistory";

describe("workoutHistory session timing", () => {
  it("completedAtFromStartAndDuration adds duration to start", () => {
    const start = "2026-01-15T10:00:00.000Z";
    expect(completedAtFromStartAndDuration(start, 90 * 60 * 1000)).toBe("2026-01-15T11:30:00.000Z");
  });

  it("sessionTimingAfterStartChange pairs startedAt with derived completedAt", () => {
    const t = sessionTimingAfterStartChange("2026-02-01T08:00:00.000Z", 45 * 60 * 1000);
    expect(t.startedAt).toBe("2026-02-01T08:00:00.000Z");
    expect(t.completedAt).toBe("2026-02-01T08:45:00.000Z");
  });

  it("sessionTimingAfterDurationChange keeps valid startedAt and shifts completedAt", () => {
    const session: WorkoutSession = {
      id: "s1",
      workoutId: "w1",
      startedAt: "2026-03-10T12:00:00.000Z",
      completedAt: "2026-03-10T13:00:00.000Z",
      durationMs: 60 * 60 * 1000,
    };
    const next = sessionTimingAfterDurationChange(session, 30 * 60 * 1000);
    expect(next.startedAt).toBe("2026-03-10T12:00:00.000Z");
    expect(next.completedAt).toBe("2026-03-10T12:30:00.000Z");
    expect(next.durationMs).toBe(30 * 60 * 1000);
  });

  it("sessionTimingAfterDurationChange infers start from previous end minus old duration", () => {
    const session: WorkoutSession = {
      id: "s1",
      workoutId: "w1",
      completedAt: "2026-04-01T18:00:00.000Z",
      durationMs: 60 * 60 * 1000,
    };
    const next = sessionTimingAfterDurationChange(session, 2 * 60 * 60 * 1000);
    expect(next.startedAt).toBe("2026-04-01T17:00:00.000Z");
    expect(next.completedAt).toBe("2026-04-01T19:00:00.000Z");
  });
});

describe("lastPerformanceBySetForExercise", () => {
  const planned: PlannedExercise = {
    id: "pe-current",
    name: "Pec Fly Crossover",
    sets: 3,
    targetReps: 10,
  };

  const sessionCompletedAt = new Map<string, string>([
    ["older", "2026-01-01T10:00:00.000Z"],
    ["newer", "2026-02-01T10:00:00.000Z"],
  ]);

  const entries: LoggedExerciseEntry[] = [
    {
      id: "e1",
      sessionId: "older",
      plannedExerciseId: "pe-old",
      exerciseName: "Pec Fly Crossover",
      setIndex: 0,
      weight: 20,
      reps: 12,
    },
    {
      id: "e2",
      sessionId: "older",
      plannedExerciseId: "pe-old",
      exerciseName: "Pec Fly Crossover",
      setIndex: 1,
      weight: 20,
      reps: 10,
    },
    {
      id: "e3",
      sessionId: "newer",
      plannedExerciseId: "pe-other-workout",
      exerciseName: "Pec Fly Crossover",
      setIndex: 0,
      weight: 25,
      reps: 10,
    },
  ];

  it("formatSetPerformanceLabel renders integer weights without decimals", () => {
    expect(formatSetPerformanceLabel(25, 10)).toBe("25×10");
    expect(formatSetPerformanceLabel(12.5, 8)).toBe("12.5×8");
  });

  it("uses the newest session per set index across workouts", () => {
    expect(lastPerformanceBySetForExercise(entries, sessionCompletedAt, planned)).toEqual([
      "25×10",
      "20×10",
      "",
    ]);
  });

  it("returns empty labels when history is missing", () => {
    expect(lastPerformanceBySetForExercise(null, sessionCompletedAt, planned)).toEqual(["", "", ""]);
  });
});
