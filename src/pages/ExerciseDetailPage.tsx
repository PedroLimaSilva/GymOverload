import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Camera, Check, ChevronRight, ChevronsUpDown, X } from "lucide-react";
import { ModalPortal } from "../components/ModalPortal";
import { db } from "../db/database";
import { useTopNav } from "../layout/TopNavContext";
import {
  EQUIPMENT_PRESETS,
  EXERCISE_CATEGORIES,
  EXERCISE_KIND_PRESETS,
  TRAINING_CATEGORIES,
  type Exercise,
  type ExerciseCategory,
  type TrainingCategory,
} from "../model/types";

function SecondaryMusclesModal({
  primary,
  selected,
  onChange,
  onClose,
}: {
  primary: ExerciseCategory | null;
  selected: ExerciseCategory[];
  onChange: (next: ExerciseCategory[]) => void;
  onClose: () => void;
}) {
  function toggle(cat: ExerciseCategory) {
    if (cat === primary) return;
    if (selected.includes(cat)) onChange(selected.filter((c) => c !== cat));
    else onChange([...selected, cat]);
  }

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="secondary-muscles-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <header>
            <h2 id="secondary-muscles-title">Secondary muscles</h2>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Done
            </button>
          </header>
          <div className="body">
            {EXERCISE_CATEGORIES.filter((c) => c !== primary).map((cat) => (
              <label key={cat} className="check-row">
                <span>{cat}</span>
                <input
                  type="checkbox"
                  checked={selected.includes(cat)}
                  onChange={() => toggle(cat)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const leaveExerciseDetail = useCallback(() => {
    navigate(-1);
  }, [navigate]);
  const rows = useLiveQuery(() => db.exercises.toArray(), []);
  const exercise = id && rows ? rows.find((e) => e.id === id) : undefined;
  const [draft, setDraft] = useState<Exercise | null>(null);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (exercise) setDraft(exercise);
  }, [exercise]);

  useEffect(() => {
    if (!id || rows === undefined) return;
    if (!exercise) leaveExerciseDetail();
  }, [id, rows, exercise, leaveExerciseDetail]);

  async function persist(next: Exercise) {
    setDraft(next);
    await db.exercises.put(next);
  }

  const closeModal = useCallback(() => {
    leaveExerciseDetail();
  }, [leaveExerciseDetail]);

  async function remove() {
    if (!draft || !confirm(`Delete “${draft.name}”?`)) return;
    await db.exercises.delete(draft.id);
    leaveExerciseDetail();
  }

  const equipmentOptions = useMemo(() => {
    const list = [...EQUIPMENT_PRESETS];
    if (draft?.equipment && !list.includes(draft.equipment as (typeof EQUIPMENT_PRESETS)[number])) {
      list.push(draft.equipment as (typeof EQUIPMENT_PRESETS)[number]);
    }
    return list;
  }, [draft?.equipment]);

  function setPrimaryMuscle(cat: ExerciseCategory) {
    if (!draft) return;
    const secondary = draft.categories.slice(1).filter((c) => c !== cat);
    void persist({ ...draft, categories: [cat, ...secondary] });
  }

  const primaryMuscle = draft?.categories[0] ?? null;
  const secondaryMuscles = draft?.categories.slice(1) ?? [];

  useTopNav(
    () =>
      draft
        ? {
            variant: "detail" as const,
            leading: (
              <button
                type="button"
                className="btn-icon-circle glass"
                aria-label="Close"
                onClick={closeModal}
              >
                <X size={20} aria-hidden strokeWidth={2.2} />
              </button>
            ),
            center: <span className="exercise-detail-nav__title">Edit exercise</span>,
            trailing: (
              <button
                type="button"
                className="btn-icon-circle glass"
                aria-label="Done"
                onClick={closeModal}
              >
                <Check size={20} aria-hidden strokeWidth={2.5} />
              </button>
            ),
          }
        : null,
    [id, closeModal, draft?.id],
  );

  if (!draft) {
    return (
      <div className="exercise-detail-modal">
        <p className="empty">Loading…</p>
      </div>
    );
  }

  return (
    <div className="exercise-detail-modal">
      {draft.imageDataUrl ? (
        <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}>
          <img
            src={draft.imageDataUrl}
            alt=""
            style={{
              width: "5rem",
              height: "5rem",
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid var(--border)",
            }}
          />
        </div>
      ) : null}

      <div className="edit-exercise-card">
        <div className="edit-card__row">
          <input
            id="ex-name"
            className="edit-card__name-input"
            type="text"
            value={draft.name}
            onChange={(e) => void persist({ ...draft, name: e.target.value })}
            aria-label="Exercise name"
          />
        </div>
        <label className="edit-card__row" htmlFor="ex-muscle">
          <span className="edit-card__label">Muscle</span>
          <span className="edit-card__control">
            <select
              id="ex-muscle"
              className="edit-card__select"
              value={primaryMuscle ?? ""}
              onChange={(e) => {
                const v = e.target.value as ExerciseCategory;
                if (v) setPrimaryMuscle(v);
              }}
            >
              <option value="">Select</option>
              {EXERCISE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronsUpDown className="edit-card__chevron" size={14} aria-hidden strokeWidth={2} />
          </span>
        </label>
        <button
          type="button"
          className="edit-card__row"
          disabled={!primaryMuscle}
          onClick={() => setSecondaryOpen(true)}
        >
          <span className="edit-card__label">Secondary muscles</span>
          <span className="edit-card__control edit-card__control--link">
            <span className="edit-card__value" style={{ maxWidth: "none" }}>
              {secondaryMuscles.length ? secondaryMuscles.join(", ") : "None"}
            </span>
            <ChevronRight className="edit-card__chevron" size={14} aria-hidden strokeWidth={2.5} />
          </span>
        </button>
        <label className="edit-card__row" htmlFor="ex-equipment">
          <span className="edit-card__label">Equipment</span>
          <span className="edit-card__control">
            <select
              id="ex-equipment"
              className="edit-card__select"
              value={draft.equipment ?? "Barbell"}
              onChange={(e) => void persist({ ...draft, equipment: e.target.value })}
            >
              {equipmentOptions.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
            <ChevronsUpDown className="edit-card__chevron" size={14} aria-hidden strokeWidth={2} />
          </span>
        </label>
        <label className="edit-card__row" htmlFor="ex-type">
          <span className="edit-card__label">Type</span>
          <span className="edit-card__control">
            <select
              id="ex-type"
              className="edit-card__select"
              value={draft.kind}
              onChange={(e) => void persist({ ...draft, kind: e.target.value })}
            >
              {EXERCISE_KIND_PRESETS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <ChevronsUpDown className="edit-card__chevron" size={14} aria-hidden strokeWidth={2} />
          </span>
        </label>
        <label className="edit-card__row" htmlFor="ex-training-cat">
          <span className="edit-card__label">Category</span>
          <span className="edit-card__control">
            <select
              id="ex-training-cat"
              className="edit-card__select"
              value={draft.trainingCategory ?? "Strength"}
              onChange={(e) =>
                void persist({ ...draft, trainingCategory: e.target.value as TrainingCategory })
              }
            >
              {TRAINING_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronsUpDown className="edit-card__chevron" size={14} aria-hidden strokeWidth={2} />
          </span>
        </label>
        <div className="edit-card__row edit-card__row--textarea">
          <textarea
            className="edit-card__textarea"
            placeholder="Description"
            value={draft.notes ?? ""}
            onChange={(e) =>
              void persist({
                ...draft,
                notes: e.target.value || undefined,
              })
            }
            aria-label="Description"
          />
        </div>
      </div>

      <button type="button" className="exercise-detail-modal__delete" onClick={() => void remove()}>
        DELETE
      </button>

      <div className="exercise-detail-modal__fab">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file || !draft) return;
            const reader = new FileReader();
            reader.onload = () => {
              const url = typeof reader.result === "string" ? reader.result : undefined;
              if (url) void persist({ ...draft, imageDataUrl: url });
            };
            reader.readAsDataURL(file);
          }}
        />
        <button
          type="button"
          className="btn-circle-icon glass btn-circle-icon--surface"
          aria-label={draft.imageDataUrl ? "Change exercise photo" : "Add exercise photo"}
          onClick={() => fileRef.current?.click()}
        >
          <Camera size={22} aria-hidden strokeWidth={2} />
        </button>
      </div>

      <details className="exercise-detail-modal__advanced">
        <summary>Advanced</summary>
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
        <div className="toggle-row">
          <span>Double weight for volume</span>
          <input
            type="checkbox"
            checked={draft.doubleWeightForVolume}
            onChange={(e) => void persist({ ...draft, doubleWeightForVolume: e.target.checked })}
          />
        </div>
      </details>

      {secondaryOpen && (
        <SecondaryMusclesModal
          primary={primaryMuscle}
          selected={secondaryMuscles}
          onChange={(next) => {
            if (!primaryMuscle) return;
            void persist({ ...draft, categories: [primaryMuscle, ...next] });
          }}
          onClose={() => setSecondaryOpen(false)}
        />
      )}
    </div>
  );
}
