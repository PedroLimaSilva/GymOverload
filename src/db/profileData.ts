import type {
  Exercise,
  LoggedExerciseEntry,
  WorkoutSession,
  WorkoutTemplate,
} from "../model/types";
import { newId } from "../model/types";
import { db } from "./database";

export const EXPORT_FORMAT_VERSION = 1 as const;

export interface GymOverloadExport {
  version: typeof EXPORT_FORMAT_VERSION;
  exportedAt: string;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  workoutSessions: WorkoutSession[];
  loggedExerciseEntries: LoggedExerciseEntry[];
}

export async function gatherExportPayload(): Promise<GymOverloadExport> {
  const [exercises, templates, workoutSessions, loggedExerciseEntries] = await Promise.all([
    db.exercises.toArray(),
    db.templates.toArray(),
    db.workoutSessions.toArray(),
    db.loggedExerciseEntries.toArray(),
  ]);
  return {
    version: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    exercises,
    templates,
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

function validateExportPayload(raw: unknown): GymOverloadExport {
  if (!isRecord(raw)) throw new Error("Import file must be a JSON object.");
  const v = raw.version;
  if (v !== EXPORT_FORMAT_VERSION) {
    throw new Error(`Unsupported export version (expected ${EXPORT_FORMAT_VERSION}).`);
  }
  if (!Array.isArray(raw.exercises)) throw new Error("Missing or invalid exercises array.");
  if (!Array.isArray(raw.templates)) throw new Error("Missing or invalid templates array.");
  if (!Array.isArray(raw.workoutSessions)) throw new Error("Missing or invalid workoutSessions array.");
  if (!Array.isArray(raw.loggedExerciseEntries)) {
    throw new Error("Missing or invalid loggedExerciseEntries array.");
  }
  return raw as unknown as GymOverloadExport;
}

export function parseImportPayloadJson(text: string): GymOverloadExport {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new Error("File is not valid JSON.");
  }
  return validateExportPayload(raw);
}

export interface MergeImportResult {
  added: {
    exercises: number;
    templates: number;
    workoutSessions: number;
    loggedExerciseEntries: number;
  };
}

function remapImportedPayload(payload: GymOverloadExport): {
  exercises: Exercise[];
  templates: WorkoutTemplate[];
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

  const templateIdMap = new Map<string, string>();
  const plannedExerciseIdMap = new Map<string, string>();
  const templates: WorkoutTemplate[] = [];
  for (const t of payload.templates) {
    const newTplId = newId();
    if (t.id) templateIdMap.set(t.id, newTplId);
    const plannedExercises = t.plannedExercises.map((pe) => {
      const newPeId = newId();
      if (pe.id) plannedExerciseIdMap.set(pe.id, newPeId);
      return { ...pe, id: newPeId };
    });
    templates.push({
      ...t,
      id: newTplId,
      plannedExercises,
    });
  }

  const sessionIdMap = new Map<string, string>();
  const workoutSessions: WorkoutSession[] = [];
  for (const s of payload.workoutSessions) {
    if (!s.templateId || !templateIdMap.has(s.templateId)) continue;
    const newSessionId = newId();
    if (s.id) sessionIdMap.set(s.id, newSessionId);
    workoutSessions.push({
      ...s,
      id: newSessionId,
      templateId: templateIdMap.get(s.templateId)!,
      completedAt: s.completedAt || new Date().toISOString(),
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

  return { exercises, templates, workoutSessions, loggedExerciseEntries };
}

export async function mergeImportPayload(payload: GymOverloadExport): Promise<MergeImportResult> {
  const { exercises, templates, workoutSessions, loggedExerciseEntries } = remapImportedPayload(payload);
  await db.transaction(
    "rw",
    db.exercises,
    db.templates,
    db.workoutSessions,
    db.loggedExerciseEntries,
    async () => {
      if (exercises.length) await db.exercises.bulkAdd(exercises);
      if (templates.length) await db.templates.bulkAdd(templates);
      if (workoutSessions.length) await db.workoutSessions.bulkAdd(workoutSessions);
      if (loggedExerciseEntries.length) await db.loggedExerciseEntries.bulkAdd(loggedExerciseEntries);
    }
  );
  return {
    added: {
      exercises: exercises.length,
      templates: templates.length,
      workoutSessions: workoutSessions.length,
      loggedExerciseEntries: loggedExerciseEntries.length,
    },
  };
}

export async function deleteAllUserData(): Promise<void> {
  await db.transaction(
    "rw",
    db.exercises,
    db.templates,
    db.workoutSessions,
    db.loggedExerciseEntries,
    async () => {
      await db.loggedExerciseEntries.clear();
      await db.workoutSessions.clear();
      await db.templates.clear();
      await db.exercises.clear();
    }
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
