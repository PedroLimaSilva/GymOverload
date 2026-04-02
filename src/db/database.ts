import Dexie, { type EntityTable } from "dexie";
import type { Exercise, LoggedExerciseEntry, Workout, WorkoutSession } from "../model/types";

export class GymOverloadDB extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  workouts!: EntityTable<Workout, "id">;
  workoutSessions!: EntityTable<WorkoutSession, "id">;
  loggedExerciseEntries!: EntityTable<LoggedExerciseEntry, "id">;

  constructor() {
    super("gymoverload");
    this.version(1).stores({
      exercises: "id, createdAt, name",
      templates: "id, name",
    });
    this.version(2).stores({
      exercises: "id, createdAt, name",
      templates: "id, name",
      workoutSessions: "id, templateId, completedAt",
      loggedExerciseEntries: "id, sessionId, [sessionId+plannedExerciseId+setIndex]",
    });
    this.version(3)
      .stores({
        exercises: "id, createdAt, name",
        templates: "id, name",
        workouts: "id, name",
        workoutSessions: "id, templateId, completedAt",
        loggedExerciseEntries: "id, sessionId, [sessionId+plannedExerciseId+setIndex]",
      })
      .upgrade(async (trans) => {
        const tpl = trans.table("templates");
        const wo = trans.table("workouts");
        const rows = await tpl.toArray();
        if (rows.length) await wo.bulkAdd(rows);

        const sessions = trans.table("workoutSessions");
        const sessRows = await sessions.toArray();
        for (const s of sessRows) {
          const o = s as { id: string; completedAt: string; templateId?: string; workoutId?: string };
          await sessions.put({
            id: o.id,
            completedAt: o.completedAt,
            workoutId: o.workoutId ?? o.templateId ?? "",
          });
        }
      });
    this.version(4).stores({
      exercises: "id, createdAt, name",
      workouts: "id, name",
      workoutSessions: "id, workoutId, completedAt",
      loggedExerciseEntries: "id, sessionId, [sessionId+plannedExerciseId+setIndex]",
    });
  }
}

export const db = new GymOverloadDB();
