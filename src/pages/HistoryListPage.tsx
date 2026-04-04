import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { db } from "../db/database";
import type { WorkoutSession } from "../model/types";

function formatSessionWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryListPage() {
  const sessions = useLiveQuery(
    () => db.workoutSessions.orderBy("completedAt").reverse().toArray(),
    [],
  );
  const workouts = useLiveQuery(() => db.workouts.toArray(), []);

  const workoutNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of workouts ?? []) m.set(w.id, w.name);
    return m;
  }, [workouts]);

  const rows = sessions ?? [];

  return (
    <>
      <ScreenHeader
        variant="main"
        title="History"
        createLabel="Create"
        onCreate={() => {}}
        omitCreate
        menuLabel="History menu"
        menuItems={[]}
      />
      <div className="form" style={{ marginTop: "0.5rem", marginBottom: "6rem" }}>
        {sessions === undefined ? (
          <p className="empty">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="muted" style={{ textAlign: "center", marginTop: "2rem" }}>
            No completed sessions yet. Finish a workout to see it here.
          </p>
        ) : (
          <ul className="history-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rows.map((s: WorkoutSession) => {
              const name = workoutNameById.get(s.workoutId) ?? "Workout";
              return (
                <li key={s.id} className="history-list__item">
                  <Link to={`/history/${s.id}`} className="history-list__link">
                    <span className="history-list__name">{name}</span>
                    <span className="history-list__when muted">
                      {formatSessionWhen(s.completedAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
