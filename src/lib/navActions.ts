import type { NavigateFunction } from "react-router-dom";
import { db } from "../db/database";
import { defaultExercise, newId, type WorkoutTemplate } from "../model/types";

export async function createExerciseAndNavigate(navigate: NavigateFunction) {
  const ex = defaultExercise();
  await db.exercises.add(ex);
  navigate(`/exercises/${ex.id}`);
}

export async function createTemplateAndNavigate(navigate: NavigateFunction) {
  const t: WorkoutTemplate = {
    id: newId(),
    name: "New Template",
    plannedExercises: [],
  };
  await db.templates.add(t);
  navigate(`/templates/${t.id}`);
}
