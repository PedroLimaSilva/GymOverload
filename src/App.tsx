import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useParams } from "react-router-dom";
import { ensureSeeded } from "./db/bootstrap";
import { ExerciseDetailPage } from "./pages/ExerciseDetailPage";
import { ExerciseListPage } from "./pages/ExerciseListPage";
import { ActiveWorkoutPage } from "./pages/ActiveWorkoutPage";
import { WorkoutDetailPage } from "./pages/WorkoutDetailPage";
import { WorkoutListPage } from "./pages/WorkoutListPage";

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSeeded(
        `${import.meta.env.BASE_URL}seed/exercises.json`,
        `${import.meta.env.BASE_URL}seed/workouts.json`
      );
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="empty" style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        Loading…
      </div>
    );
  }

  return (
    <>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header-inner">
            <div className="app-header-mark" aria-hidden="true">
              <span className="app-header-mark__mask" />
              <img
                className="app-header-mark__img"
                src={`${import.meta.env.BASE_URL}pwa-192.png`}
                alt=""
                width={36}
                height={36}
                decoding="async"
              />
            </div>
            <h1>GymOverload</h1>
          </div>
        </header>
        <Routes>
          <Route path="/" element={<Navigate to="/exercises" replace />} />
          <Route path="/exercises" element={<ExerciseListPage />} />
          <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
          <Route path="/workouts" element={<WorkoutListPage />} />
          <Route path="/workouts/:id" element={<WorkoutDetailPage />} />
          <Route path="/workouts/:id/session" element={<ActiveWorkoutPage />} />
          <Route path="/templates" element={<Navigate to="/workouts" replace />} />
          <Route path="/templates/:id" element={<LegacyTemplateDetailRedirect />} />
          <Route path="/templates/:id/workout" element={<LegacyActiveWorkoutRedirect />} />
        </Routes>
      </div>
      <nav className="tab-nav" aria-label="Main">
        <NavLink to="/exercises" end>
          Exercises
        </NavLink>
        <NavLink to="/workouts" end>
          Workouts
        </NavLink>
      </nav>
    </>
  );
}

function LegacyTemplateDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/workouts/${id}`} replace />;
}

function LegacyActiveWorkoutRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/workouts/${id}/session`} replace />;
}
