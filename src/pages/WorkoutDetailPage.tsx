import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState, type PointerEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowUpDown,
  BarChart3,
  Check,
  ChevronLeft,
  Dumbbell,
  FastForward,
  GripHorizontal,
  Pause,
  Play,
  Plus,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import { ExerciseMultiPickerModal } from "../components/ExerciseMultiPickerModal";
import { ModalPortal } from "../components/ModalPortal";
import { db } from "../db/database";
import { useTopNav } from "../layout/TopNavContext";
import {
  clearLiveWorkoutSessionDraft,
  flushLiveWorkoutSessionDraftSave,
  getLiveWorkoutSessionDraft,
  liveDraftMatchesWorkout,
  mergeInitialSetStatesWithDraft,
  normalizeFocusFromDraft,
  pruneStaleLiveSessionDraft,
  scheduleLiveWorkoutSessionDraftSave,
} from "../db/liveSessionDraft";
import {
  buildInitialSetStates,
  deleteSessionsForWorkout,
  lastPerformanceBySetForExercise,
  lastSessionSummaryForExercise,
  loggedSetKey,
  priorSessionId,
  saveCompletedWorkout,
} from "../db/workoutHistory";
import type { Exercise, PlannedExercise, Workout } from "../model/types";
import {
  exerciseWithName,
  planRowDefaults,
  plannedFromDTO,
  workoutPlanFingerprint,
} from "../model/types";

function formatSessionHms(totalMs: number): string {
  const s = Math.max(0, Math.floor(totalMs / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function findNextPlannedSet(
  planned: PlannedExercise[],
  plannedId: string,
  setIndex: number,
): { plannedId: string; setIndex: number } | null {
  const exIdx = planned.findIndex((p) => p.id === plannedId);
  if (exIdx < 0) return null;
  const pe = planned[exIdx];
  if (setIndex + 1 < pe.sets) return { plannedId: pe.id, setIndex: setIndex + 1 };
  if (exIdx + 1 < planned.length) return { plannedId: planned[exIdx + 1].id, setIndex: 0 };
  return null;
}

function defaultRestSecondsForExercise(ex: Exercise | undefined): number {
  const n = ex?.defaultRestSeconds;
  if (typeof n === "number" && n > 0) return Math.round(n);
  return 90;
}

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionActive = searchParams.get("session") === "1";
  const rows = useLiveQuery(() => db.workouts.toArray(), []);
  const workout = id && rows ? rows.find((w) => w.id === id) : undefined;
  const [draft, setDraft] = useState<Workout | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [sessionSetStates, setSessionSetStates] = useState<
    Record<string, { weight: number; reps: number }[]>
  >({});
  const [sessionReady, setSessionReady] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [sessionUiTick, setSessionUiTick] = useState(0);
  const [sessionWallTimer, setSessionWallTimer] = useState<{
    accumMs: number;
    paused: boolean;
    runSince: number | null;
  }>({ accumMs: 0, paused: false, runSince: null });
  const [sessionCompletedKeys, setSessionCompletedKeys] = useState<Set<string>>(() => new Set());
  const [sessionFocus, setSessionFocus] = useState<{
    plannedId: string;
    setIndex: number;
  } | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  /** Epoch ms when this live session began (calendar day); set once per session mount. */
  const [sessionStartedAtEpoch, setSessionStartedAtEpoch] = useState<number | null>(null);
  const exercises = useLiveQuery(() => db.exercises.orderBy("name").toArray(), []);
  const sessionsForWorkout = useLiveQuery(
    () => (id ? db.workoutSessions.where("workoutId").equals(id).toArray() : []),
    [id],
  );
  const sortedSessions = useMemo(() => {
    if (!sessionsForWorkout) return [];
    return [...sessionsForWorkout].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  }, [sessionsForWorkout]);
  const latestSession = sortedSessions[0];
  const priorSid = priorSessionId(sortedSessions);
  const priorEntries = useLiveQuery(
    () => (priorSid ? db.loggedExerciseEntries.where("sessionId").equals(priorSid).toArray() : []),
    [priorSid],
  );
  const latestEntries = useLiveQuery(
    () =>
      latestSession
        ? db.loggedExerciseEntries.where("sessionId").equals(latestSession.id).toArray()
        : [],
    [latestSession?.id],
  );

  const exerciseByName = useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const ex of exercises ?? []) m.set(ex.name, ex);
    return m;
  }, [exercises]);

  const plannedKey = useMemo(() => (draft ? workoutPlanFingerprint(draft) : ""), [draft]);

  useEffect(() => {
    if (sessionActive) setEditMode(false);
  }, [sessionActive]);

  useEffect(() => {
    if (!sessionActive || !sessionReady) return;
    const id = window.setInterval(() => setSessionUiTick((x) => x + 1), 250);
    return () => clearInterval(id);
  }, [sessionActive, sessionReady]);

  useEffect(() => {
    if (!restEndsAt || !sessionActive) return;
    const tick = () => {
      if (Date.now() >= restEndsAt) setRestEndsAt(null);
    };
    const id = window.setInterval(tick, 400);
    tick();
    return () => clearInterval(id);
  }, [restEndsAt, sessionActive]);

  useEffect(() => {
    if (!sessionActive) {
      setSessionReady(false);
      return;
    }
    if (!draft) return;
    if (draft.plannedExercises.length === 0) {
      setSearchParams({}, { replace: true });
      return;
    }
    let cancelled = false;
    setSessionReady(false);
    const workoutSnapshot = draft;
    void (async () => {
      await pruneStaleLiveSessionDraft(workoutSnapshot);
      const persisted = await getLiveWorkoutSessionDraft();
      const initial = await buildInitialSetStates(workoutSnapshot);
      const useDraft = persisted && liveDraftMatchesWorkout(persisted, workoutSnapshot);
      const merged = useDraft
        ? mergeInitialSetStatesWithDraft(initial, persisted, workoutSnapshot)
        : initial;
      if (cancelled) return;
      setSessionSetStates(merged);
      if (useDraft && persisted) {
        const startEpoch =
          typeof persisted.sessionStartedAtEpoch === "number" &&
          Number.isFinite(persisted.sessionStartedAtEpoch)
            ? persisted.sessionStartedAtEpoch
            : (() => {
                const t = new Date(persisted.updatedAt).getTime();
                return Number.isFinite(t) ? t : Date.now();
              })();
        setSessionStartedAtEpoch(startEpoch);
        setSessionWallTimer({
          accumMs: persisted.wallAccumMs,
          paused: persisted.wallPaused,
          runSince:
            !persisted.wallPaused && typeof persisted.wallRunSinceEpoch === "number"
              ? persisted.wallRunSinceEpoch
              : null,
        });
        setSessionCompletedKeys(new Set(persisted.completedSetKeys));
        setSessionFocus(normalizeFocusFromDraft(persisted, workoutSnapshot));
        setRestEndsAt(persisted.restEndsAt);
      } else {
        const first = workoutSnapshot.plannedExercises[0];
        const now = Date.now();
        setSessionStartedAtEpoch(now);
        setSessionWallTimer({ accumMs: 0, paused: false, runSince: now });
        setSessionCompletedKeys(new Set());
        setSessionFocus(first ? { plannedId: first.id, setIndex: 0 } : null);
        setRestEndsAt(null);
      }
      setSessionReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `draft` identity changes on every persist(); `plannedKey`/`id` capture plan edits.
  }, [sessionActive, id, plannedKey, setSearchParams]);

  useEffect(() => {
    if (!sessionActive || !draft) return;
    void pruneStaleLiveSessionDraft(draft);
  }, [sessionActive, draft, plannedKey]);

  function cloneSessionSetStates(
    src: Record<string, { weight: number; reps: number }[]>,
  ): Record<string, { weight: number; reps: number }[]> {
    const out: Record<string, { weight: number; reps: number }[]> = {};
    for (const k of Object.keys(src)) {
      out[k] = src[k]!.map((c) => ({ ...c }));
    }
    return out;
  }

  useEffect(() => {
    if (!sessionActive || !sessionReady || !draft) return;
    scheduleLiveWorkoutSessionDraftSave({
      workoutId: draft.id,
      planFingerprint: workoutPlanFingerprint(draft),
      sessionSetStates: cloneSessionSetStates(sessionSetStates),
      completedSetKeys: [...sessionCompletedKeys],
      wallAccumMs: sessionWallTimer.accumMs,
      wallPaused: sessionWallTimer.paused,
      wallRunSinceEpoch: sessionWallTimer.paused ? null : sessionWallTimer.runSince,
      focusPlannedId: sessionFocus?.plannedId ?? draft.plannedExercises[0]?.id ?? "",
      focusSetIndex: sessionFocus?.setIndex ?? 0,
      restEndsAt,
      sessionStartedAtEpoch: sessionStartedAtEpoch ?? undefined,
    });
  }, [
    sessionActive,
    sessionReady,
    draft,
    sessionSetStates,
    sessionCompletedKeys,
    sessionWallTimer.accumMs,
    sessionWallTimer.paused,
    sessionWallTimer.runSince,
    sessionFocus,
    restEndsAt,
    sessionStartedAtEpoch,
  ]);

  useEffect(() => {
    if (!sessionActive || !sessionReady) return;
    const flush = () => {
      void flushLiveWorkoutSessionDraftSave();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [sessionActive, sessionReady]);

  useEffect(() => {
    if (workout) setDraft(workout);
  }, [workout]);

  useEffect(() => {
    if (!id || rows === undefined) return;
    if (!workout) navigate("/workouts", { replace: true });
  }, [id, rows, workout, navigate]);

  async function persist(next: Workout) {
    setDraft(next);
    await db.workouts.put(next);
  }

  const updateSessionSet = useCallback(
    (plannedId: string, setIndex: number, patch: Partial<{ weight: number; reps: number }>) => {
      setSessionSetStates((prev) => {
        const row = prev[plannedId];
        if (!row || !row[setIndex]) return prev;
        const nextRow = row.map((cell, i) => (i === setIndex ? { ...cell, ...patch } : cell));
        return { ...prev, [plannedId]: nextRow };
      });
    },
    [],
  );

  const selectSessionSet = useCallback(
    (plannedId: string, setIndex: number) => {
      if (!draft) return;
      const pe = draft.plannedExercises.find((p) => p.id === plannedId);
      const ex = pe ? exerciseByName.get(pe.name) : undefined;
      const sec = defaultRestSecondsForExercise(ex);
      setSessionFocus({ plannedId, setIndex });
      setRestEndsAt(Date.now() + sec * 1000);
      setSessionWallTimer((t) => {
        if (!t.paused) return t;
        return { ...t, paused: false, runSince: Date.now() };
      });
    },
    [draft, exerciseByName],
  );

  const toggleSessionWallPause = useCallback(() => {
    const now = Date.now();
    setSessionWallTimer((t) => {
      if (!t.paused) {
        const add = t.runSince != null ? now - t.runSince : 0;
        return { accumMs: t.accumMs + add, paused: true, runSince: null };
      }
      return { ...t, paused: false, runSince: now };
    });
  }, []);

  const skipRest = useCallback(() => setRestEndsAt(null), []);

  const sessionDockAdvance = useCallback(() => {
    if (!draft || !sessionFocus) return;
    if (restEndsAt !== null) {
      setRestEndsAt(null);
      return;
    }
    const k = loggedSetKey(sessionFocus.plannedId, sessionFocus.setIndex);
    setSessionCompletedKeys((prev) => (prev.has(k) ? prev : new Set(prev).add(k)));
    const next = findNextPlannedSet(
      draft.plannedExercises,
      sessionFocus.plannedId,
      sessionFocus.setIndex,
    );
    if (next) {
      const pe = draft.plannedExercises.find((p) => p.id === next.plannedId);
      const ex = pe ? exerciseByName.get(pe.name) : undefined;
      setSessionFocus(next);
      setRestEndsAt(Date.now() + defaultRestSecondsForExercise(ex) * 1000);
    } else {
      setRestEndsAt(null);
    }
  }, [draft, sessionFocus, restEndsAt, exerciseByName]);

  const discardSession = useCallback(() => {
    if (!confirm("Discard this session? Nothing will be saved to your workout history.")) return;
    void clearLiveWorkoutSessionDraft();
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  async function finishSession() {
    if (!draft || !sessionReady) return;
    await clearLiveWorkoutSessionDraft();
    const sessionId = await saveCompletedWorkout(
      draft,
      sessionSetStates,
      sessionCompletedKeys,
      sessionElapsedMs,
      {
        startedAtEpoch:
          typeof sessionStartedAtEpoch === "number" && Number.isFinite(sessionStartedAtEpoch)
            ? sessionStartedAtEpoch
            : undefined,
      },
    );
    setSearchParams({}, { replace: true });
    navigate(`/history/${sessionId}`, { replace: true });
  }

  const remove = useCallback(async () => {
    if (!draft || !confirm(`Delete “${draft.name}”?`)) return;
    await deleteSessionsForWorkout(draft.id);
    await db.workouts.delete(draft.id);
    navigate("/workouts");
  }, [draft, navigate]);

  function addSelected(selected: Exercise[]) {
    if (!draft) return;
    const additions = selected.map((ex) =>
      plannedFromDTO({ name: ex.name, sets: 4, targetReps: 10 }),
    );
    void persist({
      ...draft,
      plannedExercises: [...draft.plannedExercises, ...additions],
    });
    setPickerOpen(false);
  }

  async function quickCreateExerciseFromPicker(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ex = exerciseWithName(trimmed);
    await db.exercises.add(ex);
    addSelected([ex]);
  }

  const sessionElapsedMs = useMemo(() => {
    void sessionUiTick;
    const t = sessionWallTimer;
    let ms = t.accumMs;
    if (!t.paused && t.runSince != null) ms += Date.now() - t.runSince;
    return ms;
  }, [sessionWallTimer, sessionUiTick]);

  useTopNav(() => {
    if (!draft) return null;
    return {
      variant: "detail" as const,
      leading: sessionActive ? (
        <button
          type="button"
          className="btn-icon-circle glass"
          aria-label="Leave session"
          onClick={() => discardSession()}
        >
          <ChevronLeft size={20} aria-hidden strokeWidth={2.2} />
        </button>
      ) : (
        <Link to="/workouts" className="btn-icon-circle glass" aria-label="Back to workouts">
          <ChevronLeft size={20} aria-hidden strokeWidth={2.2} />
        </Link>
      ),
      center:
        sessionActive && sessionReady ? (
          <span className="workout-session-header-timer" aria-live="polite">
            {formatSessionHms(sessionElapsedMs)}
          </span>
        ) : undefined,
      trailing: !sessionActive ? (
        <div className="workout-detail-header-actions">
          {editMode ? (
            <button
              type="button"
              className="btn-icon-circle"
              aria-label="Done reordering"
              onClick={() => setEditMode(false)}
            >
              <Check size={20} aria-hidden strokeWidth={2.5} />
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-icon-circle"
                aria-label="Reorder exercises"
                onClick={() => setEditMode(true)}
              >
                <ArrowUpDown size={20} aria-hidden strokeWidth={2} />
              </button>
              <button
                type="button"
                className="btn-icon-circle"
                aria-label="Delete workout"
                onClick={() => void remove()}
              >
                <Trash2 size={20} aria-hidden strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      ) : undefined,
    };
  }, [
    draft,
    sessionActive,
    sessionReady,
    sessionElapsedMs,
    sessionUiTick,
    editMode,
    discardSession,
    remove,
  ]);

  if (!draft) {
    return <p className="empty">Loading…</p>;
  }

  void sessionUiTick;
  const sessionNowMs = Date.now();
  const dockPlanned = sessionFocus
    ? draft.plannedExercises.find((p) => p.id === sessionFocus.plannedId)
    : undefined;
  const dockExercise = dockPlanned ? exerciseByName.get(dockPlanned.name) : undefined;
  const restRemainingSec =
    restEndsAt != null && sessionNowMs < restEndsAt
      ? Math.max(0, Math.ceil((restEndsAt - sessionNowMs) / 1000))
      : null;

  const canStart = draft.plannedExercises.length > 0;

  return (
    <>
      <div className="workout-detail-hero">
        <input
          id="workout-detail-name"
          className="workout-detail-hero__title"
          type="text"
          value={draft.name}
          placeholder="Workout name"
          aria-label="Workout name"
          readOnly={sessionActive}
          onChange={(e) => void persist({ ...draft, name: e.target.value })}
        />
        <button
          type="button"
          className="workout-detail-hero__notes"
          onClick={() => setNotesModalOpen(true)}
        >
          {draft.notes?.trim() ? draft.notes.trim() : "Add notes"}
        </button>
        <div className="workout-detail-hero__actions">
          {sessionActive ? (
            sessionReady ? (
              <>
                <button
                  type="button"
                  className="workout-detail-hero__action"
                  onClick={toggleSessionWallPause}
                >
                  <span className="workout-detail-hero__action-icon">
                    {sessionWallTimer.paused ? (
                      <Play size={22} aria-hidden strokeWidth={2} />
                    ) : (
                      <Pause size={22} aria-hidden strokeWidth={2} />
                    )}
                  </span>
                  {sessionWallTimer.paused ? "Resume" : "Pause"}
                </button>
                <button
                  type="button"
                  className="workout-detail-hero__action"
                  onClick={() => void finishSession()}
                  aria-label="Stop and save workout"
                >
                  <span className="workout-detail-hero__action-icon">
                    <Square size={20} aria-hidden strokeWidth={2} />
                  </span>
                  Stop
                </button>
              </>
            ) : (
              <p className="muted" style={{ width: "100%", textAlign: "center", margin: 0 }}>
                Preparing session…
              </p>
            )
          ) : (
            <>
              {canStart ? (
                <button
                  type="button"
                  className="workout-detail-hero__action"
                  onClick={() => setSearchParams({ session: "1" })}
                >
                  <span className="workout-detail-hero__action-icon">
                    <Play size={22} aria-hidden strokeWidth={2} />
                  </span>
                  Start
                </button>
              ) : (
                <button type="button" className="workout-detail-hero__action" disabled>
                  <span className="workout-detail-hero__action-icon">
                    <Play size={22} aria-hidden strokeWidth={2} />
                  </span>
                  Start
                </button>
              )}
              <button
                type="button"
                className="workout-detail-hero__action"
                disabled
                title="Coming later"
              >
                <span className="workout-detail-hero__action-icon">
                  <BarChart3 size={20} aria-hidden strokeWidth={2} />
                </span>
                Statistics
              </button>
              <button
                type="button"
                className="workout-detail-hero__action"
                disabled
                title="Coming later"
              >
                <span className="workout-detail-hero__action-icon">
                  <Upload size={20} aria-hidden strokeWidth={2} />
                </span>
                Share
              </button>
            </>
          )}
        </div>
      </div>

      <div className="form" style={{ marginTop: 0, marginBottom: "var(--bottom-nav-height)" }}>
        {editMode ? (
          <div className="form-section" style={{ marginTop: "1rem" }}>
            <ReorderList
              items={draft.plannedExercises}
              onReorder={(next) => void persist({ ...draft, plannedExercises: next })}
              onRemove={(pid) =>
                void persist({
                  ...draft,
                  plannedExercises: draft.plannedExercises.filter((p) => p.id !== pid),
                })
              }
            />
          </div>
        ) : draft.plannedExercises.length === 0 ? (
          <p className="muted" style={{ marginTop: "1.25rem", textAlign: "center" }}>
            No exercises yet. Add exercises below.
          </p>
        ) : sessionActive ? (
          sessionReady ? (
            <div className="workout-detail-exercises workout-detail-exercises--session-active">
              {draft.plannedExercises.map((pe) => {
                const ex = exerciseByName.get(pe.name);
                const lastForLog = lastPerformanceBySetForExercise(
                  latestEntries && latestEntries.length > 0 ? latestEntries : null,
                  pe,
                );
                const row = sessionSetStates[pe.id] ?? [];
                return (
                  <SessionExerciseCard
                    key={pe.id}
                    planned={pe}
                    exercise={ex}
                    lastBySet={lastForLog}
                    setRow={row}
                    updateSet={(setIndex, patch) => updateSessionSet(pe.id, setIndex, patch)}
                    sessionFocus={sessionFocus}
                    sessionNowMs={sessionNowMs}
                    restEndsAt={restEndsAt}
                    completedKeys={sessionCompletedKeys}
                    onSelectSet={(setIndex) => selectSessionSet(pe.id, setIndex)}
                  />
                );
              })}
            </div>
          ) : (
            <p className="empty" style={{ marginTop: "1.25rem" }}>
              Loading…
            </p>
          )
        ) : (
          <div className="workout-detail-exercises">
            {draft.plannedExercises.map((pe) => {
              const ex = exerciseByName.get(pe.name);
              const priorForLast = priorSid ? (priorEntries ?? null) : null;
              const lastBySet = lastPerformanceBySetForExercise(priorForLast, pe);
              const sessionSummary =
                latestEntries && latestEntries.length > 0
                  ? lastSessionSummaryForExercise(latestEntries, pe)
                  : null;
              return (
                <PlannedExerciseCard
                  key={pe.id}
                  planned={pe}
                  exercise={ex}
                  lastBySet={lastBySet}
                  sessionSummary={sessionSummary}
                  onChange={(next) =>
                    void persist({
                      ...draft,
                      plannedExercises: draft.plannedExercises.map((p) =>
                        p.id === pe.id ? next : p,
                      ),
                    })
                  }
                />
              );
            })}
          </div>
        )}

        {!sessionActive ? (
          <button
            type="button"
            className="btn btn-primary btn-workout-add-exercises"
            onClick={() => setPickerOpen(true)}
          >
            Add exercises
          </button>
        ) : null}
      </div>

      {sessionActive && sessionReady && sessionFocus && dockPlanned ? (
        <div className="workout-session-dock glass" role="region" aria-label="Session controls">
          {restRemainingSec != null ? (
            <div className="workout-session-dock__rest">
              <span className="workout-session-dock__rest-pill">REST {restRemainingSec}</span>
              <button
                type="button"
                className="btn btn-ghost workout-session-dock__skip"
                onClick={skipRest}
              >
                Skip
              </button>
            </div>
          ) : null}
          <div className="workout-session-dock__row">
            <div className="workout-session-dock__thumb" aria-hidden>
              {dockExercise?.imageDataUrl ? (
                <img src={dockExercise.imageDataUrl} alt="" />
              ) : (
                <Dumbbell size={20} aria-hidden strokeWidth={2} />
              )}
            </div>
            <p className="workout-session-dock__title">{dockPlanned.name}</p>
            <button
              type="button"
              className="workout-session-dock__advance"
              aria-label="Complete current set and continue"
              onClick={sessionDockAdvance}
            >
              <FastForward size={22} aria-hidden strokeWidth={2.2} />
            </button>
          </div>
        </div>
      ) : null}

      {notesModalOpen && (
        <NotesModal
          initial={draft.notes ?? ""}
          onSave={(notes) => {
            void persist({ ...draft, notes: notes.trim() ? notes.trim() : undefined });
            setNotesModalOpen(false);
          }}
          onClose={() => setNotesModalOpen(false)}
        />
      )}

      {pickerOpen && exercises && (
        <ExerciseMultiPickerModal
          exercises={exercises}
          onAdd={(sel) => addSelected(sel)}
          onQuickCreate={(name) => quickCreateExerciseFromPicker(name)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

function NotesModal({
  initial,
  onSave,
  onClose,
}: {
  initial: string;
  onSave: (notes: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workout-notes-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <header>
            <h2 id="workout-notes-title">Workout notes</h2>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
          </header>
          <div className="body">
            <textarea
              className="edit-card__textarea"
              style={{ minHeight: "8rem", marginTop: "0.5rem" }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Optional notes for this workout…"
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "0.75rem" }}
              onClick={() => onSave(text)}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function ensurePlanArrays(planned: PlannedExercise): { weights: number[]; reps: number[] } {
  const rows = planRowDefaults(planned);
  return {
    weights: rows.map((r) => r.weight),
    reps: rows.map((r) => r.reps),
  };
}

function PlannedExerciseCard({
  planned,
  exercise,
  lastBySet,
  sessionSummary,
  onChange,
}: {
  planned: PlannedExercise;
  exercise: Exercise | undefined;
  lastBySet: string[];
  sessionSummary: string | null;
  onChange: (next: PlannedExercise) => void;
}) {
  const rows = planRowDefaults(planned);
  const unitLabel = (exercise?.weightUnit === "lb" ? "LB" : "KG").toUpperCase();
  const primaryCat = exercise?.categories?.[0];
  const equip = exercise?.equipment;
  const subLine = [primaryCat, equip].filter(Boolean).join(", ");

  return (
    <article className="workout-exercise-card">
      <div className="workout-exercise-card__head">
        <div className="workout-exercise-card__thumb" aria-hidden>
          {exercise?.imageDataUrl ? (
            <img src={exercise.imageDataUrl} alt="" />
          ) : (
            <Dumbbell size={22} aria-hidden strokeWidth={2} />
          )}
        </div>
        <div className="workout-exercise-card__meta">
          <h2 className="workout-exercise-card__name">
            {exercise ? <Link to={`/exercises/${exercise.id}`}>{planned.name}</Link> : planned.name}
          </h2>
          {subLine ? <p className="workout-exercise-card__sub">{subLine}</p> : null}
          {sessionSummary ? (
            <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.78rem" }}>
              {sessionSummary}
            </p>
          ) : null}
        </div>
        <div className="workout-exercise-card__drag-handle">
          <GripHorizontal size={20} aria-hidden strokeWidth={2} />
        </div>
      </div>

      <div className="workout-set-grid" role="table" aria-label="Planned sets">
        <p className="workout-set-grid__hdr workout-set-grid__hdr--spacer"> </p>
        <p className="workout-set-grid__hdr">{unitLabel}</p>
        <p className="workout-set-grid__hdr">REPS</p>
        <p className="workout-set-grid__hdr" style={{ textAlign: "right" }}>
          LAST
        </p>
        <p className="workout-set-grid__hdr workout-set-grid__hdr--spacer" aria-hidden>
          {" "}
        </p>
        {rows.map((cell, setIndex) => (
          <FragmentRow
            key={setIndex}
            setIndex={setIndex}
            weight={cell.weight}
            reps={cell.reps}
            lastLabel={lastBySet[setIndex] ?? ""}
            removeDisabled={planned.sets <= 1}
            onWeight={(w) => {
              const { weights, reps } = ensurePlanArrays(planned);
              weights[setIndex] = w;
              onChange({
                ...planned,
                weightsBySet: weights,
                repsBySet: reps,
                targetReps: reps[setIndex] ?? planned.targetReps,
              });
            }}
            onReps={(r) => {
              const { weights, reps } = ensurePlanArrays(planned);
              reps[setIndex] = r;
              const nextTarget = reps[0] ?? r;
              onChange({
                ...planned,
                weightsBySet: weights,
                repsBySet: reps,
                targetReps: nextTarget,
              });
            }}
            onRemove={() => {
              if (planned.sets <= 1) return;
              const { weights, reps } = ensurePlanArrays(planned);
              weights.splice(setIndex, 1);
              reps.splice(setIndex, 1);
              onChange({
                ...planned,
                sets: planned.sets - 1,
                weightsBySet: weights,
                repsBySet: reps,
                targetReps: reps[0] ?? planned.targetReps,
              });
            }}
          />
        ))}
      </div>

      <div className="workout-exercise-card__footer">
        <button
          type="button"
          className="workout-exercise-card__add-set"
          onClick={() => {
            const { weights, reps } = ensurePlanArrays(planned);
            weights.push(0);
            reps.push(planned.targetReps);
            onChange({
              ...planned,
              sets: planned.sets + 1,
              weightsBySet: weights,
              repsBySet: reps,
            });
          }}
        >
          <Plus size={18} aria-hidden strokeWidth={2.2} />
          Add set
        </button>
      </div>
    </article>
  );
}

function SessionExerciseCard({
  planned,
  exercise,
  lastBySet,
  setRow,
  updateSet,
  sessionFocus,
  sessionNowMs,
  restEndsAt,
  completedKeys,
  onSelectSet,
}: {
  planned: PlannedExercise;
  exercise: Exercise | undefined;
  lastBySet: string[];
  setRow: { weight: number; reps: number }[];
  updateSet: (setIndex: number, patch: Partial<{ weight: number; reps: number }>) => void;
  sessionFocus: { plannedId: string; setIndex: number } | null;
  sessionNowMs: number;
  restEndsAt: number | null;
  completedKeys: Set<string>;
  onSelectSet: (setIndex: number) => void;
}) {
  const unitLabel = (exercise?.weightUnit === "lb" ? "LB" : "KG").toUpperCase();
  const primaryCat = exercise?.categories?.[0];
  const equip = exercise?.equipment;
  const subLine = [primaryCat, equip].filter(Boolean).join(", ");

  return (
    <article className="workout-exercise-card">
      <div className="workout-exercise-card__head">
        <div className="workout-exercise-card__thumb" aria-hidden>
          {exercise?.imageDataUrl ? (
            <img src={exercise.imageDataUrl} alt="" />
          ) : (
            <Dumbbell size={22} aria-hidden strokeWidth={2} />
          )}
        </div>
        <div className="workout-exercise-card__meta">
          <h2 className="workout-exercise-card__name">{planned.name}</h2>
          {subLine ? <p className="workout-exercise-card__sub">{subLine}</p> : null}
        </div>
        <div className="workout-exercise-card__drag-handle" aria-hidden="true">
          <GripHorizontal size={20} aria-hidden strokeWidth={2} style={{ opacity: 0.2 }} />
        </div>
      </div>

      <div
        className="workout-set-grid workout-set-grid--session"
        role="table"
        aria-label="Session sets"
      >
        <p className="workout-set-grid__hdr workout-set-grid__hdr--spacer"> </p>
        <p className="workout-set-grid__hdr">{unitLabel}</p>
        <p className="workout-set-grid__hdr">REPS</p>
        <p className="workout-set-grid__hdr" style={{ textAlign: "right" }}>
          LAST
        </p>
        {Array.from({ length: planned.sets }, (_, setIndex) => {
          const cell = setRow[setIndex];
          if (!cell) return null;
          const k = loggedSetKey(planned.id, setIndex);
          const isDone = completedKeys.has(k);
          const isFocused =
            sessionFocus != null &&
            sessionFocus.plannedId === planned.id &&
            sessionFocus.setIndex === setIndex;
          const inRest = isFocused && restEndsAt != null && sessionNowMs < restEndsAt;
          let rowVariant: "idle" | "done" | "go" | "rest";
          if (isDone) rowVariant = "done";
          else if (isFocused && inRest) rowVariant = "rest";
          else if (isFocused) rowVariant = "go";
          else rowVariant = "idle";
          const restRemainingSec =
            rowVariant === "rest" && restEndsAt != null
              ? Math.max(0, Math.ceil((restEndsAt - sessionNowMs) / 1000))
              : null;
          return (
            <SessionSetRow
              key={setIndex}
              setIndex={setIndex}
              weight={cell.weight}
              reps={cell.reps}
              lastLabel={lastBySet[setIndex] ?? ""}
              onWeight={(w) => updateSet(setIndex, { weight: w })}
              onReps={(r) => updateSet(setIndex, { reps: r })}
              rowVariant={rowVariant}
              restRemainingSec={restRemainingSec}
              onSelectRow={() => onSelectSet(setIndex)}
            />
          );
        })}
      </div>
    </article>
  );
}

function SessionSetRow({
  setIndex,
  weight,
  reps,
  lastLabel,
  onWeight,
  onReps,
  rowVariant,
  restRemainingSec,
  onSelectRow,
}: {
  setIndex: number;
  weight: number;
  reps: number;
  lastLabel: string;
  onWeight: (w: number) => void;
  onReps: (r: number) => void;
  rowVariant: "idle" | "done" | "go" | "rest";
  restRemainingSec: number | null;
  onSelectRow: () => void;
}) {
  const rowToneClass = `workout-set-grid__row--session-${rowVariant}`;
  const idxText =
    rowVariant === "rest" && restRemainingSec != null
      ? `REST ${restRemainingSec}`
      : rowVariant === "go"
        ? "GO"
        : String(setIndex + 1);

  return (
    <div className={`workout-set-grid__row ${rowToneClass}`}>
      <span
        className="workout-set-grid__idx"
        title="Select set"
        onPointerDown={() => onSelectRow()}
        role="presentation"
      >
        {idxText}
      </span>
      <input
        className="workout-set-grid__input"
        inputMode="decimal"
        aria-label={`Set ${setIndex + 1} weight`}
        value={weight === 0 ? "" : String(weight)}
        onPointerDown={(e: PointerEvent) => e.stopPropagation()}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (raw === "") {
            onWeight(0);
            return;
          }
          const n = parseFloat(raw.replace(",", "."));
          if (!Number.isFinite(n) || n < 0) return;
          onWeight(n);
        }}
      />
      <input
        className="workout-set-grid__input"
        inputMode="numeric"
        aria-label={`Set ${setIndex + 1} reps`}
        value={String(reps)}
        onPointerDown={(e: PointerEvent) => e.stopPropagation()}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (raw === "") return;
          const n = parseInt(raw, 10);
          if (!Number.isFinite(n) || n < 1) return;
          onReps(n);
        }}
      />
      {rowVariant === "done" ? (
        <span
          className="workout-set-grid__last"
          aria-label="Set completed"
          onPointerDown={() => onSelectRow()}
          role="presentation"
        >
          <Check size={18} aria-hidden strokeWidth={2.5} className="workout-set-grid__done-check" />
        </span>
      ) : (
        <span
          className="workout-set-grid__last"
          onPointerDown={() => onSelectRow()}
          role="presentation"
        >
          {lastLabel}
        </span>
      )}
    </div>
  );
}

function FragmentRow({
  setIndex,
  weight,
  reps,
  lastLabel,
  removeDisabled,
  onWeight,
  onReps,
  onRemove,
}: {
  setIndex: number;
  weight: number;
  reps: number;
  lastLabel: string;
  removeDisabled: boolean;
  onWeight: (w: number) => void;
  onReps: (r: number) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <span className="workout-set-grid__idx">{setIndex + 1}</span>
      <input
        className="workout-set-grid__input"
        inputMode="decimal"
        aria-label={`Set ${setIndex + 1} weight`}
        value={weight === 0 ? "" : String(weight)}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (raw === "") {
            onWeight(0);
            return;
          }
          const n = parseFloat(raw.replace(",", "."));
          if (!Number.isFinite(n) || n < 0) return;
          onWeight(n);
        }}
      />
      <input
        className="workout-set-grid__input"
        inputMode="numeric"
        aria-label={`Set ${setIndex + 1} reps`}
        value={String(reps)}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (raw === "") return;
          const n = parseInt(raw, 10);
          if (!Number.isFinite(n) || n < 1) return;
          onReps(n);
        }}
      />
      <span className="workout-set-grid__last">{lastLabel}</span>
      <button
        type="button"
        className="workout-set-grid__remove"
        aria-label={`Remove set ${setIndex + 1}`}
        disabled={removeDisabled}
        onClick={onRemove}
      >
        <Trash2 size={16} aria-hidden strokeWidth={2} />
      </button>
    </>
  );
}

function ReorderList({
  items,
  onReorder,
  onRemove,
}: {
  items: PlannedExercise[];
  onReorder: (next: PlannedExercise[]) => void;
  onRemove: (id: string) => void;
}) {
  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(j, 0, row);
    onReorder(next);
  }

  return (
    <div className="reorder">
      {items.map((pe, index) => (
        <div key={pe.id} className="reorder-row">
          <span>{pe.name}</span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => move(index, -1)}
            disabled={index === 0}
          >
            ↑
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => move(index, 1)}
            disabled={index === items.length - 1}
          >
            ↓
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onRemove(pe.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
