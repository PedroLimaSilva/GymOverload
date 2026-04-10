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

export const TRAINING_CATEGORIES = [
  "Strength",
  "Hypertrophy",
  "Endurance",
  "Mobility",
  "Skill",
] as const;
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
  /** Per-set planned weight (kg/lb per exercise settings); length should match `sets` when present */
  weightsBySet?: number[];
  /** Per-set planned reps; falls back to `targetReps` when missing */
  repsBySet?: number[];
}

export interface WorkoutDTO {
  name: string;
  plannedExercises: PlannedExerciseDTO[];
  notes?: string | null;
}

export interface Exercise extends ExerciseDTO {
  id: string;
  createdAt: string;
}

export interface PlannedExercise extends PlannedExerciseDTO {
  id: string;
}

/** Folder for organizing workout plans on the list screen (not a workout itself). */
export interface WorkoutGroup {
  id: string;
  name: string;
  /** Lower values appear first among groups. */
  sortOrder: number;
}

export interface Workout {
  id: string;
  name: string;
  plannedExercises: PlannedExercise[];
  notes?: string;
  /** When set, the workout appears under this group on the workouts list. */
  groupId?: string;
  /** Order within a group (or among ungrouped workouts); lower first. */
  sortOrder?: number;
}

/** Per-exercise rows stored on a completed session (editable on session detail). */
export interface SessionExerciseSnapshot {
  plannedExerciseId: string;
  exerciseName: string;
  sets: { weight: number; reps: number }[];
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  completedAt: string;
  /** Wall-clock duration of the live session (milliseconds), when recorded. */
  durationMs?: number;
  /** Snapshot of exercises and sets for this session (source of truth for session detail). */
  sessionExercises?: SessionExerciseSnapshot[];
  /** Notes for this completed session only (not the workout plan). */
  notes?: string;
}

/** Single-row IndexedDB draft so an in-flight workout survives reload or process death. */
export interface LiveWorkoutSessionDraft {
  id: "_live";
  workoutId: string;
  /** Matches `workoutPlanFingerprint` for the workout when the draft was saved. */
  planFingerprint: string;
  sessionSetStates: Record<string, { weight: number; reps: number }[]>;
  completedSetKeys: string[];
  wallAccumMs: number;
  wallPaused: boolean;
  /** When not paused, wall-clock segment start (epoch ms); null when paused. */
  wallRunSinceEpoch: number | null;
  focusPlannedId: string;
  focusSetIndex: number;
  restEndsAt: number | null;
  updatedAt: string;
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

/**
 * Training volume: sum of weight × reps per set (in each exercise’s stored weight unit).
 * Doubles effective weight when the exercise has `doubleWeightForVolume`.
 */
export function sessionTrainingVolume(
  exercises: SessionExerciseSnapshot[],
  exerciseByName: Map<string, { doubleWeightForVolume?: boolean }>,
): number {
  let total = 0;
  for (const block of exercises) {
    const mult = exerciseByName.get(block.exerciseName)?.doubleWeightForVolume ? 2 : 1;
    for (const s of block.sets) {
      if (typeof s.weight === "number" && Number.isFinite(s.weight) && s.weight >= 0) {
        const r = typeof s.reps === "number" && Number.isFinite(s.reps) && s.reps >= 0 ? s.reps : 0;
        total += s.weight * mult * r;
      }
    }
  }
  return total;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function exerciseFromDTO(
  dto: ExerciseDTO,
  id = newId(),
  createdAt = new Date().toISOString(),
): Exercise {
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
  return {
    id,
    name: dto.name,
    sets: dto.sets,
    targetReps: dto.targetReps,
    weightsBySet: dto.weightsBySet,
    repsBySet: dto.repsBySet,
  };
}

/** Default weight/reps for each planned set (persisted overrides + fallbacks). */
export function planRowDefaults(planned: PlannedExercise): { weight: number; reps: number }[] {
  const out: { weight: number; reps: number }[] = [];
  for (let i = 0; i < planned.sets; i++) {
    const w = planned.weightsBySet?.[i];
    const r = planned.repsBySet?.[i];
    out.push({
      weight: typeof w === "number" && Number.isFinite(w) ? w : 0,
      reps:
        typeof r === "number" && Number.isFinite(r) && r >= 1 ? Math.round(r) : planned.targetReps,
    });
  }
  return out;
}

export function workoutFromDTO(dto: WorkoutDTO, id = newId()): Workout {
  return {
    id,
    name: dto.name,
    plannedExercises: dto.plannedExercises.map((p) => plannedFromDTO(p)),
    notes: dto.notes ?? undefined,
  };
}

export function workoutGroupWithName(name: string, sortOrder = 0): WorkoutGroup {
  const trimmed = name.trim();
  return {
    id: newId(),
    name: trimmed || "New group",
    sortOrder,
  };
}

/** Stable string when the set of planned exercises or their set counts/targets change. */
export function workoutPlanFingerprint(workout: Workout): string {
  return workout.plannedExercises.map((p) => `${p.id}:${p.sets}:${p.targetReps}`).join("|");
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

/** New exercise row with the same defaults as `defaultExercise`, for quick create flows. */
export function exerciseWithName(name: string): Exercise {
  const trimmed = name.trim();
  const base = defaultExercise();
  return {
    ...base,
    id: newId(),
    createdAt: new Date().toISOString(),
    name: trimmed || base.name,
  };
}

/** Loggable / time-based kinds shown in the Type picker */
export const EXERCISE_KIND_PRESETS = [
  "Weight, Reps",
  "Reps",
  "Time",
  "Distance",
  "Weight, Time",
] as const;
