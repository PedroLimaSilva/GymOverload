import type { ExerciseDTO, WorkoutTemplateDTO } from "../model/types";
import { exerciseFromDTO, templateFromDTO } from "../model/types";
import { db } from "./database";

export async function ensureSeeded(
  exercisesUrl: string,
  templatesUrl: string
): Promise<void> {
  const [exCount, tplCount] = await Promise.all([db.exercises.count(), db.templates.count()]);
  if (exCount > 0 || tplCount > 0) return;

  const [exRes, tplRes] = await Promise.all([fetch(exercisesUrl), fetch(templatesUrl)]);
  if (!exRes.ok || !tplRes.ok) {
    console.warn("GymOverload: seed JSON fetch failed; starting empty.");
    return;
  }

  const exerciseDtos = (await exRes.json()) as ExerciseDTO[];
  const templateDtos = (await tplRes.json()) as WorkoutTemplateDTO[];

  await db.transaction("rw", db.exercises, db.templates, async () => {
    await db.exercises.bulkAdd(exerciseDtos.map((d) => exerciseFromDTO(d)));
    await db.templates.bulkAdd(templateDtos.map((d) => templateFromDTO(d)));
  });
}
