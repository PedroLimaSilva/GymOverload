export const EXERCISE_CATEGORIES = [
  "Abs",
  "Back",
  "Biceps",
  "Cardio",
  "Chest",
  "Legs",
  "Shoulders",
  "Triceps",
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export function isExerciseCategory(s: string): s is ExerciseCategory {
  return (EXERCISE_CATEGORIES as readonly string[]).includes(s);
}

export interface ExerciseDTO {
  name: string;
  categories: ExerciseCategory[];
  defaultRestSeconds: number;
  weightIncrementKg: number;
  weightIncrementLb: number;
  weightUnit: "kg" | "lb" | string;
  kind: string;
  doubleWeightForVolume: boolean;
  notes?: string | null;
}

export interface PlannedExerciseDTO {
  name: string;
  sets: number;
  targetReps: number;
}

export interface WorkoutTemplateDTO {
  name: string;
  plannedExercises: PlannedExerciseDTO[];
}

export interface Exercise extends ExerciseDTO {
  id: string;
  createdAt: string;
}

export interface PlannedExercise extends PlannedExerciseDTO {
  id: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  plannedExercises: PlannedExercise[];
}

export function newId(): string {
  return crypto.randomUUID();
}

export function exerciseFromDTO(dto: ExerciseDTO, id = newId(), createdAt = new Date().toISOString()): Exercise {
  return {
    id,
    createdAt,
    name: dto.name,
    categories: dto.categories,
    defaultRestSeconds: dto.defaultRestSeconds,
    weightIncrementKg: dto.weightIncrementKg,
    weightIncrementLb: dto.weightIncrementLb,
    weightUnit: dto.weightUnit,
    kind: dto.kind,
    doubleWeightForVolume: dto.doubleWeightForVolume,
    notes: dto.notes ?? undefined,
  };
}

export function plannedFromDTO(dto: PlannedExerciseDTO, id = newId()): PlannedExercise {
  return { id, name: dto.name, sets: dto.sets, targetReps: dto.targetReps };
}

export function templateFromDTO(dto: WorkoutTemplateDTO, id = newId()): WorkoutTemplate {
  return {
    id,
    name: dto.name,
    plannedExercises: dto.plannedExercises.map((p) => plannedFromDTO(p)),
  };
}

export function defaultExercise(): Exercise {
  return exerciseFromDTO({
    name: "New Exercise",
    categories: [],
    defaultRestSeconds: 60,
    weightIncrementKg: 2.5,
    weightIncrementLb: 5,
    weightUnit: "kg",
    kind: "Weight, Reps",
    doubleWeightForVolume: false,
    notes: undefined,
  });
}
