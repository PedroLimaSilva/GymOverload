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
  }
}

export const db = new GymOverloadDB();
