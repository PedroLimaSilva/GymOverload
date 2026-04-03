import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ScreenHeader } from "../components/ScreenHeader";
import { db } from "../db/database";
import { deleteSessionsForWorkout } from "../db/workoutHistory";
import { createWorkoutAndNavigate } from "../lib/navActions";
import type { Workout } from "../model/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const w = parts[0] ?? "?";
  return w.slice(0, 2).toUpperCase();
}

export function WorkoutListPage() {
  const navigate = useNavigate();
  const workouts = useLiveQuery(() => db.workouts.orderBy("name").toArray(), []);
  const [deleteMode, setDeleteMode] = useState(false);

  async function removeWorkout(e: React.MouseEvent, w: Workout) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete “${w.name}”?`)) return;
    await deleteSessionsForWorkout(w.id);
    await db.workouts.delete(w.id);
  }

  const menuItems = [
    {
      label: deleteMode ? "Done deleting" : "Delete workouts…",
      onSelect: () => setDeleteMode((d) => !d),
    },
  ];

  return (
    <div className="list-screen">
      <ScreenHeader
        variant="main"
        title="Workouts"
        createLabel="Create"
        onCreate={() => void createWorkoutAndNavigate(navigate)}
        menuLabel="Workout list menu"
        menuItems={menuItems}
      />
      {!workouts && <p className="empty">Loading…</p>}
      {workouts && workouts.length === 0 && <p className="empty">No workouts yet.</p>}
      {workouts && workouts.length > 0 && (
        <ul className="list" style={{ marginTop: "0.65rem" }}>
          {workouts.map((w) => (
            <li key={w.id}>
              <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                <Link to={`/workouts/${w.id}`} className="list-row-link" style={{ flex: 1 }}>
                  <span className="list-row-link__thumb" aria-hidden>
                    {initials(w.name)}
                  </span>
                  <span className="list-row-link__body">
                    <p className="row-title">{w.name}</p>
                    <p className="row-sub">
                      {w.plannedExercises.length
                        ? `${w.plannedExercises.length} exercises`
                        : "No exercises yet"}
                    </p>
                  </span>
                  <ChevronRight
                    className="list-row-link__chevron"
                    size={14}
                    aria-hidden
                    strokeWidth={2.5}
                  />
                </Link>
                {deleteMode && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ alignSelf: "center", padding: "0.35rem 0.5rem", flexShrink: 0 }}
                    aria-label={`Delete ${w.name}`}
                    onClick={(ev) => void removeWorkout(ev, w)}
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
