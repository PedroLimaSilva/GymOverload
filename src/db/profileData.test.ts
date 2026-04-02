import { describe, expect, it } from "vitest";
import { EXPORT_FORMAT_VERSION, parseImportPayloadJson, type GymOverloadExport } from "./profileData";

function minimalExport(overrides: Partial<GymOverloadExport> = {}): GymOverloadExport {
  return {
    version: EXPORT_FORMAT_VERSION,
    exportedAt: "2026-01-01T00:00:00.000Z",
    exercises: [],
    templates: [],
    workoutSessions: [],
    loggedExerciseEntries: [],
    ...overrides,
  };
}

describe("parseImportPayloadJson", () => {
  it("accepts a valid export object", () => {
    const payload = minimalExport({
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
  });

  it("rejects wrong version", () => {
    const bad = { ...minimalExport(), version: 99 };
    expect(() => parseImportPayloadJson(JSON.stringify(bad))).toThrow(/version/i);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseImportPayloadJson("not json")).toThrow(/valid JSON/i);
  });
});
