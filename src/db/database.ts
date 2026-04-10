import Dexie, { type EntityTable } from "dexie";
import type {
  Exercise,
  LiveWorkoutSessionDraft,
  LoggedExerciseEntry,
  Workout,
  WorkoutGroup,
  WorkoutSession,
} from "../model/types";

export class GymOverloadDB extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  workouts!: EntityTable<Workout, "id">;
  workoutGroups!: EntityTable<WorkoutGroup, "id">;
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
    this.version(4)
      .stores({
        exercises: "id, createdAt, name",
        workouts: "id, name, groupId, sortOrder",
        workoutGroups: "id, name, sortOrder",
        workoutSessions: "id, workoutId, completedAt",
        loggedExerciseEntries: "id, sessionId, [sessionId+plannedExerciseId+setIndex]",
        liveWorkoutSessionDrafts: "id, workoutId, updatedAt",
      })
      .upgrade(async (tx) => {
        const workoutsTable = tx.table("workouts");
        const rows = (await workoutsTable.toArray()) as Workout[];
        const sorted = [...rows].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        );
        for (let i = 0; i < sorted.length; i++) {
          const w = sorted[i]!;
          const sortOrder =
            typeof w.sortOrder === "number" && Number.isFinite(w.sortOrder) ? w.sortOrder : i * 10;
          await workoutsTable.put({ ...w, sortOrder });
        }
      });
  }
}

export const db = new GymOverloadDB();
