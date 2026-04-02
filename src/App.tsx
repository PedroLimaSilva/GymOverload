import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import { ensureSeeded } from "./db/bootstrap";
import {
  IconBicep,
  IconClipboard,
  IconDumbbell,
  IconHistory,
  IconHome,
} from "./components/Icons";
import { ExerciseDetailPage } from "./pages/ExerciseDetailPage";
import { ExerciseListPage } from "./pages/ExerciseListPage";
import { ActiveWorkoutPage } from "./pages/ActiveWorkoutPage";
import { WorkoutDetailPage } from "./pages/WorkoutDetailPage";
import { WorkoutListPage } from "./pages/WorkoutListPage";

function AppLayout() {
  return (
    <>
      <div className="app-frame">
        <main className="app-shell">
          <Outlet />
        </main>
      </div>
      <nav className="tab-nav" aria-label="Main">
        <span className="tab-nav__disabled" aria-hidden="true">
          <span className="tab-nav__icon-wrap">
            <IconHome />
          </span>
          Home
        </span>
        <NavLink to="/workouts" end title="Workouts">
          <span className="tab-nav__icon-wrap">
            <IconClipboard />
          </span>
          Workouts
        </NavLink>
        <span className="tab-nav__disabled" aria-hidden="true">
          <span className="tab-nav__icon-wrap">
            <IconHistory />
          </span>
          History
        </span>
        <NavLink to="/exercises" end title="Exercises">
          <span className="tab-nav__icon-wrap">
            <IconDumbbell />
          </span>
          Exercises
        </NavLink>
        <span className="tab-nav__disabled" aria-hidden="true">
          <span className="tab-nav__icon-wrap">
            <IconBicep />
          </span>
          My Body
        </span>
      </nav>
    </>
  );
}

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
    <Routes>
      <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/exercises" replace />} />
        <Route path="/exercises" element={<ExerciseListPage />} />
        <Route path="/workouts" element={<WorkoutListPage />} />
        <Route path="/workouts/:id" element={<WorkoutDetailPage />} />
        <Route path="/workouts/:id/session" element={<ActiveWorkoutPage />} />
        <Route path="/templates" element={<Navigate to="/workouts" replace />} />
        <Route path="/templates/:id" element={<LegacyTemplateDetailRedirect />} />
        <Route path="/templates/:id/workout" element={<LegacyActiveWorkoutRedirect />} />
      </Route>
    </Routes>
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
