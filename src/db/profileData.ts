import type {
  Exercise,
  LoggedExerciseEntry,
  SessionExerciseSnapshot,
  Workout,
  WorkoutSession,
} from "../model/types";
import { newId } from "../model/types";
import { db } from "./database";

/** Current on-disk export format (workouts + workoutId on sessions). */
export const EXPORT_FORMAT_VERSION = 2 as const;
export const LEGACY_EXPORT_FORMAT_VERSION = 1 as const;

export interface GymOverloadExport {
  version: typeof EXPORT_FORMAT_VERSION;
  exportedAt: string;
  exercises: Exercise[];
  workouts: Workout[];
  workoutSessions: WorkoutSession[];
  loggedExerciseEntries: LoggedExerciseEntry[];
}

/** Normalized shape used after parsing v1 or v2 JSON. */
interface NormalizedImportPayload {
  exercises: Exercise[];
  workouts: Workout[];
  workoutSessions: Array<{
    id?: string;
    workoutId: string;
    completedAt: string;
    durationMs?: number;
    sessionExercises?: SessionExerciseSnapshot[];
    notes?: string;
  }>;
  loggedExerciseEntries: LoggedExerciseEntry[];
}

export async function gatherExportPayload(): Promise<GymOverloadExport> {
  const [exercises, workouts, workoutSessions, loggedExerciseEntries] = await Promise.all([
    db.exercises.toArray(),
    db.workouts.toArray(),
    db.workoutSessions.toArray(),
    db.loggedExerciseEntries.toArray(),
  ]);
  return {
    version: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    exercises,
    workouts,
    workoutSessions,
    loggedExerciseEntries,
  };
}

export async function exportJsonBlob(): Promise<Blob> {
  const payload = await gatherExportPayload();
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function normalizeImportPayload(raw: Record<string, unknown>): NormalizedImportPayload {
  const v = raw.version;
  if (v !== EXPORT_FORMAT_VERSION && v !== LEGACY_EXPORT_FORMAT_VERSION) {
    throw new Error(
      `Unsupported export version (expected ${LEGACY_EXPORT_FORMAT_VERSION} or ${EXPORT_FORMAT_VERSION}).`,
    );
  }
  if (!Array.isArray(raw.exercises)) throw new Error("Missing or invalid exercises array.");
  if (!Array.isArray(raw.workoutSessions))
    throw new Error("Missing or invalid workoutSessions array.");
  if (!Array.isArray(raw.loggedExerciseEntries)) {
    throw new Error("Missing or invalid loggedExerciseEntries array.");
  }

  let workouts: Workout[];
  if (v === EXPORT_FORMAT_VERSION) {
    if (!Array.isArray(raw.workouts)) throw new Error("Missing or invalid workouts array.");
    workouts = raw.workouts as Workout[];
  } else {
    if (!Array.isArray(raw.templates)) {
      throw new Error('Missing workouts: legacy exports (version 1) use a "templates" array.');
    }
    workouts = raw.templates as Workout[];
  }

  const workoutSessions: NormalizedImportPayload["workoutSessions"] = [];
  for (const item of raw.workoutSessions) {
    if (!isRecord(item)) continue;
    const workoutId =
      (typeof item.workoutId === "string" && item.workoutId) ||
      (typeof item.templateId === "string" && item.templateId) ||
      "";
    if (!workoutId) continue;
    const durationMs =
      typeof item.durationMs === "number" && Number.isFinite(item.durationMs)
        ? Math.round(item.durationMs)
        : undefined;
    const sessionExercises = Array.isArray(item.sessionExercises)
      ? (item.sessionExercises as SessionExerciseSnapshot[])
      : undefined;
    const notesRaw = typeof item.notes === "string" ? item.notes.trim() : "";
    const notes = notesRaw ? notesRaw : undefined;
    workoutSessions.push({
      id: typeof item.id === "string" ? item.id : undefined,
      workoutId,
      completedAt:
        typeof item.completedAt === "string" ? item.completedAt : new Date().toISOString(),
      durationMs,
      sessionExercises,
      notes,
    });
  }

  return {
    exercises: raw.exercises as Exercise[],
    workouts,
    workoutSessions,
    loggedExerciseEntries: raw.loggedExerciseEntries as LoggedExerciseEntry[],
  };
}

export function parseImportPayloadJson(text: string): NormalizedImportPayload {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new Error("File is not valid JSON.");
  }
  if (!isRecord(raw)) throw new Error("Import file must be a JSON object.");
  return normalizeImportPayload(raw);
}

export interface MergeImportResult {
  added: {
    exercises: number;
    workouts: number;
    workoutSessions: number;
    loggedExerciseEntries: number;
  };
}

function remapImportedPayload(payload: NormalizedImportPayload): {
  exercises: Exercise[];
  workouts: Workout[];
  workoutSessions: WorkoutSession[];
  loggedExerciseEntries: LoggedExerciseEntry[];
} {
  const exercises: Exercise[] = [];
  for (const ex of payload.exercises) {
    exercises.push({
      ...ex,
      id: newId(),
      createdAt: ex.createdAt || new Date().toISOString(),
    });
  }

  const workoutIdMap = new Map<string, string>();
  const plannedExerciseIdMap = new Map<string, string>();
  const workouts: Workout[] = [];
  for (const w of payload.workouts) {
    const newWId = newId();
    if (w.id) workoutIdMap.set(w.id, newWId);
    const plannedExercises = w.plannedExercises.map((pe) => {
      const newPeId = newId();
      if (pe.id) plannedExerciseIdMap.set(pe.id, newPeId);
      return { ...pe, id: newPeId };
    });
    workouts.push({
      ...w,
      id: newWId,
      plannedExercises,
    });
  }

  const sessionIdMap = new Map<string, string>();
  const workoutSessions: WorkoutSession[] = [];
  for (const s of payload.workoutSessions) {
    if (!s.workoutId || !workoutIdMap.has(s.workoutId)) continue;
    const newSessionId = newId();
    if (s.id) sessionIdMap.set(s.id, newSessionId);
    const sessionExercisesRemapped = s.sessionExercises
      ?.map((block) => {
        const newPid = plannedExerciseIdMap.get(block.plannedExerciseId);
        if (!newPid) return null;
        return { ...block, plannedExerciseId: newPid };
      })
      .filter((b): b is SessionExerciseSnapshot => b != null);
    const notesRemapped =
      typeof s.notes === "string" && s.notes.trim() ? s.notes.trim() : undefined;
    workoutSessions.push({
      id: newSessionId,
      workoutId: workoutIdMap.get(s.workoutId)!,
      completedAt: s.completedAt || new Date().toISOString(),
      durationMs:
        typeof s.durationMs === "number" && Number.isFinite(s.durationMs)
          ? Math.round(s.durationMs)
          : undefined,
      sessionExercises: sessionExercisesRemapped?.length ? sessionExercisesRemapped : undefined,
      notes: notesRemapped,
    });
  }

  const loggedExerciseEntries: LoggedExerciseEntry[] = [];
  for (const e of payload.loggedExerciseEntries) {
    const newSessionId = e.sessionId ? sessionIdMap.get(e.sessionId) : undefined;
    const newPeId = e.plannedExerciseId ? plannedExerciseIdMap.get(e.plannedExerciseId) : undefined;
    if (!newSessionId || !newPeId) continue;
    loggedExerciseEntries.push({
      ...e,
      id: newId(),
      sessionId: newSessionId,
      plannedExerciseId: newPeId,
    });
  }

  return { exercises, workouts, workoutSessions, loggedExerciseEntries };
}

export async function mergeImportPayload(
  payload: NormalizedImportPayload,
): Promise<MergeImportResult> {
  const { exercises, workouts, workoutSessions, loggedExerciseEntries } =
    remapImportedPayload(payload);
  await db.transaction(
    "rw",
    [
      db.exercises,
      db.workouts,
      db.workoutSessions,
      db.loggedExerciseEntries,
      db.liveWorkoutSessionDrafts,
    ],
    async () => {
      await db.liveWorkoutSessionDrafts.clear();
      if (exercises.length) await db.exercises.bulkAdd(exercises);
      if (workouts.length) await db.workouts.bulkAdd(workouts);
      if (workoutSessions.length) await db.workoutSessions.bulkAdd(workoutSessions);
      if (loggedExerciseEntries.length)
        await db.loggedExerciseEntries.bulkAdd(loggedExerciseEntries);
    },
  );
  return {
    added: {
      exercises: exercises.length,
      workouts: workouts.length,
      workoutSessions: workoutSessions.length,
      loggedExerciseEntries: loggedExerciseEntries.length,
    },
  };
}

export async function deleteAllUserData(): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.exercises,
      db.workouts,
      db.workoutSessions,
      db.loggedExerciseEntries,
      db.liveWorkoutSessionDrafts,
    ],
    async () => {
      await db.loggedExerciseEntries.clear();
      await db.workoutSessions.clear();
      await db.liveWorkoutSessionDrafts.clear();
      await db.workouts.clear();
      await db.exercises.clear();
    },
  );
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
