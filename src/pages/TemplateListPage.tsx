import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IconChevronRight } from "../components/Icons";
import { ScreenHeader } from "../components/ScreenHeader";
import { db } from "../db/database";
import { deleteSessionsForTemplate } from "../db/workoutHistory";
import { createTemplateAndNavigate } from "../lib/navActions";
import type { WorkoutTemplate } from "../model/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const w = parts[0] ?? "?";
  return w.slice(0, 2).toUpperCase();
}

export function TemplateListPage() {
  const navigate = useNavigate();
  const templates = useLiveQuery(() => db.templates.orderBy("name").toArray(), []);
  const [deleteMode, setDeleteMode] = useState(false);

  async function removeTemplate(e: React.MouseEvent, t: WorkoutTemplate) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete “${t.name}”?`)) return;
    await deleteSessionsForTemplate(t.id);
    await db.templates.delete(t.id);
  }

  const menuItems = [
    {
      label: deleteMode ? "Done deleting" : "Delete templates…",
      onSelect: () => setDeleteMode((d) => !d),
    },
  ];

  return (
    <div className="list-screen">
      <ScreenHeader
        variant="main"
        title="Workouts"
        createLabel="Create"
        onCreate={() => void createTemplateAndNavigate(navigate)}
        menuLabel="Workout list menu"
        menuItems={menuItems}
      />
      {!templates && <p className="empty">Loading…</p>}
      {templates && templates.length === 0 && <p className="empty">No templates yet.</p>}
      {templates && templates.length > 0 && (
        <ul className="list" style={{ marginTop: "0.65rem" }}>
          {templates.map((t) => (
            <li key={t.id}>
              <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                <Link to={`/templates/${t.id}`} className="list-row-link" style={{ flex: 1 }}>
                  <span className="list-row-link__thumb" aria-hidden>
                    {initials(t.name)}
                  </span>
                  <span className="list-row-link__body">
                    <p className="row-title">{t.name}</p>
                    <p className="row-sub">
                      {t.plannedExercises.length
                        ? `${t.plannedExercises.length} exercises`
                        : "No exercises yet"}
                    </p>
                  </span>
                  <IconChevronRight className="list-row-link__chevron" />
                </Link>
                {deleteMode && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ alignSelf: "center", padding: "0.35rem 0.5rem", flexShrink: 0 }}
                    aria-label={`Delete ${t.name}`}
                    onClick={(ev) => void removeTemplate(ev, t)}
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
