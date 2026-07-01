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

function latestLoggedEntryForSet(
  historicalEntries: LoggedExerciseEntry[] | null | undefined,
  sessionCompletedAt: ReadonlyMap<string, string>,
  exerciseName: string,
  setIndex: number,
): LoggedExerciseEntry | null {
  if (!historicalEntries?.length) return null;
  const forSet = historicalEntries.filter(
    (e) => e.exerciseName === exerciseName && e.setIndex === setIndex,
  );
  if (forSet.length === 0) return null;
  forSet.sort((a, b) => {
    const ca = sessionCompletedAt.get(a.sessionId) ?? "";
    const cb = sessionCompletedAt.get(b.sessionId) ?? "";
    return ca < cb ? 1 : ca > cb ? -1 : 0;
  });
  return forSet[0]!;
}

/** Per-set last logged weight/reps, or null when no history exists for that set index. */
export function lastLoggedValuesBySetForExercise(
  historicalEntries: LoggedExerciseEntry[] | null | undefined,
  sessionCompletedAt: ReadonlyMap<string, string>,
  planned: PlannedExercise,
): ({ weight: number; reps: number } | null)[] {
  const values: ({ weight: number; reps: number } | null)[] = [];
  for (let setIndex = 0; setIndex < planned.sets; setIndex++) {
    const latest = latestLoggedEntryForSet(
      historicalEntries,
      sessionCompletedAt,
      planned.name,
      setIndex,
    );
    values.push(latest ? { weight: latest.weight, reps: latest.reps } : null);
  }
  return values;
}

export async function buildInitialSetStates(
  workout: Workout,
): Promise<Record<string, { weight: number; reps: number }[]>> {
  const exerciseNames = workout.plannedExercises.map((pe) => pe.name);
  const [historicalEntries, sessions] = await Promise.all([
    getHistoricalEntriesForExerciseNames(exerciseNames),
    db.workoutSessions.toArray(),
  ]);
  const sessionCompletedAt = new Map(sessions.map((s) => [s.id, s.completedAt]));

  const out: Record<string, { weight: number; reps: number }[]> = {};
  for (const pe of workout.plannedExercises) {
    const plannedRow = planRowDefaults(pe);
    const lastValues = lastLoggedValuesBySetForExercise(
      historicalEntries,
      sessionCompletedAt,
      pe,
    );
    const row: { weight: number; reps: number }[] = [];
    for (let setIndex = 0; setIndex < pe.sets; setIndex++) {
      const fromHistory = lastValues[setIndex];
      if (fromHistory) row.push(fromHistory);
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

/** Wall-clock end ISO from session start + duration (used when finishing or editing history). */
export function completedAtFromStartAndDuration(startedAtIso: string, durationMs: number): string {
  const startMs = new Date(startedAtIso).getTime();
  const dur = Math.max(0, Math.round(Number.isFinite(durationMs) ? durationMs : 0));
  if (!Number.isFinite(startMs)) return new Date().toISOString();
  return new Date(startMs + dur).toISOString();
}

/**
 * Recompute `completedAt` after a duration edit while keeping the same implied start when possible.
 * Normalizes `startedAt` when it was missing or inconsistent with the previous end time.
 */
export function sessionTimingAfterDurationChange(
  session: WorkoutSession,
  durationMs: number,
): Pick<WorkoutSession, "startedAt" | "completedAt" | "durationMs"> {
  const dur = Math.max(0, Math.round(Number.isFinite(durationMs) ? durationMs : 0));
  const endMs = new Date(session.completedAt).getTime();
  const raw = session.startedAt?.trim();
  let startMs: number | undefined;
  if (raw) {
    const t = new Date(raw).getTime();
    if (Number.isFinite(t) && Number.isFinite(endMs) && t <= endMs) startMs = t;
  }
  if (startMs === undefined) {
    const oldDur =
      typeof session.durationMs === "number" && Number.isFinite(session.durationMs)
        ? Math.max(0, Math.round(session.durationMs))
        : 0;
    if (Number.isFinite(endMs) && oldDur > 0) startMs = endMs - oldDur;
    else if (Number.isFinite(endMs)) startMs = endMs;
    else startMs = Date.now();
  }
  const startedAt = new Date(startMs).toISOString();
  const completedAt = completedAtFromStartAndDuration(startedAt, dur);
  return { startedAt, completedAt, durationMs: dur };
}

export function sessionTimingAfterStartChange(
  startedAtIso: string,
  durationMs: number,
): Pick<WorkoutSession, "startedAt" | "completedAt"> {
  const dur = Math.max(0, Math.round(Number.isFinite(durationMs) ? durationMs : 0));
  return {
    startedAt: startedAtIso,
    completedAt: completedAtFromStartAndDuration(startedAtIso, dur),
  };
}

export async function saveCompletedWorkout(
  workout: Workout,
  setStates: Record<string, { weight: number; reps: number }[]>,
  completedSetKeys: ReadonlySet<string>,
  durationMs?: number,
  opts?: { startedAtEpoch?: number },
): Promise<string> {
  const sessionId = newId();
  const startedAtEpoch =
    typeof opts?.startedAtEpoch === "number" && Number.isFinite(opts.startedAtEpoch)
      ? opts.startedAtEpoch
      : undefined;
  const dur =
    typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs >= 0
      ? Math.round(durationMs)
      : 0;
  let startedAt: string;
  let completedAt: string;
  if (startedAtEpoch != null) {
    startedAt = new Date(startedAtEpoch).toISOString();
    completedAt = completedAtFromStartAndDuration(startedAt, dur);
  } else {
    completedAt = new Date().toISOString();
    startedAt = completedAt;
  }
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

export function formatSetPerformanceLabel(weight: number, reps: number): string {
  const w = Number.isInteger(weight) ? String(weight) : weight.toFixed(1);
  return `${w}×${reps}`;
}

export function lastSessionSummaryForExercise(
  entries: LoggedExerciseEntry[],
  planned: PlannedExercise,
): string | null {
  const parts: string[] = [];
  for (let i = 0; i < planned.sets; i++) {
    const e = entries.find((x) => x.plannedExerciseId === planned.id && x.setIndex === i);
    if (!e) break;
    parts.push(formatSetPerformanceLabel(e.weight, e.reps));
  }
  return parts.length ? `Last: ${parts.join(", ")}` : null;
}

/** Logged sets for the given exercise names across all completed sessions. */
export async function getHistoricalEntriesForExerciseNames(
  exerciseNames: string[],
): Promise<LoggedExerciseEntry[]> {
  const nameSet = new Set(exerciseNames);
  if (nameSet.size === 0) return [];
  return db.loggedExerciseEntries.filter((e) => nameSet.has(e.exerciseName)).toArray();
}

/**
 * Per-set "last time" label like `70×12`, or empty string when unknown.
 * For each set index, uses the most recent completed set for this exercise name in any session.
 */
export function lastPerformanceBySetForExercise(
  historicalEntries: LoggedExerciseEntry[] | null,
  sessionCompletedAt: ReadonlyMap<string, string>,
  planned: PlannedExercise,
): string[] {
  return lastLoggedValuesBySetForExercise(historicalEntries, sessionCompletedAt, planned).map(
    (v) => (v ? formatSetPerformanceLabel(v.weight, v.reps) : ""),
  );
}
