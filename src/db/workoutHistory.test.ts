import { describe, expect, it } from "vitest";
import type { WorkoutSession } from "../model/types";
import {
  completedAtFromStartAndDuration,
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
