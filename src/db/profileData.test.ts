import { describe, expect, it } from "vitest";
import {
  EXPORT_FORMAT_VERSION,
  LEGACY_EXPORT_FORMAT_VERSION,
  parseImportPayloadJson,
  type GymOverloadExport,
} from "./profileData";

function minimalExportV2(overrides: Partial<GymOverloadExport> = {}): GymOverloadExport {
  return {
    version: EXPORT_FORMAT_VERSION,
    exportedAt: "2026-01-01T00:00:00.000Z",
    exercises: [],
    workouts: [],
    workoutGroups: [],
    workoutSessions: [],
    loggedExerciseEntries: [],
    ...overrides,
  };
}

describe("parseImportPayloadJson", () => {
  it("accepts v2 export with workouts and workoutId", () => {
    const payload = minimalExportV2({
      exercises: [
        {
          id: "e1",
          createdAt: "2026-01-01T00:00:00.000Z",
          name: "Squat",
          categories: ["Legs"],
          defaultRestSeconds: 120,
          weightIncrementKg: 2.5,
          weightIncrementLb: 5,
          weightUnit: "kg",
          kind: "Weight, Reps",
          doubleWeightForVolume: false,
        },
      ],
    });
    const parsed = parseImportPayloadJson(JSON.stringify(payload));
    expect(parsed.exercises).toHaveLength(1);
    expect(parsed.exercises[0]!.name).toBe("Squat");
    expect(parsed.workouts).toEqual([]);
  });

  it("accepts legacy v1 export with templates and templateId on sessions", () => {
    const legacy = {
      version: LEGACY_EXPORT_FORMAT_VERSION,
      exportedAt: "2026-01-01T00:00:00.000Z",
      exercises: [],
      templates: [
        {
          id: "t1",
          name: "A",
          plannedExercises: [{ id: "p1", name: "Squat", sets: 3, targetReps: 5 }],
        },
      ],
      workoutSessions: [{ id: "s1", templateId: "t1", completedAt: "2026-01-02T00:00:00.000Z" }],
      loggedExerciseEntries: [],
    };
    const parsed = parseImportPayloadJson(JSON.stringify(legacy));
    expect(parsed.workouts).toHaveLength(1);
    expect(parsed.workoutSessions).toHaveLength(1);
    expect(parsed.workoutSessions[0]!.workoutId).toBe("t1");
  });

  it("rejects wrong version", () => {
    const bad = { ...minimalExportV2(), version: 99 };
    expect(() => parseImportPayloadJson(JSON.stringify(bad))).toThrow(/version/i);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseImportPayloadJson("not json")).toThrow(/valid JSON/i);
  });
});
