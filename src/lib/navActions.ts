import type { NavigateFunction } from "react-router-dom";
import { db } from "../db/database";
import { defaultExercise, newId, type Workout } from "../model/types";

export async function createExerciseAndNavigate(navigate: NavigateFunction) {
  const ex = defaultExercise();
  await db.exercises.add(ex);
  navigate(`/exercises/${ex.id}`);
}

export async function createWorkoutAndNavigate(
  navigate: NavigateFunction,
  opts?: { groupId?: string; sortOrder?: number },
) {
  const w: Workout = {
    id: newId(),
    name: "New workout",
    plannedExercises: [],
    groupId: opts?.groupId,
    sortOrder: opts?.sortOrder,
  };
  await db.workouts.add(w);
  navigate(`/workouts/${w.id}`);
}
