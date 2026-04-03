import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { ClipboardList, Dumbbell, History, Home, Settings } from "lucide-react";
import { ensureSeeded } from "./db/bootstrap";
import { ExerciseDetailPage } from "./pages/ExerciseDetailPage";
import { ExerciseListPage } from "./pages/ExerciseListPage";
import { SettingsPage } from "./pages/SettingsPage";
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
      <nav className="tab-nav glass" aria-label="Main">
        <span className="tab-nav__disabled" aria-hidden="true">
          <span className="tab-nav__icon-wrap">
            <Home size={22} aria-hidden />
          </span>
          Home
        </span>
        <NavLink to="/workouts" title="Workouts">
          <span className="tab-nav__icon-wrap">
            <ClipboardList size={22} aria-hidden />
          </span>
          Workouts
        </NavLink>
        <span className="tab-nav__disabled" aria-hidden="true">
          <span className="tab-nav__icon-wrap">
            <History size={22} aria-hidden />
          </span>
          History
        </span>
        <NavLink to="/exercises" title="Exercises">
          <span className="tab-nav__icon-wrap">
            <Dumbbell size={22} aria-hidden />
          </span>
          Exercises
        </NavLink>
        <NavLink to="/settings" end title="Settings">
          <span className="tab-nav__icon-wrap">
            <Settings size={22} aria-hidden />
          </span>
          Settings
        </NavLink>
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
        `${import.meta.env.BASE_URL}seed/workouts.json`,
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
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/exercises" replace />} />
        <Route path="/exercises" element={<ExerciseListPage />} />
        <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
        <Route path="/workouts" element={<WorkoutListPage />} />
        <Route path="/workouts/:id" element={<WorkoutDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<Navigate to="/settings" replace />} />
      </Route>
    </Routes>
  );
}
