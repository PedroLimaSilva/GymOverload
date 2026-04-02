import Dexie, { type EntityTable } from "dexie";
import type { Exercise, LoggedExerciseEntry, WorkoutSession, WorkoutTemplate } from "../model/types";

export class GymOverloadDB extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  templates!: EntityTable<WorkoutTemplate, "id">;
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
        workoutSessions: "id, templateId, completedAt",
        loggedExerciseEntries: "id, sessionId, [sessionId+plannedExerciseId+setIndex]",
      })
      .upgrade(async (tx) => {
        await tx
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
