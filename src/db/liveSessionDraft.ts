import { db } from "./database";
import type { LiveWorkoutSessionDraft, Workout } from "../model/types";
import { workoutPlanFingerprint } from "../model/types";

const LIVE_ID = "_live" as const;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pending: Omit<LiveWorkoutSessionDraft, "id" | "updatedAt"> | null = null;
const DEBOUNCE_MS = 400;

export async function getLiveWorkoutSessionDraft(): Promise<LiveWorkoutSessionDraft | undefined> {
  return db.liveWorkoutSessionDrafts.get(LIVE_ID);
}

export async function clearLiveWorkoutSessionDraft(): Promise<void> {
  pending = null;
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  await db.liveWorkoutSessionDrafts.delete(LIVE_ID);
}

export function liveDraftMatchesWorkout(draft: LiveWorkoutSessionDraft, workout: Workout): boolean {
  if (draft.workoutId !== workout.id) return false;
  if (draft.planFingerprint !== workoutPlanFingerprint(workout)) return false;
  for (const pe of workout.plannedExercises) {
    const row = draft.sessionSetStates[pe.id];
    if (!row || row.length !== pe.sets) return false;
  }
  return true;
}

/** If a draft exists but no longer matches the workout plan, remove it. */
export async function pruneStaleLiveSessionDraft(workout: Workout): Promise<void> {
  const draft = await getLiveWorkoutSessionDraft();
  if (!draft || draft.workoutId !== workout.id) return;
  if (!liveDraftMatchesWorkout(draft, workout)) await clearLiveWorkoutSessionDraft();
}

export function mergeInitialSetStatesWithDraft(
  initial: Record<string, { weight: number; reps: number }[]>,
  draft: LiveWorkoutSessionDraft,
  workout: Workout,
): Record<string, { weight: number; reps: number }[]> {
  const out: Record<string, { weight: number; reps: number }[]> = {};
  for (const pe of workout.plannedExercises) {
    const fromDraft = draft.sessionSetStates[pe.id];
    const base = initial[pe.id] ?? [];
    if (fromDraft && fromDraft.length === pe.sets) {
      out[pe.id] = fromDraft.map((cell, i) => {
        const b = base[i];
        return b ? { ...b, ...cell } : cell;
      });
    } else {
      out[pe.id] = base;
    }
  }
  return out;
}

export function normalizeFocusFromDraft(
  draft: LiveWorkoutSessionDraft,
  workout: Workout,
): { plannedId: string; setIndex: number } {
  const first = workout.plannedExercises[0];
  const fallback = first ? { plannedId: first.id, setIndex: 0 } : { plannedId: "", setIndex: 0 };
  const pe = workout.plannedExercises.find((p) => p.id === draft.focusPlannedId);
  if (!pe) return fallback;
  const setIndex =
    draft.focusSetIndex >= 0 && draft.focusSetIndex < pe.sets ? draft.focusSetIndex : 0;
  return { plannedId: pe.id, setIndex };
}

export async function putLiveWorkoutSessionDraft(
  draft: Omit<LiveWorkoutSessionDraft, "id" | "updatedAt">,
): Promise<void> {
  await db.liveWorkoutSessionDrafts.put({
    ...draft,
    id: LIVE_ID,
    updatedAt: new Date().toISOString(),
  });
}

export function scheduleLiveWorkoutSessionDraftSave(
  draft: Omit<LiveWorkoutSessionDraft, "id" | "updatedAt">,
): void {
  pending = draft;
  if (debounceTimer != null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (!pending) return;
    const p = pending;
    void putLiveWorkoutSessionDraft(p);
  }, DEBOUNCE_MS);
}

export async function flushLiveWorkoutSessionDraftSave(): Promise<void> {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (pending) {
    const p = pending;
    pending = null;
    await putLiveWorkoutSessionDraft(p);
  }
}
