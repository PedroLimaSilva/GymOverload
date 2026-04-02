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
    this.version(4)
      .stores({
        exercises: "id, createdAt, name",
        workouts: "id, name",
        workoutSessions: "id, workoutId, completedAt",
        loggedExerciseEntries: "id, sessionId, [sessionId+plannedExerciseId+setIndex]",
      })
      .upgrade(async (trans) => {
        // Branch builds that reached v3 without a `workouts` table still have `templates` only.
        const wo = trans.table("workouts");
        if ((await wo.count()) === 0) {
          try {
            const tpl = trans.table("templates");
            const rows = await tpl.toArray();
            if (rows.length) await wo.bulkAdd(rows);
          } catch {
            /* templates store may already be gone */
          }
        }
        const sessions = trans.table("workoutSessions");
        const sessRows = await sessions.toArray();
        for (const s of sessRows) {
          const o = s as { id: string; completedAt: string; templateId?: string; workoutId?: string };
          const wid = o.workoutId ?? o.templateId ?? "";
          if (wid !== (o as { workoutId?: string }).workoutId || o.templateId !== undefined) {
            await sessions.put({
              id: o.id,
              completedAt: o.completedAt,
              workoutId: wid,
            });
          }
        }
      });
    this.version(5)
      .stores({
        exercises: "id, createdAt, name",
        workouts: "id, name",
        workoutSessions: "id, workoutId, completedAt",
        loggedExerciseEntries: "id, sessionId, [sessionId+plannedExerciseId+setIndex]",
      })
      .upgrade(async (trans) => {
        await trans
          .table("exercises")
          .toCollection()
          .modify((ex: Record<string, unknown>) => {
            if (ex.trainingCategory === undefined) ex.trainingCategory = "Strength";
            if (ex.equipment === undefined) ex.equipment = "Barbell";
          });
      });
  }
}

export const db = new GymOverloadDB();
