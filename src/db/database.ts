import Dexie, { type EntityTable } from "dexie";
import type {
  Exercise,
  LiveWorkoutSessionDraft,
  LoggedExerciseEntry,
  Workout,
  WorkoutSession,
} from "../model/types";

export class GymOverloadDB extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  workouts!: EntityTable<Workout, "id">;
  workoutSessions!: EntityTable<WorkoutSession, "id">;
  loggedExerciseEntries!: EntityTable<LoggedExerciseEntry, "id">;
  liveWorkoutSessionDrafts!: EntityTable<LiveWorkoutSessionDraft, "id">;

  constructor() {
    super("gymoverload");
    this.version(1).stores({
      exercises: "id, createdAt, name",
      workouts: "id, name",
      workoutSessions: "id, workoutId, completedAt",
      loggedExerciseEntries: "id, sessionId, [sessionId+plannedExerciseId+setIndex]",
    });
    this.version(2).stores({
      exercises: "id, createdAt, name",
      workouts: "id, name",
      workoutSessions: "id, workoutId, completedAt",
      loggedExerciseEntries: "id, sessionId, [sessionId+plannedExerciseId+setIndex]",
    });
    this.version(3).stores({
      exercises: "id, createdAt, name",
      workouts: "id, name",
      workoutSessions: "id, workoutId, completedAt",
      loggedExerciseEntries: "id, sessionId, [sessionId+plannedExerciseId+setIndex]",
      liveWorkoutSessionDrafts: "id, workoutId, updatedAt",
    });
  }
}

export const db = new GymOverloadDB();
