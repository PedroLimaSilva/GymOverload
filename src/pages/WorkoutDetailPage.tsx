import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CategoryPickerModal } from "../components/CategoryPickerModal";
import {
  IconChartBars,
  IconChevronLeft,
  IconDumbbell,
  IconLink,
  IconMenu,
  IconPin,
  IconPlay,
  IconPlus,
  IconReorderVertical,
  IconShareUp,
  IconStopwatch,
} from "../components/Icons";
import { OverflowMenu } from "../components/OverflowMenu";
import { ScreenHeader } from "../components/ScreenHeader";
import { db } from "../db/database";
import {
  deleteSessionsForWorkout,
  lastPerformanceBySetForExercise,
  lastSessionSummaryForExercise,
  priorSessionId,
} from "../db/workoutHistory";
import type { Exercise, ExerciseCategory, PlannedExercise, Workout } from "../model/types";
import { planRowDefaults, plannedFromDTO } from "../model/types";

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const rows = useLiveQuery(() => db.workouts.toArray(), []);
  const workout = id && rows ? rows.find((w) => w.id === id) : undefined;
  const [draft, setDraft] = useState<Workout | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const exercises = useLiveQuery(() => db.exercises.orderBy("name").toArray(), []);
  const sessionsForWorkout = useLiveQuery(
    () => (id ? db.workoutSessions.where("workoutId").equals(id).toArray() : []),
    [id]
  );
  const sortedSessions = useMemo(() => {
    if (!sessionsForWorkout) return [];
    return [...sessionsForWorkout].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  }, [sessionsForWorkout]);
  const latestSession = sortedSessions[0];
  const priorSid = priorSessionId(sortedSessions);
  const priorEntries = useLiveQuery(
    () => (priorSid ? db.loggedExerciseEntries.where("sessionId").equals(priorSid).toArray() : []),
    [priorSid]
  );
  const latestEntries = useLiveQuery(
    () =>
      latestSession
        ? db.loggedExerciseEntries.where("sessionId").equals(latestSession.id).toArray()
        : [],
    [latestSession?.id]
  );

  const exerciseByName = useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const ex of exercises ?? []) m.set(ex.name, ex);
    return m;
  }, [exercises]);

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

  async function remove() {
    if (!draft || !confirm(`Delete “${draft.name}”?`)) return;
    await deleteSessionsForWorkout(draft.id);
    await db.workouts.delete(draft.id);
    navigate("/workouts");
  }

  function addSelected(selected: Exercise[]) {
    if (!draft) return;
    const additions = selected.map((ex) =>
      plannedFromDTO({ name: ex.name, sets: 4, targetReps: 10 })
    );
    void persist({
      ...draft,
      plannedExercises: [...draft.plannedExercises, ...additions],
    });
    setPickerOpen(false);
  }

  if (!draft) {
    return <p className="empty">Loading…</p>;
  }

  const canStart = draft.plannedExercises.length > 0;

  return (
    <>
      <ScreenHeader
        variant="detail"
        leading={
          <Link to="/workouts" className="btn-icon-circle glass" aria-label="Back to workouts">
            <IconChevronLeft />
          </Link>
        }
        center={<span aria-hidden>0:00:00</span>}
        trailing={
          <div className="workout-detail-header-actions">
            <button type="button" className="btn-icon-circle" disabled aria-label="Timer (session only)">
              <IconStopwatch />
            </button>
            <button
              type="button"
              className="btn-icon-circle"
              aria-label={editMode ? "Done reordering" : "Reorder exercises"}
              aria-pressed={editMode}
              onClick={() => setEditMode((e) => !e)}
            >
              <IconReorderVertical />
            </button>
            <OverflowMenu
              label="Workout actions"
              items={[
                {
                  label: editMode ? "Done reordering" : "Edit exercise order…",
                  onSelect: () => setEditMode((e) => !e),
                },
                { label: "Delete workout", onSelect: () => void remove() },
              ]}
            />
          </div>
        }
      />

      <div className="workout-detail-hero">
        <input
          id="workout-detail-name"
          className="workout-detail-hero__title"
          type="text"
          value={draft.name}
          placeholder="Workout name"
          aria-label="Workout name"
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
          {canStart ? (
            <Link
              to={`/workouts/${draft.id}/session`}
              className="workout-detail-hero__action"
            >
              <span className="workout-detail-hero__action-icon">
                <IconPlay />
              </span>
              Start
            </Link>
          ) : (
            <button type="button" className="workout-detail-hero__action" disabled>
              <span className="workout-detail-hero__action-icon">
                <IconPlay />
              </span>
              Start
            </button>
          )}
          <button type="button" className="workout-detail-hero__action" disabled title="Coming later">
            <span className="workout-detail-hero__action-icon">
              <IconChartBars />
            </span>
            Statistics
          </button>
          <button type="button" className="workout-detail-hero__action" disabled title="Coming later">
            <span className="workout-detail-hero__action-icon">
              <IconShareUp />
            </span>
            Share
          </button>
        </div>
      </div>

      <div className="form" style={{ marginTop: 0 }}>
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
                        p.id === pe.id ? next : p
                      ),
                    })
                  }
                  onRemove={() =>
                    void persist({
                      ...draft,
                      plannedExercises: draft.plannedExercises.filter((p) => p.id !== pe.id),
                    })
                  }
                />
              );
            })}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary btn-workout-add-exercises"
          onClick={() => setPickerOpen(true)}
        >
          Add exercises
        </button>
      </div>

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
  onRemove,
}: {
  planned: PlannedExercise;
  exercise: Exercise | undefined;
  lastBySet: string[];
  sessionSummary: string | null;
  onChange: (next: PlannedExercise) => void;
  onRemove: () => void;
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
            <IconDumbbell />
          )}
        </div>
        <div className="workout-exercise-card__meta">
          <h2 className="workout-exercise-card__name">
            {exercise ? (
              <Link to={`/exercises/${exercise.id}`}>{planned.name}</Link>
            ) : (
              planned.name
            )}
          </h2>
          {subLine ? <p className="workout-exercise-card__sub">{subLine}</p> : null}
          {sessionSummary ? (
            <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.78rem" }}>
              {sessionSummary}
            </p>
          ) : null}
        </div>
        <div className="workout-exercise-card__head-actions">
          <button
            type="button"
            className="workout-exercise-card__icon-btn workout-exercise-card__icon-btn--accent"
            disabled
            aria-label="Pin (coming later)"
          >
            <IconPin />
          </button>
          <OverflowMenu
            label="Exercise actions"
            items={[{ label: "Remove from workout", onSelect: onRemove }]}
            triggerClassName="workout-exercise-card__icon-btn"
            icon={<IconMenu />}
          />
        </div>
      </div>

      <div className="workout-set-grid" role="table" aria-label="Planned sets">
        <p className="workout-set-grid__hdr workout-set-grid__hdr--spacer"> </p>
        <p className="workout-set-grid__hdr">{unitLabel}</p>
        <p className="workout-set-grid__hdr">REPS</p>
        <p className="workout-set-grid__hdr" style={{ textAlign: "right" }}>
          LAST
        </p>
        {rows.map((cell, setIndex) => (
          <FragmentRow
            key={setIndex}
            setIndex={setIndex}
            weight={cell.weight}
            reps={cell.reps}
            lastLabel={lastBySet[setIndex] ?? ""}
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
          <IconPlus />
          Add set
        </button>
        <span className="workout-exercise-card__chain" aria-hidden title="Superset (coming later)">
          <IconLink />
        </span>
      </div>
    </article>
  );
}

function FragmentRow({
  setIndex,
  weight,
  reps,
  lastLabel,
  onWeight,
  onReps,
}: {
  setIndex: number;
  weight: number;
  reps: number;
  lastLabel: string;
  onWeight: (w: number) => void;
  onReps: (r: number) => void;
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
          <button type="button" className="btn btn-ghost" onClick={() => move(index, -1)} disabled={index === 0}>
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

function ExerciseMultiPickerModal({
  exercises,
  onAdd,
  onClose,
}: {
  exercises: Exercise[];
  onAdd: (selected: Exercise[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterCats, setFilterCats] = useState<ExerciseCategory[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = exercises.filter((ex) => {
    const q = search.trim().toLowerCase();
    const okSearch = !q || ex.name.toLowerCase().includes(q);
    const okCat =
      filterCats.length === 0 || ex.categories.some((c) => filterCats.includes(c));
    return okSearch && okCat;
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    const list = exercises.filter((e) => selected.has(e.id));
    onAdd(list);
    setSelected(new Set());
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="multi-picker-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ maxWidth: 520, maxHeight: "90dvh" }} onClick={(e) => e.stopPropagation()}>
        <header>
          <h2 id="multi-picker-title">Add exercises</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </header>
        <div className="body">
          <div className="toolbar" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setFilterOpen(true)}>
              Filter
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={selected.size === 0}
              onClick={() => confirm()}
            >
              Add {selected.size || ""}
            </button>
          </div>
          {filterCats.length > 0 && (
            <div className="chips">
              {filterCats.map((c) => (
                <span key={c} className="chip">
                  {c}
                </span>
              ))}
            </div>
          )}
          <input
            className="search"
            type="search"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="list" style={{ maxHeight: "45dvh", overflowY: "auto" }}>
            {filtered.map((ex) => (
              <li key={ex.id}>
                <button type="button" className="row" onClick={() => toggle(ex.id)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                    <div>
                      <p className="row-title" style={{ margin: 0 }}>
                        {ex.name}
                      </p>
                      <p className="row-sub" style={{ margin: "0.25rem 0 0" }}>
                        {ex.categories.join(", ")}
                      </p>
                    </div>
                    <input type="checkbox" readOnly checked={selected.has(ex.id)} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {filterOpen && (
        <CategoryPickerModal
          title="Filter by category"
          showClear
          selected={filterCats}
          onChange={setFilterCats}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </div>
  );
}
