import { db } from "./database";
import type {
  LoggedExerciseEntry,
  PlannedExercise,
  SessionExerciseSnapshot,
  Workout,
  WorkoutSession,
} from "../model/types";
import { newId, planRowDefaults } from "../model/types";

export async function getLatestCompletedSession(
  workoutId: string,
): Promise<WorkoutSession | undefined> {
  const rows = await db.workoutSessions.where("workoutId").equals(workoutId).toArray();
  rows.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  return rows[0];
}

async function entriesForSession(sessionId: string): Promise<LoggedExerciseEntry[]> {
  return db.loggedExerciseEntries.where("sessionId").equals(sessionId).toArray();
}

function snapshotFromEntries(
  workout: Workout,
  entries: LoggedExerciseEntry[],
): SessionExerciseSnapshot[] {
  const byPe = new Map<string, LoggedExerciseEntry[]>();
  for (const e of entries) {
    const list = byPe.get(e.plannedExerciseId);
    if (list) list.push(e);
    else byPe.set(e.plannedExerciseId, [e]);
  }
  for (const list of byPe.values()) {
    list.sort((a, b) => a.setIndex - b.setIndex);
  }
  return workout.plannedExercises.map((pe) => {
    const list = byPe.get(pe.id) ?? [];
    const sets = list.map((e) => ({ weight: e.weight, reps: e.reps }));
    while (sets.length < pe.sets) {
      const d = planRowDefaults(pe)[sets.length];
      sets.push(d ?? { weight: 0, reps: pe.targetReps });
    }
    if (sets.length > pe.sets) sets.length = pe.sets;
    return {
      plannedExerciseId: pe.id,
      exerciseName: pe.name,
      sets,
    };
  });
}

function entryMap(entries: LoggedExerciseEntry[]): Map<string, LoggedExerciseEntry> {
  const m = new Map<string, LoggedExerciseEntry>();
  for (const e of entries) {
    m.set(`${e.plannedExerciseId}\0${e.setIndex}`, e);
  }
  return m;
}

export async function buildInitialSetStates(
  workout: Workout,
): Promise<Record<string, { weight: number; reps: number }[]>> {
  const session = await getLatestCompletedSession(workout.id);
  const entries = session ? await entriesForSession(session.id) : [];
  const byKey = entryMap(entries);

  const out: Record<string, { weight: number; reps: number }[]> = {};
  for (const pe of workout.plannedExercises) {
    const plannedRow = planRowDefaults(pe);
    const row: { weight: number; reps: number }[] = [];
    const snapBlock = session?.sessionExercises?.find((b) => b.plannedExerciseId === pe.id);
    for (let setIndex = 0; setIndex < pe.sets; setIndex++) {
      const fromSnap = snapBlock?.sets[setIndex];
      if (fromSnap) {
        row.push({
          weight:
            typeof fromSnap.weight === "number" && Number.isFinite(fromSnap.weight)
              ? fromSnap.weight
              : 0,
          reps:
            typeof fromSnap.reps === "number" &&
            Number.isFinite(fromSnap.reps) &&
            fromSnap.reps >= 1
              ? Math.round(fromSnap.reps)
              : pe.targetReps,
        });
        continue;
      }
      const entry = byKey.get(`${pe.id}\0${setIndex}`);
      if (entry) row.push({ weight: entry.weight, reps: entry.reps });
      else {
        const fallback = plannedRow[setIndex];
        row.push(fallback ?? { weight: 0, reps: pe.targetReps });
      }
    }
    out[pe.id] = row;
  }
  return out;
}

export async function deleteSessionsForWorkout(workoutId: string): Promise<void> {
  const sessions = await db.workoutSessions.where("workoutId").equals(workoutId).toArray();
  await db.transaction(
    "rw",
    [db.workoutSessions, db.loggedExerciseEntries, db.liveWorkoutSessionDrafts],
    async () => {
      const draft = await db.liveWorkoutSessionDrafts.get("_live");
      if (draft?.workoutId === workoutId) await db.liveWorkoutSessionDrafts.delete("_live");
      for (const s of sessions) {
        await db.loggedExerciseEntries.where("sessionId").equals(s.id).delete();
        await db.workoutSessions.delete(s.id);
      }
    },
  );
}

/** Remove one completed session and its logged sets (workout template unchanged). */
export async function deleteSession(sessionId: string): Promise<void> {
  await db.transaction("rw", db.workoutSessions, db.loggedExerciseEntries, async () => {
    await db.loggedExerciseEntries.where("sessionId").equals(sessionId).delete();
    await db.workoutSessions.delete(sessionId);
  });
}

/** Same format as session UI: `${plannedExerciseId}:${setIndex}` */
export function loggedSetKey(plannedExerciseId: string, setIndex: number): string {
  return `${plannedExerciseId}:${setIndex}`;
}

export async function saveCompletedWorkout(
  workout: Workout,
  setStates: Record<string, { weight: number; reps: number }[]>,
  completedSetKeys: ReadonlySet<string>,
  durationMs?: number,
  opts?: { startedAtEpoch?: number },
): Promise<string> {
  const sessionId = newId();
  const completedAt = new Date().toISOString();
  const startedAtEpoch =
    typeof opts?.startedAtEpoch === "number" && Number.isFinite(opts.startedAtEpoch)
      ? opts.startedAtEpoch
      : undefined;
  const startedAt = startedAtEpoch != null ? new Date(startedAtEpoch).toISOString() : completedAt;
  const sessionExercises: SessionExerciseSnapshot[] = [];
  for (const pe of workout.plannedExercises) {
    const states = setStates[pe.id] ?? [];
    const sets: { weight: number; reps: number }[] = [];
    for (let setIndex = 0; setIndex < pe.sets; setIndex++) {
      if (!completedSetKeys.has(loggedSetKey(pe.id, setIndex))) continue;
      const s = states[setIndex];
      sets.push(
        s
          ? { weight: s.weight, reps: s.reps }
          : (planRowDefaults(pe)[setIndex] ?? { weight: 0, reps: pe.targetReps }),
      );
    }
    if (sets.length > 0) {
      sessionExercises.push({ plannedExerciseId: pe.id, exerciseName: pe.name, sets });
    }
  }

  const session: WorkoutSession = {
    id: sessionId,
    workoutId: workout.id,
    completedAt,
    startedAt,
    durationMs:
      typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs >= 0
        ? Math.round(durationMs)
        : undefined,
    sessionExercises,
  };

  const entries: LoggedExerciseEntry[] = [];
  for (const pe of workout.plannedExercises) {
    const states = setStates[pe.id];
    if (!states) continue;
    for (let setIndex = 0; setIndex < pe.sets; setIndex++) {
      if (!completedSetKeys.has(loggedSetKey(pe.id, setIndex))) continue;
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
    if (entries.length) await db.loggedExerciseEntries.bulkAdd(entries);
  });

  return sessionId;
}

function loggedEntriesFromSessionBlocks(
  sessionId: string,
  blocks: SessionExerciseSnapshot[],
): LoggedExerciseEntry[] {
  const entries: LoggedExerciseEntry[] = [];
  for (const block of blocks) {
    block.sets.forEach((s, setIndex) => {
      entries.push({
        id: newId(),
        sessionId,
        plannedExerciseId: block.plannedExerciseId,
        exerciseName: block.exerciseName,
        setIndex,
        weight:
          typeof s.weight === "number" && Number.isFinite(s.weight) && s.weight >= 0 ? s.weight : 0,
        reps:
          typeof s.reps === "number" && Number.isFinite(s.reps) && s.reps >= 1
            ? Math.round(s.reps)
            : 1,
      });
    });
  }
  return entries;
}

/** Rebuild log lines from the session snapshot (all sets). */
export async function replaceLoggedEntriesFromSnapshot(session: WorkoutSession): Promise<void> {
  const blocks = session.sessionExercises;
  if (!blocks?.length) return;
  const entries = loggedEntriesFromSessionBlocks(session.id, blocks);
  await db.transaction("rw", db.loggedExerciseEntries, async () => {
    await db.loggedExerciseEntries.where("sessionId").equals(session.id).delete();
    if (entries.length) await db.loggedExerciseEntries.bulkAdd(entries);
  });
}

/** Persist session row and logged entries in one transaction. */
export async function putSessionWithLoggedEntries(session: WorkoutSession): Promise<void> {
  const blocks = session.sessionExercises ?? [];
  const entries = loggedEntriesFromSessionBlocks(session.id, blocks);
  await db.transaction("rw", db.workoutSessions, db.loggedExerciseEntries, async () => {
    await db.workoutSessions.put(session);
    await db.loggedExerciseEntries.where("sessionId").equals(session.id).delete();
    if (entries.length) await db.loggedExerciseEntries.bulkAdd(entries);
  });
}

export async function getSessionById(sessionId: string): Promise<WorkoutSession | undefined> {
  return db.workoutSessions.get(sessionId);
}

/** Session exercises for UI; hydrates from log rows when snapshot is missing (older data). */
export async function getSessionExerciseBlocks(
  session: WorkoutSession,
  workout: Workout,
): Promise<SessionExerciseSnapshot[]> {
  if (session.sessionExercises?.length) return session.sessionExercises;
  const entries = await entriesForSession(session.id);
  if (entries.length === 0) {
    return workout.plannedExercises.map((pe) => ({
      plannedExerciseId: pe.id,
      exerciseName: pe.name,
      sets: planRowDefaults(pe),
    }));
  }
  return snapshotFromEntries(workout, entries);
}

export function lastSessionSummaryForExercise(
  entries: LoggedExerciseEntry[],
  planned: PlannedExercise,
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

/** Second-newest session id for per-set “last” labels (needs at least two completed sessions). */
export function priorSessionId(sessions: WorkoutSession[]): string | undefined {
  if (sessions.length < 2) return undefined;
  const sorted = [...sessions].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  return sorted[1]?.id;
}

/** Per-set "last time" label like `70×12`, or empty string when unknown. */
export function lastPerformanceBySetForExercise(
  priorEntries: LoggedExerciseEntry[] | null,
  planned: PlannedExercise,
): string[] {
  const labels: string[] = [];
  for (let i = 0; i < planned.sets; i++) {
    if (!priorEntries) {
      labels.push("");
      continue;
    }
    const e = priorEntries.find((x) => x.plannedExerciseId === planned.id && x.setIndex === i);
    if (!e) {
      labels.push("");
      continue;
    }
    const w = Number.isInteger(e.weight) ? String(e.weight) : e.weight.toFixed(1);
    labels.push(`${w}×${e.reps}`);
  }
  return labels;
}
