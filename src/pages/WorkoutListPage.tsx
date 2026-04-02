import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../db/database";
import { deleteSessionsForWorkout } from "../db/workoutHistory";
import type { Workout } from "../model/types";
import { newId } from "../model/types";

export function WorkoutListPage() {
  const navigate = useNavigate();
  const workouts = useLiveQuery(() => db.workouts.orderBy("name").toArray(), []);

  async function addWorkout() {
    const w: Workout = {
      id: newId(),
      name: "New workout",
      plannedExercises: [],
    };
    await db.workouts.add(w);
    navigate(`/workouts/${w.id}`);
  }

  async function removeWorkout(e: React.MouseEvent, w: Workout) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete “${w.name}”?`)) return;
    await deleteSessionsForWorkout(w.id);
    await db.workouts.delete(w.id);
  }

  return (
    <>
      <div className="toolbar">
        <span className="muted" style={{ flex: 1 }}>
          Workouts
        </span>
        <button type="button" className="btn btn-primary" onClick={() => void addWorkout()}>
          New workout
        </button>
      </div>
      {!workouts && <p className="empty">Loading…</p>}
      {workouts && workouts.length === 0 && <p className="empty">No workouts yet.</p>}
      {workouts && workouts.length > 0 && (
        <ul className="list">
          {workouts.map((w) => (
            <li key={w.id}>
              <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                <Link to={`/workouts/${w.id}`} style={{ flex: 1, paddingRight: "0.5rem" }}>
                  <p className="row-title">{w.name}</p>
                  <p className="row-sub">
                    {w.plannedExercises.length
                      ? `${w.plannedExercises.length} exercises`
                      : "No exercises yet"}
                  </p>
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ alignSelf: "center", padding: "0.35rem 0.5rem" }}
                  aria-label={`Delete ${w.name}`}
                  onClick={(ev) => void removeWorkout(ev, w)}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
