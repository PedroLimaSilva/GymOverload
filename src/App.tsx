import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";
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
import { TemplateDetailPage } from "./pages/TemplateDetailPage";
import { TemplateListPage } from "./pages/TemplateListPage";

function AppLayout() {
  return (
    <>
      <div className="app-frame">
        <main className="app-shell">
          <Outlet />
        </main>
      </div>
      <nav className="tab-nav glass" aria-label="Main">
        <span className="tab-nav__disabled" aria-hidden="true">
          <span className="tab-nav__icon-wrap">
            <IconHome />
          </span>
          Home
        </span>
        <NavLink to="/templates" end title="Workouts">
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
        `${import.meta.env.BASE_URL}seed/templates.json`
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
        <Route path="/templates" element={<TemplateListPage />} />
        <Route path="/templates/:id" element={<TemplateDetailPage />} />
        <Route path="/templates/:id/workout" element={<ActiveWorkoutPage />} />
      </Route>
    </Routes>
  );
}
