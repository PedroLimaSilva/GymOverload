import type { Exercise, LoggedExerciseEntry, Workout, WorkoutSession } from "../model/types";
import { type ExerciseCategory, isExerciseCategory } from "../model/types";

/** Distinct colors per muscle group (dark-mode friendly). */
export const MUSCLE_GROUP_COLORS: Record<ExerciseCategory, string> = {
  Abs: "#5ac8fa",
  Back: "#0a84ff",
  Biceps: "#ff9f0a",
  Cardio: "#ff453a",
  Chest: "#ff375f",
  Legs: "#bf5af2",
  Shoulders: "#ffd60a",
  Triceps: "#32d74b",
};

const UNKNOWN_MUSCLE = "__unknown__" as const;
const UNKNOWN_COLOR = "#636366";

export interface ExerciseLookupMaps {
  byExactName: Map<string, Exercise>;
  byLowerName: Map<string, Exercise>;
}

export function buildExerciseLookupMaps(exercises: readonly Exercise[]): ExerciseLookupMaps {
  const byExactName = new Map<string, Exercise>();
  const byLowerName = new Map<string, Exercise>();
  for (const ex of exercises) {
    byExactName.set(ex.name, ex);
    byLowerName.set(ex.name.trim().toLowerCase(), ex);
  }
  return { byExactName, byLowerName };
}

export function lookupExercise(maps: ExerciseLookupMaps, name: string): Exercise | undefined {
  const exact = maps.byExactName.get(name);
  if (exact) return exact;
  return maps.byLowerName.get(name.trim().toLowerCase());
}

function primaryCategoryForExercise(
  ex: Exercise | undefined,
): ExerciseCategory | typeof UNKNOWN_MUSCLE {
  const c0 = ex?.categories?.[0];
  if (c0 && isExerciseCategory(c0)) return c0;
  return UNKNOWN_MUSCLE;
}

export function resolvePrimaryMuscleForBlock(
  exerciseName: string,
  plannedExerciseId: string,
  workout: Workout | undefined,
  maps: ExerciseLookupMaps,
): ExerciseCategory | typeof UNKNOWN_MUSCLE {
  const direct = lookupExercise(maps, exerciseName);
  let cat = primaryCategoryForExercise(direct);
  if (cat !== UNKNOWN_MUSCLE) return cat;

  const pe = workout?.plannedExercises.find((p) => p.id === plannedExerciseId);
  if (pe) {
    const viaPlan = lookupExercise(maps, pe.name);
    cat = primaryCategoryForExercise(viaPlan);
    if (cat !== UNKNOWN_MUSCLE) return cat;
  }

  return UNKNOWN_MUSCLE;
}

export function colorForMuscle(muscle: ExerciseCategory | typeof UNKNOWN_MUSCLE): string {
  if (muscle === UNKNOWN_MUSCLE) return UNKNOWN_COLOR;
  return MUSCLE_GROUP_COLORS[muscle];
}

export interface SessionBarSegment {
  muscle: ExerciseCategory | typeof UNKNOWN_MUSCLE;
  color: string;
  /** Flex grow weight (50/50 uses 1 and 1). */
  flex: number;
}

/**
 * Count logged sets per primary muscle for a session, using snapshot blocks or log rows.
 */
export function muscleSetCountsForSession(
  session: WorkoutSession,
  workout: Workout | undefined,
  maps: ExerciseLookupMaps,
  loggedEntries: readonly LoggedExerciseEntry[] | undefined,
): Map<ExerciseCategory | typeof UNKNOWN_MUSCLE, number> {
  const counts = new Map<ExerciseCategory | typeof UNKNOWN_MUSCLE, number>();

  const blocks = session.sessionExercises;
  if (blocks?.length) {
    for (const block of blocks) {
      const muscle = resolvePrimaryMuscleForBlock(
        block.exerciseName,
        block.plannedExerciseId,
        workout,
        maps,
      );
      const n = block.sets?.length ?? 0;
      if (n <= 0) continue;
      counts.set(muscle, (counts.get(muscle) ?? 0) + n);
    }
    return counts;
  }

  const entries = loggedEntries ?? [];
  for (const e of entries) {
    const muscle = resolvePrimaryMuscleForBlock(e.exerciseName, e.plannedExerciseId, workout, maps);
    counts.set(muscle, (counts.get(muscle) ?? 0) + 1);
  }

  return counts;
}

/**
 * Build bar segments: one muscle → solid; two muscles → 50/50; more → proportional to set counts.
 */
export function segmentsFromMuscleCounts(
  counts: Map<ExerciseCategory | typeof UNKNOWN_MUSCLE, number>,
): SessionBarSegment[] {
  const entries = [...counts.entries()].filter(([, n]) => n > 0);
  if (entries.length === 0) {
    return [{ muscle: UNKNOWN_MUSCLE, color: UNKNOWN_COLOR, flex: 1 }];
  }
  if (entries.length === 1) {
    const [muscle] = entries[0]!;
    return [{ muscle, color: colorForMuscle(muscle), flex: 1 }];
  }
  if (entries.length === 2) {
    const [a, b] = entries;
    return [
      { muscle: a![0], color: colorForMuscle(a![0]), flex: 1 },
      { muscle: b![0], color: colorForMuscle(b![0]), flex: 1 },
    ];
  }
  return entries.map(([muscle, n]) => ({
    muscle,
    color: colorForMuscle(muscle),
    flex: n,
  }));
}

export function sessionMuscleBarSegments(
  session: WorkoutSession,
  workout: Workout | undefined,
  maps: ExerciseLookupMaps,
  loggedEntries: readonly LoggedExerciseEntry[] | undefined,
): SessionBarSegment[] {
  const counts = muscleSetCountsForSession(session, workout, maps, loggedEntries);
  return segmentsFromMuscleCounts(counts);
}

/** @internal for tests */
export { UNKNOWN_MUSCLE };
