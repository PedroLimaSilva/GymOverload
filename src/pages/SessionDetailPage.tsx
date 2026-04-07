import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { BarChart3, ChevronLeft, Dumbbell, Heart, Plus, Trash2, Upload } from "lucide-react";
import { ExerciseMultiPickerModal } from "../components/ExerciseMultiPickerModal";
import { db } from "../db/database";
import { useTopNav } from "../layout/TopNavContext";
import {
  deleteSession,
  getSessionById,
  getSessionExerciseBlocks,
  putSessionWithLoggedEntries,
} from "../db/workoutHistory";
import type { Exercise, SessionExerciseSnapshot, Workout, WorkoutSession } from "../model/types";
import { exerciseWithName, newId, plannedFromDTO, sessionTrainingVolume } from "../model/types";

type SessionDetailLoad =
  | { status: "not_found" }
  | { status: "no_workout"; session: WorkoutSession }
  | { status: "ready"; session: WorkoutSession; workout: Workout };

function formatSessionHeaderDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDurationHm(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h:${String(m).padStart(2, "0")}m`;
}

function parseDurationToMs(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  const hm = t.match(/^(\d+)\s*:\s*(\d{1,2})$/);
  if (hm) {
    const h = parseInt(hm[1]!, 10);
    const m = parseInt(hm[2]!, 10);
    if (!Number.isFinite(h) || !Number.isFinite(m) || m >= 60 || h < 0 || m < 0) return null;
    return (h * 3600 + m * 60) * 1000;
  }
  const n = parseFloat(t.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 60 * 1000);
}

function SessionNotesModal({
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
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-notes-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2 id="session-notes-title">Session notes</h2>
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
            placeholder="Notes for this session only…"
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
  );
}

function DurationEditModal({
  initialMs,
  onSave,
  onClose,
}: {
  initialMs: number;
  onSave: (ms: number) => void;
  onClose: () => void;
}) {
  const h0 = Math.floor(initialMs / 3600000);
  const m0 = Math.floor((initialMs % 3600000) / 60000);
  const [text, setText] = useState(`${h0}:${String(m0).padStart(2, "0")}`);
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-duration-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2 id="session-duration-title">Session duration</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </header>
        <div className="body">
          <p className="muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
            Enter hours and minutes as h:mm (e.g. 1:15), or minutes only (e.g. 45).
          </p>
          <input
            className="edit-card__textarea"
            style={{ marginTop: "0.5rem", minHeight: "2.5rem" }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            inputMode="text"
            autoComplete="off"
            aria-label="Duration"
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "0.75rem" }}
            onClick={() => {
              const ms = parseDurationToMs(text);
              if (ms == null) return;
              onSave(ms);
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function SessionDetailPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const goBackFromSession = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/history");
    }
  }, [navigate]);
  const loadState = useLiveQuery(async (): Promise<SessionDetailLoad> => {
    if (!sessionId) return { status: "not_found" };
    const session = await db.workoutSessions.get(sessionId);
    if (!session) return { status: "not_found" };
    const workout = await db.workouts.get(session.workoutId);
    if (!workout) return { status: "no_workout", session };
    return { status: "ready", session, workout };
  }, [sessionId]);
  const exercises = useLiveQuery(() => db.exercises.orderBy("name").toArray(), []);

  const [blocks, setBlocks] = useState<SessionExerciseSnapshot[]>([]);
  const [blocksReady, setBlocksReady] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);

  const session = loadState?.status === "ready" ? loadState.session : undefined;
  const workout = loadState?.status === "ready" ? loadState.workout : undefined;

  const loadReadyKey =
    loadState?.status === "ready" ? `${loadState.session.id}\0${loadState.workout.id}` : null;

  useEffect(() => {
    if (loadState?.status !== "ready") return;
    const { session: s, workout: w } = loadState;
    if (s.workoutId !== w.id) {
      navigate("/workouts", { replace: true });
      return;
    }
    let cancelled = false;
    setBlocksReady(false);
    void (async () => {
      const b = await getSessionExerciseBlocks(s, w);
      if (!cancelled) {
        setBlocks(b);
        setBlocksReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // deps: loadReadyKey only — same session row updates (notes/duration) must not reset blocks.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadState identity changes on every live query tick
  }, [loadReadyKey, navigate]);

  useEffect(() => {
    if (loadState?.status !== "ready") return;
    const s = loadState.session;
    setDurationMs(
      typeof s.durationMs === "number" && Number.isFinite(s.durationMs)
        ? Math.max(0, s.durationMs)
        : 0,
    );
  }, [loadState]);

  const exerciseByName = useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const ex of exercises ?? []) m.set(ex.name, ex);
    return m;
  }, [exercises]);

  const volume = useMemo(
    () => sessionTrainingVolume(blocks, exerciseByName),
    [blocks, exerciseByName],
  );

  const volumeUnitLabel = useMemo(() => {
    for (const b of blocks) {
      const u = exerciseByName.get(b.exerciseName)?.weightUnit;
      if (u === "lb") return "lb";
    }
    return "kg";
  }, [blocks, exerciseByName]);

  const flushSession = useCallback(
    async (nextBlocks: SessionExerciseSnapshot[], nextDurationMs?: number) => {
      if (!sessionId) return;
      const current = await getSessionById(sessionId);
      if (!current) return;
      const d =
        nextDurationMs !== undefined
          ? nextDurationMs
          : typeof current.durationMs === "number" && Number.isFinite(current.durationMs)
            ? current.durationMs
            : 0;
      await putSessionWithLoggedEntries({
        ...current,
        durationMs: Math.max(0, Math.round(d)),
        sessionExercises: nextBlocks,
      });
    },
    [sessionId],
  );

  async function addSelected(selected: Exercise[]) {
    if (loadState?.status !== "ready") return;
    const additions: SessionExerciseSnapshot[] = [];
    for (const ex of selected) {
      const planned = plannedFromDTO({ name: ex.name, sets: 4, targetReps: 10 }, newId());
      additions.push({
        plannedExerciseId: planned.id,
        exerciseName: planned.name,
        sets: Array.from({ length: planned.sets }, () => ({
          weight: 0,
          reps: planned.targetReps,
        })),
      });
    }
    setBlocks((prev) => {
      const next = [...prev, ...additions];
      void flushSession(next);
      return next;
    });
    setPickerOpen(false);
  }

  async function quickCreateExerciseFromPicker(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ex = exerciseWithName(trimmed);
    await db.exercises.add(ex);
    await addSelected([ex]);
  }

  const removeThisSession = useCallback(async () => {
    if (!sessionId) return;
    if (
      !confirm(
        "Delete this workout session from history? The workout plan stays; other sessions are kept.",
      )
    )
      return;
    await deleteSession(sessionId);
    navigate("/history", { replace: true });
  }, [sessionId, navigate]);

  const topNavKey =
    loadState?.status === "ready" && blocksReady
      ? `${loadState.session.id}\0${loadState.session.completedAt}`
      : null;

  useTopNav(() => {
    if (!topNavKey || loadState?.status !== "ready") return null;
    const s = loadState.session;
    return {
      variant: "detail" as const,
      leading: (
        <button
          type="button"
          className="btn-icon-circle glass"
          aria-label="Back"
          onClick={goBackFromSession}
        >
          <ChevronLeft size={20} aria-hidden strokeWidth={2.2} />
        </button>
      ),
      center: formatSessionHeaderDate(s.completedAt),
      trailing: (
        <div className="workout-detail-header-actions">
          <button
            type="button"
            className="btn-icon-circle"
            aria-label="Delete session from history"
            onClick={() => void removeThisSession()}
          >
            <Trash2 size={20} aria-hidden strokeWidth={2} />
          </button>
        </div>
      ),
    };
  }, [topNavKey, goBackFromSession, removeThisSession]);

  if (loadState?.status === "not_found") {
    return <Navigate to="/history" replace />;
  }
  if (loadState?.status === "no_workout") {
    return <Navigate to="/history" replace />;
  }

  if (loadState?.status !== "ready" || !session || !workout || !blocksReady) {
    return <p className="empty">Loading…</p>;
  }

  const volDisplay =
    volumeUnitLabel === "lb"
      ? `${Number.isInteger(volume) ? volume : volume.toFixed(1)} lb`
      : `${Number.isInteger(volume) ? volume : volume.toFixed(1)} kg`;

  return (
    <>
      <div className="workout-detail-hero">
        <h1 className="workout-detail-hero__title" style={{ margin: 0 }}>
          {workout.name}
        </h1>
        <button
          type="button"
          className="workout-detail-hero__notes"
          onClick={() => setNotesModalOpen(true)}
        >
          {session.notes?.trim() ? session.notes.trim() : "Add notes"}
        </button>

        <div className="session-detail-stats">
          <button
            type="button"
            className="session-detail-stat session-detail-stat--tap"
            onClick={() => setDurationModalOpen(true)}
          >
            <span className="session-detail-stat__label">Duration</span>
            <span className="session-detail-stat__value">{formatDurationHm(durationMs)}</span>
          </button>
          <div className="session-detail-stat">
            <span className="session-detail-stat__label">Volume</span>
            <span className="session-detail-stat__value">{volDisplay}</span>
          </div>
          <div className="session-detail-stat">
            <span className="session-detail-stat__label">Calories</span>
            <span className="session-detail-stat__value session-detail-stat__dash">—</span>
          </div>
          <div className="session-detail-stat">
            <span className="session-detail-stat__label">Heart rate</span>
            <span className="session-detail-stat__value session-detail-stat__dash">—</span>
          </div>
        </div>

        <div className="workout-detail-hero__actions">
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
          <button
            type="button"
            className="workout-detail-hero__action"
            disabled
            title="Coming later"
          >
            <span className="workout-detail-hero__action-icon">
              <Heart size={20} aria-hidden strokeWidth={2} />
            </span>
            Heart rate
          </button>
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
        </div>
      </div>

      <div className="form" style={{ marginTop: 0, marginBottom: "7rem" }}>
        <div className="workout-detail-exercises">
          {blocks.map((block) => {
            const ex = exerciseByName.get(block.exerciseName);
            const primaryCat = ex?.categories?.[0];
            const equip = ex?.equipment;
            const subLine = [primaryCat, equip].filter(Boolean).join(", ");
            const unitLabel = (ex?.weightUnit === "lb" ? "LB" : "KG").toUpperCase();
            return (
              <article key={block.plannedExerciseId} className="workout-exercise-card">
                <div className="workout-exercise-card__head">
                  <div className="workout-exercise-card__thumb" aria-hidden>
                    {ex?.imageDataUrl ? (
                      <img src={ex.imageDataUrl} alt="" />
                    ) : (
                      <Dumbbell size={22} aria-hidden strokeWidth={2} />
                    )}
                  </div>
                  <div className="workout-exercise-card__meta">
                    <h2 className="workout-exercise-card__name">
                      {ex ? (
                        <Link to={`/exercises/${ex.id}`}>{block.exerciseName}</Link>
                      ) : (
                        block.exerciseName
                      )}
                    </h2>
                    {subLine ? <p className="workout-exercise-card__sub">{subLine}</p> : null}
                  </div>
                  <div className="session-detail-exercise-stats" aria-hidden>
                    <span className="muted" style={{ fontSize: "0.65rem" }}>
                      AVG — · MAX — · KCAL —
                    </span>
                  </div>
                </div>

                <div className="workout-set-grid" role="table" aria-label="Logged sets">
                  <p className="workout-set-grid__hdr workout-set-grid__hdr--spacer"> </p>
                  <p className="workout-set-grid__hdr">{unitLabel}</p>
                  <p className="workout-set-grid__hdr">REPS</p>
                  <p className="workout-set-grid__hdr" style={{ textAlign: "right" }}>
                    {" "}
                  </p>
                  <p className="workout-set-grid__hdr workout-set-grid__hdr--spacer" aria-hidden>
                    {" "}
                  </p>
                  {block.sets.map((cell, setIndex) => (
                    <SessionDetailSetRow
                      key={setIndex}
                      setIndex={setIndex}
                      weight={cell.weight}
                      reps={cell.reps}
                      removeDisabled={block.sets.length <= 1}
                      onWeight={(w) => {
                        setBlocks((prev) => {
                          const next = prev.map((b) =>
                            b.plannedExerciseId === block.plannedExerciseId
                              ? {
                                  ...b,
                                  sets: b.sets.map((s, i) =>
                                    i === setIndex ? { ...s, weight: w } : s,
                                  ),
                                }
                              : b,
                          );
                          void flushSession(next);
                          return next;
                        });
                      }}
                      onReps={(r) => {
                        setBlocks((prev) => {
                          const next = prev.map((b) =>
                            b.plannedExerciseId === block.plannedExerciseId
                              ? {
                                  ...b,
                                  sets: b.sets.map((s, i) =>
                                    i === setIndex ? { ...s, reps: r } : s,
                                  ),
                                }
                              : b,
                          );
                          void flushSession(next);
                          return next;
                        });
                      }}
                      onRemove={() => {
                        setBlocks((prev) => {
                          const next = prev.map((b) => {
                            if (b.plannedExerciseId !== block.plannedExerciseId) return b;
                            if (b.sets.length <= 1) return b;
                            return {
                              ...b,
                              sets: b.sets.filter((_, i) => i !== setIndex),
                            };
                          });
                          void flushSession(next);
                          return next;
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
                      setBlocks((prev) => {
                        const next = prev.map((b) => {
                          if (b.plannedExerciseId !== block.plannedExerciseId) return b;
                          const lastReps = b.sets[b.sets.length - 1]?.reps ?? 10;
                          return { ...b, sets: [...b.sets, { weight: 0, reps: lastReps }] };
                        });
                        void flushSession(next);
                        return next;
                      });
                    }}
                  >
                    <Plus size={18} aria-hidden strokeWidth={2.2} />
                    Add set
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <button
          type="button"
          className="btn btn-primary btn-workout-add-exercises"
          onClick={() => setPickerOpen(true)}
        >
          Add exercises
        </button>
      </div>

      {durationModalOpen ? (
        <DurationEditModal
          initialMs={durationMs}
          onSave={(ms) => {
            setDurationMs(ms);
            void flushSession(blocks, ms);
            setDurationModalOpen(false);
          }}
          onClose={() => setDurationModalOpen(false)}
        />
      ) : null}

      {notesModalOpen ? (
        <SessionNotesModal
          initial={session.notes ?? ""}
          onSave={(text) => {
            void (async () => {
              if (!sessionId) return;
              const current = await getSessionById(sessionId);
              if (!current) return;
              const trimmed = text.trim();
              await db.workoutSessions.put({
                ...current,
                notes: trimmed ? trimmed : undefined,
              });
              setNotesModalOpen(false);
            })();
          }}
          onClose={() => setNotesModalOpen(false)}
        />
      ) : null}

      {pickerOpen && exercises ? (
        <ExerciseMultiPickerModal
          exercises={exercises}
          onAdd={(sel) => void addSelected(sel)}
          onQuickCreate={(name) => void quickCreateExerciseFromPicker(name)}
          onClose={() => setPickerOpen(false)}
          quickCreateHint="Saves to your exercise list; adds to this session only (not the workout plan)."
        />
      ) : null}
    </>
  );
}

function SessionDetailSetRow({
  setIndex,
  weight,
  reps,
  removeDisabled,
  onWeight,
  onReps,
  onRemove,
}: {
  setIndex: number;
  weight: number;
  reps: number;
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
      <span className="workout-set-grid__last" />
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
