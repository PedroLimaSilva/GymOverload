import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { db } from "../db/database";
import { buildInitialSetStates, saveCompletedWorkout } from "../db/workoutHistory";
import type { Exercise } from "../model/types";

type SetStates = Record<string, { weight: number; reps: number }[]>;

export function ActiveWorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const rows = useLiveQuery(() => db.workouts.toArray(), []);
  const workout = id && rows ? rows.find((w) => w.id === id) : undefined;
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);

  const exerciseByName = useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const ex of exercises ?? []) m.set(ex.name, ex);
    return m;
  }, [exercises]);

  const [setStates, setSetStates] = useState<SetStates>({});
  const [ready, setReady] = useState(false);

  const plannedKey = useMemo(
    () =>
      workout
        ? workout.plannedExercises.map((p) => `${p.id}:${p.sets}:${p.targetReps}`).join("|")
        : "",
    [workout]
  );

  useEffect(() => {
    if (!workout) return;
    let cancelled = false;
    setReady(false);
    void (async () => {
      const initial = await buildInitialSetStates(workout);
      if (!cancelled) {
        setSetStates(initial);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workout?.id, plannedKey, workout]);

  useEffect(() => {
    if (!id || rows === undefined) return;
    if (!workout) navigate("/workouts", { replace: true });
  }, [id, rows, workout, navigate]);

  const updateSet = useCallback(
    (plannedId: string, setIndex: number, patch: Partial<{ weight: number; reps: number }>) => {
      setSetStates((prev) => {
        const row = prev[plannedId];
        if (!row || !row[setIndex]) return prev;
        const nextRow = row.map((cell, i) =>
          i === setIndex ? { ...cell, ...patch } : cell
        );
        return { ...prev, [plannedId]: nextRow };
      });
    },
    []
  );

  async function finish() {
    if (!workout || !ready) return;
    await saveCompletedWorkout(workout, setStates);
    navigate(`/workouts/${workout.id}`);
  }

  if (rows === undefined || !workout || !ready) {
    return <p className="empty">Loading…</p>;
  }

  if (workout.plannedExercises.length === 0) {
    return (
      <>
        <ScreenHeader
          variant="detail"
          leading={
            <Link to={`/workouts/${workout.id}`} className="btn-pill">
              Back
            </Link>
          }
        />
        <p className="empty">Add exercises to this workout before starting a session.</p>
      </>
    );
  }

  return (
    <>
      <ScreenHeader
        variant="detail"
        leading={
          <Link to={`/workouts/${workout.id}`} className="btn-pill">
            Back
          </Link>
        }
        trailing={
          <button type="button" className="btn btn-primary" onClick={() => void finish()}>
            Finish
          </button>
        }
      />
      <div className="form">
        <h2 className="workout-title">{workout.name}</h2>
        {workout.plannedExercises.map((pe) => {
          const unit = exerciseByName.get(pe.name)?.weightUnit ?? "kg";
          const row = setStates[pe.id] ?? [];
          return (
            <section key={pe.id} className="form-section">
              <h3>{pe.name}</h3>
              {Array.from({ length: pe.sets }, (_, setIndex) => {
                const cell = row[setIndex];
                if (!cell) return null;
                return (
                  <SetRow
                    key={setIndex}
                    setNumber={setIndex + 1}
                    targetReps={pe.targetReps}
                    unit={unit}
                    weight={cell.weight}
                    reps={cell.reps}
                    onWeight={(v) => updateSet(pe.id, setIndex, { weight: v })}
                    onReps={(v) => updateSet(pe.id, setIndex, { reps: v })}
                  />
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}

function SetRow({
  setNumber,
  targetReps,
  unit,
  weight,
  reps,
  onWeight,
  onReps,
}: {
  setNumber: number;
  targetReps: number;
  unit: string;
  weight: number;
  reps: number;
  onWeight: (v: number) => void;
  onReps: (v: number) => void;
}) {
  return (
    <div className="set-row">
      <div className="set-row__meta">
        <span className="muted">Set {setNumber}</span>
        <span className="muted">Target {targetReps} reps</span>
      </div>
      <div className="set-row__inputs">
        <label className="set-row__field">
          <span className="sr-only">Weight ({unit})</span>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={weight}
            onChange={(e) => onWeight(parseFloat(e.target.value) || 0)}
          />
          <span className="suffix">{unit}</span>
        </label>
        <label className="set-row__field">
          <span className="sr-only">Reps</span>
          <input
            type="number"
            inputMode="numeric"
            step={1}
            min={0}
            value={reps}
            onChange={(e) => onReps(parseInt(e.target.value, 10) || 0)}
          />
          <span className="suffix">reps</span>
        </label>
      </div>
    </div>
  );
}
