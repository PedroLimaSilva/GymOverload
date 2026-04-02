import { describe, expect, it } from "vitest";
import exercises from "../../public/seed/exercises.json";
import templates from "../../public/seed/templates.json";
import {
  exerciseFromDTO,
  isExerciseCategory,
  templateFromDTO,
  type ExerciseDTO,
  type WorkoutTemplateDTO,
} from "./types";

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

  it("decodes templates and planned exercises", () => {
    const list = templates as WorkoutTemplateDTO[];
    expect(list.length).toBeGreaterThan(0);
    for (const dto of list) {
      const t = templateFromDTO(dto);
      expect(t.id).toBeTruthy();
      expect(t.plannedExercises.length).toBe(dto.plannedExercises.length);
      for (const p of t.plannedExercises) {
        expect(p.id).toBeTruthy();
      }
    }
  });
});
