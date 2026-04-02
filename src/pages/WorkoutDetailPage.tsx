import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CategoryPickerModal } from "../components/CategoryPickerModal";
import { db } from "../db/database";
import { deleteSessionsForWorkout, lastSessionSummaryForExercise } from "../db/workoutHistory";
import type { Exercise, ExerciseCategory, PlannedExercise, Workout } from "../model/types";
import { plannedFromDTO } from "../model/types";

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const rows = useLiveQuery(() => db.workouts.toArray(), []);
  const workout = id && rows ? rows.find((w) => w.id === id) : undefined;
  const [draft, setDraft] = useState<Workout | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const exercises = useLiveQuery(() => db.exercises.orderBy("name").toArray(), []);
  const sessionsForWorkout = useLiveQuery(
    () => (id ? db.workoutSessions.where("workoutId").equals(id).toArray() : []),
    [id]
  );
  const latestSession = sessionsForWorkout
    ? [...sessionsForWorkout].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))[0]
    : undefined;
  const latestEntries = useLiveQuery(
    () =>
      latestSession
        ? db.loggedExerciseEntries.where("sessionId").equals(latestSession.id).toArray()
        : [],
    [latestSession?.id]
  );

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

  return (
    <>
      <div className="toolbar">
        <Link to="/workouts" className="btn btn-ghost">
          ← Back
        </Link>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="btn btn-ghost" onClick={() => setEditMode((e) => !e)}>
            {editMode ? "Done" : "Edit order"}
          </button>
          <button type="button" className="btn btn-danger" onClick={() => void remove()}>
            Delete
          </button>
        </div>
      </div>
      <div className="form">
        <div className="form-section">
          {draft.plannedExercises.length > 0 ? (
            <Link
              to={`/workouts/${draft.id}/session`}
              className="btn btn-primary"
              style={{ display: "block", width: "100%", textAlign: "center", marginBottom: "0.5rem" }}
            >
              Start workout
            </Link>
          ) : (
            <button type="button" className="btn btn-primary" disabled style={{ width: "100%", marginBottom: "0.5rem" }}>
              Start workout
            </button>
          )}
          {draft.plannedExercises.length === 0 && (
            <p className="muted" style={{ marginTop: 0, fontSize: "0.9rem" }}>
              Add exercises to enable logging.
            </p>
          )}
        </div>
        <div className="form-section">
          <h2>Workout name</h2>
          <div className="field">
            <label htmlFor="workout-name">Name</label>
            <input
              id="workout-name"
              type="text"
              value={draft.name}
              onChange={(e) => void persist({ ...draft, name: e.target.value })}
            />
          </div>
        </div>
        <div className="form-section">
          <h2>Exercises</h2>
          {editMode ? (
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
          ) : draft.plannedExercises.length === 0 ? (
            <p className="muted">No exercises added yet.</p>
          ) : (
            draft.plannedExercises.map((pe) => (
              <PlannedEditor
                key={pe.id}
                planned={pe}
                lastSummary={
                  latestEntries && latestEntries.length > 0
                    ? lastSessionSummaryForExercise(latestEntries, pe)
                    : null
                }
                onChange={(next) =>
                  void persist({
                    ...draft,
                    plannedExercises: draft.plannedExercises.map((p) =>
                      p.id === pe.id ? next : p
                    ),
                  })
                }
              />
            ))
          )}
        </div>
        <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: "0.75rem" }} onClick={() => setPickerOpen(true)}>
          Add exercise
        </button>
      </div>
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

function PlannedEditor({
  planned,
  lastSummary,
  onChange,
}: {
  planned: PlannedExercise;
  lastSummary: string | null;
  onChange: (next: PlannedExercise) => void;
}) {
  return (
    <div className="planned-card">
      <h3>{planned.name}</h3>
      {lastSummary && <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>{lastSummary}</p>}
      <div className="field">
        <label>Target reps</label>
        <div className="stepper">
          <button type="button" onClick={() => onChange({ ...planned, targetReps: Math.max(1, planned.targetReps - 1) })}>
            −
          </button>
          <span style={{ minWidth: "2rem", textAlign: "center" }}>{planned.targetReps}</span>
          <button type="button" onClick={() => onChange({ ...planned, targetReps: Math.min(30, planned.targetReps + 1) })}>
            +
          </button>
        </div>
      </div>
      <div className="field">
        <label>Sets</label>
        <div className="stepper">
          <button type="button" onClick={() => onChange({ ...planned, sets: Math.max(1, planned.sets - 1) })}>
            −
          </button>
          <span style={{ minWidth: "2rem", textAlign: "center" }}>{planned.sets}</span>
          <button type="button" onClick={() => onChange({ ...planned, sets: Math.min(10, planned.sets + 1) })}>
            +
          </button>
        </div>
      </div>
    </div>
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
          <button type="button" className="btn btn-ghost" onClick={() => move(index, 1)} disabled={index === items.length - 1}>
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
