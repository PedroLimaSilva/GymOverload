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

export const TRAINING_CATEGORIES = ["Strength", "Hypertrophy", "Endurance", "Mobility", "Skill"] as const;
export type TrainingCategory = (typeof TRAINING_CATEGORIES)[number];

export const EQUIPMENT_PRESETS = [
  "Barbell",
  "Dumbbell",
  "EZ bar",
  "Cable",
  "Machine",
  "Kettlebell",
  "Bodyweight",
  "Band",
  "Other",
] as const;
export type EquipmentPreset = (typeof EQUIPMENT_PRESETS)[number];

export interface ExerciseDTO {
  name: string;
  categories: ExerciseCategory[];
  /** Primary muscle group is `categories[0]` when present; extras are secondary. */
  defaultRestSeconds: number;
  weightIncrementKg: number;
  weightIncrementLb: number;
  weightUnit: "kg" | "lb" | string;
  kind: string;
  doubleWeightForVolume: boolean;
  notes?: string | null;
  /** e.g. Strength — distinct from muscle-group categories */
  trainingCategory?: TrainingCategory | string;
  equipment?: string;
  /** Optional inline image (data URL) for the exercise */
  imageDataUrl?: string | null;
}

export interface PlannedExerciseDTO {
  name: string;
  sets: number;
  targetReps: number;
}

export interface WorkoutDTO {
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

export interface Workout {
  id: string;
  name: string;
  plannedExercises: PlannedExercise[];
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  completedAt: string;
}

export interface LoggedExerciseEntry {
  id: string;
  sessionId: string;
  plannedExerciseId: string;
  exerciseName: string;
  setIndex: number;
  weight: number;
  reps: number;
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
    trainingCategory: dto.trainingCategory ?? "Strength",
    equipment: dto.equipment ?? "Barbell",
    imageDataUrl: dto.imageDataUrl ?? undefined,
  };
}

export function plannedFromDTO(dto: PlannedExerciseDTO, id = newId()): PlannedExercise {
  return { id, name: dto.name, sets: dto.sets, targetReps: dto.targetReps };
}

export function workoutFromDTO(dto: WorkoutDTO, id = newId()): Workout {
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
    trainingCategory: "Strength",
    equipment: "Barbell",
    imageDataUrl: undefined,
  });
}

/** Loggable / time-based kinds shown in the Type picker */
export const EXERCISE_KIND_PRESETS = [
  "Weight, Reps",
  "Reps",
  "Time",
  "Distance",
  "Weight, Time",
] as const;
