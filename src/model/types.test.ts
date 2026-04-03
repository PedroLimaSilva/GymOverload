import { describe, expect, it } from "vitest";
import exercises from "../../public/seed/exercises.json";
import workouts from "../../public/seed/workouts.json";
import {
  exerciseFromDTO,
  exerciseWithName,
  isExerciseCategory,
  workoutFromDTO,
  type ExerciseDTO,
  type WorkoutDTO,
} from "./types";

describe("exerciseWithName", () => {
  it("uses trimmed name and sensible defaults", () => {
    const ex = exerciseWithName("  Nordic curl  ");
    expect(ex.name).toBe("Nordic curl");
    expect(ex.id).toBeTruthy();
    expect(ex.createdAt).toBeTruthy();
    expect(ex.kind).toBe("Weight, Reps");
    expect(ex.equipment).toBe("Barbell");
  });
});

describe("seed JSON", () => {
  it("decodes exercises with valid categories", () => {
    const list = exercises as ExerciseDTO[];
    expect(list.length).toBeGreaterThan(0);
    for (const dto of list) {
      for (const c of dto.categories) {
        expect(isExerciseCategory(c)).toBe(true);
      }
      const ex = exerciseFromDTO(dto);
      expect(ex.id).toBeTruthy();
      expect(ex.createdAt).toBeTruthy();
    }
  });

  it("decodes workouts and planned exercises", () => {
    const list = workouts as WorkoutDTO[];
    expect(list.length).toBeGreaterThan(0);
    for (const dto of list) {
      const w = workoutFromDTO(dto);
      expect(w.id).toBeTruthy();
      expect(w.plannedExercises.length).toBe(dto.plannedExercises.length);
      for (const p of w.plannedExercises) {
        expect(p.id).toBeTruthy();
      }
    }
  });
});
