import Dexie, { type EntityTable } from "dexie";
import type { Exercise, WorkoutTemplate } from "../model/types";

export class GymOverloadDB extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  templates!: EntityTable<WorkoutTemplate, "id">;

  constructor() {
    super("gymoverload");
    this.version(1).stores({
      exercises: "id, createdAt, name",
      templates: "id, name",
    });
  }
}

export const db = new GymOverloadDB();
