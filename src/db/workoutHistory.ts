import { db } from "./database";
import type { LoggedExerciseEntry, PlannedExercise, Workout, WorkoutSession } from "../model/types";
import { newId } from "../model/types";

export async function getLatestCompletedSession(workoutId: string): Promise<WorkoutSession | undefined> {
  const rows = await db.workoutSessions.where("workoutId").equals(workoutId).toArray();
  rows.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  return rows[0];
}

async function entriesForSession(sessionId: string): Promise<LoggedExerciseEntry[]> {
  return db.loggedExerciseEntries.where("sessionId").equals(sessionId).toArray();
}

function entryMap(entries: LoggedExerciseEntry[]): Map<string, LoggedExerciseEntry> {
  const m = new Map<string, LoggedExerciseEntry>();
  for (const e of entries) {
    m.set(`${e.plannedExerciseId}\0${e.setIndex}`, e);
  }
  return m;
}

export async function buildInitialSetStates(
  workout: Workout
): Promise<Record<string, { weight: number; reps: number }[]>> {
  const session = await getLatestCompletedSession(workout.id);
  const entries = session ? await entriesForSession(session.id) : [];
  const byKey = entryMap(entries);

  const out: Record<string, { weight: number; reps: number }[]> = {};
  for (const pe of workout.plannedExercises) {
    const row: { weight: number; reps: number }[] = [];
    for (let setIndex = 0; setIndex < pe.sets; setIndex++) {
      const entry = byKey.get(`${pe.id}\0${setIndex}`);
      if (entry) row.push({ weight: entry.weight, reps: entry.reps });
      else row.push({ weight: 0, reps: pe.targetReps });
    }
    out[pe.id] = row;
  }
  return out;
}

export async function deleteSessionsForWorkout(workoutId: string): Promise<void> {
  const sessions = await db.workoutSessions.where("workoutId").equals(workoutId).toArray();
  await db.transaction("rw", db.workoutSessions, db.loggedExerciseEntries, async () => {
    for (const s of sessions) {
      await db.loggedExerciseEntries.where("sessionId").equals(s.id).delete();
      await db.workoutSessions.delete(s.id);
    }
  });
}

export async function saveCompletedWorkout(
  workout: Workout,
  setStates: Record<string, { weight: number; reps: number }[]>
): Promise<void> {
  const sessionId = newId();
  const completedAt = new Date().toISOString();
  const session: WorkoutSession = {
    id: sessionId,
    workoutId: workout.id,
    completedAt,
  };

  const entries: LoggedExerciseEntry[] = [];
  for (const pe of workout.plannedExercises) {
    const states = setStates[pe.id];
    if (!states) continue;
    for (let setIndex = 0; setIndex < pe.sets; setIndex++) {
      const s = states[setIndex];
      if (!s) continue;
      entries.push({
        id: newId(),
        sessionId,
        plannedExerciseId: pe.id,
        exerciseName: pe.name,
        setIndex,
        weight: s.weight,
        reps: s.reps,
      });
    }
  }

  await db.transaction("rw", db.workoutSessions, db.loggedExerciseEntries, async () => {
    await db.workoutSessions.add(session);
    await db.loggedExerciseEntries.bulkAdd(entries);
  });
}

export function lastSessionSummaryForExercise(
  entries: LoggedExerciseEntry[],
  planned: PlannedExercise
): string | null {
  const parts: string[] = [];
  for (let i = 0; i < planned.sets; i++) {
    const e = entries.find((x) => x.plannedExerciseId === planned.id && x.setIndex === i);
    if (!e) break;
    const w = Number.isInteger(e.weight) ? String(e.weight) : e.weight.toFixed(1);
    parts.push(`${w}×${e.reps}`);
  }
  return parts.length ? `Last: ${parts.join(", ")}` : null;
}
