import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../db/database";
import type { WorkoutTemplate } from "../model/types";
import { newId } from "../model/types";

export function TemplateListPage() {
  const navigate = useNavigate();
  const templates = useLiveQuery(() => db.templates.orderBy("name").toArray(), []);

  async function addTemplate() {
    const t: WorkoutTemplate = {
      id: newId(),
      name: "New Template",
      plannedExercises: [],
    };
    await db.templates.add(t);
    navigate(`/templates/${t.id}`);
  }

  async function removeTemplate(e: React.MouseEvent, t: WorkoutTemplate) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete “${t.name}”?`)) return;
    await db.templates.delete(t.id);
  }

  return (
    <>
      <div className="toolbar">
        <span className="muted" style={{ flex: 1 }}>
          Workout plans
        </span>
        <button type="button" className="btn btn-primary" onClick={() => void addTemplate()}>
          New template
        </button>
      </div>
      {!templates && <p className="empty">Loading…</p>}
      {templates && templates.length === 0 && <p className="empty">No templates yet.</p>}
      {templates && templates.length > 0 && (
        <ul className="list">
          {templates.map((t) => (
            <li key={t.id}>
              <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                <Link to={`/templates/${t.id}`} style={{ flex: 1, paddingRight: "0.5rem" }}>
                  <p className="row-title">{t.name}</p>
                  <p className="row-sub">
                    {t.plannedExercises.length
                      ? `${t.plannedExercises.length} exercises`
                      : "No exercises yet"}
                  </p>
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ alignSelf: "center", padding: "0.35rem 0.5rem" }}
                  aria-label={`Delete ${t.name}`}
                  onClick={(ev) => void removeTemplate(ev, t)}
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
