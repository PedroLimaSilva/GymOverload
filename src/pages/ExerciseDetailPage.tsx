import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CategoryPickerModal } from "../components/CategoryPickerModal";
import { OverflowMenu } from "../components/OverflowMenu";
import { ScreenHeader } from "../components/ScreenHeader";
import { db } from "../db/database";
import type { Exercise, ExerciseCategory } from "../model/types";

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const rows = useLiveQuery(() => db.exercises.toArray(), []);
  const exercise = id && rows ? rows.find((e) => e.id === id) : undefined;
  const [draft, setDraft] = useState<Exercise | null>(null);
  const [catOpen, setCatOpen] = useState(false);

  useEffect(() => {
    if (exercise) setDraft(exercise);
  }, [exercise]);

  useEffect(() => {
    if (!id || rows === undefined) return;
    if (!exercise) navigate("/exercises", { replace: true });
  }, [id, rows, exercise, navigate]);

  async function persist(next: Exercise) {
    setDraft(next);
    await db.exercises.put(next);
  }

  async function remove() {
    if (!draft || !confirm(`Delete “${draft.name}”?`)) return;
    await db.exercises.delete(draft.id);
    navigate("/exercises");
  }

  if (!draft) {
    return <p className="empty">Loading…</p>;
  }

  return (
    <>
      <ScreenHeader
        variant="detail"
        leading={
          <Link to="/exercises" className="btn-pill">
            Back
          </Link>
        }
        trailing={
          <OverflowMenu
            label="Exercise actions"
            items={[{ label: "Delete exercise", onSelect: () => void remove() }]}
          />
        }
      />
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="form-section">
          <h2>Name</h2>
          <div className="field">
            <label htmlFor="ex-name">Name</label>
            <input
              id="ex-name"
              type="text"
              value={draft.name}
              onChange={(e) => void persist({ ...draft, name: e.target.value })}
            />
          </div>
        </div>
        <div className="form-section">
          <h2>Categories</h2>
          <button type="button" className="btn" style={{ width: "100%" }} onClick={() => setCatOpen(true)}>
            {draft.categories.length ? draft.categories.join(", ") : "Select categories"}
          </button>
        </div>
        <div className="form-section">
          <h2>Defaults</h2>
          <div className="field">
            <label htmlFor="ex-rest">Rest (seconds)</label>
            <input
              id="ex-rest"
              type="number"
              min={0}
              step={1}
              value={draft.defaultRestSeconds}
              onChange={(e) =>
                void persist({ ...draft, defaultRestSeconds: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="ex-unit">Weight unit</label>
            <select
              id="ex-unit"
              value={draft.weightUnit}
              onChange={(e) => void persist({ ...draft, weightUnit: e.target.value })}
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ex-inkg">Increment (kg)</label>
            <input
              id="ex-inkg"
              type="number"
              min={0}
              step={0.5}
              value={draft.weightIncrementKg}
              onChange={(e) =>
                void persist({ ...draft, weightIncrementKg: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="ex-inlb">Increment (lb)</label>
            <input
              id="ex-inlb"
              type="number"
              min={0}
              step={0.5}
              value={draft.weightIncrementLb}
              onChange={(e) =>
                void persist({ ...draft, weightIncrementLb: Number(e.target.value) || 0 })
              }
            />
          </div>
        </div>
        <div className="form-section">
          <h2>Kind</h2>
          <div className="field">
            <label htmlFor="ex-kind">Kind</label>
            <input
              id="ex-kind"
              type="text"
              value={draft.kind}
              onChange={(e) => void persist({ ...draft, kind: e.target.value })}
            />
          </div>
        </div>
        <div className="toggle-row">
          <span>Double weight for volume</span>
          <input
            type="checkbox"
            checked={draft.doubleWeightForVolume}
            onChange={(e) => void persist({ ...draft, doubleWeightForVolume: e.target.checked })}
          />
        </div>
        <div className="form-section">
          <h2>Notes</h2>
          <textarea
            value={draft.notes ?? ""}
            onChange={(e) =>
              void persist({
                ...draft,
                notes: e.target.value || undefined,
              })
            }
          />
        </div>
      </form>
      {catOpen && (
        <CategoryPickerModal
          title="Select categories"
          showClear={false}
          selected={draft.categories}
          onChange={(next: ExerciseCategory[]) => void persist({ ...draft, categories: next })}
          onClose={() => setCatOpen(false)}
        />
      )}
    </>
  );
}
