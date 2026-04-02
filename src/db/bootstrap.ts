import type { ExerciseDTO, WorkoutDTO } from "../model/types";
import { exerciseFromDTO, workoutFromDTO } from "../model/types";
import { db } from "./database";

export async function ensureSeeded(exercisesUrl: string, workoutsUrl: string): Promise<void> {
  const [exCount, woCount] = await Promise.all([db.exercises.count(), db.workouts.count()]);
  if (exCount > 0 || woCount > 0) return;

  const [exRes, woRes] = await Promise.all([fetch(exercisesUrl), fetch(workoutsUrl)]);
  if (!exRes.ok || !woRes.ok) {
    console.warn("GymOverload: seed JSON fetch failed; starting empty.");
    return;
  }

  const exerciseDtos = (await exRes.json()) as ExerciseDTO[];
  const workoutDtos = (await woRes.json()) as WorkoutDTO[];

  await db.transaction("rw", db.exercises, db.workouts, async () => {
    await db.exercises.bulkAdd(exerciseDtos.map((d) => exerciseFromDTO(d)));
    await db.workouts.bulkAdd(workoutDtos.map((d) => workoutFromDTO(d)));
  });
}
