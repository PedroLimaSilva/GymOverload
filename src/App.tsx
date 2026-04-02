import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { ensureSeeded } from "./db/bootstrap";
import { ExerciseDetailPage } from "./pages/ExerciseDetailPage";
import { ExerciseListPage } from "./pages/ExerciseListPage";
import { ActiveWorkoutPage } from "./pages/ActiveWorkoutPage";
import { TemplateDetailPage } from "./pages/TemplateDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { TemplateListPage } from "./pages/TemplateListPage";

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSeeded("/seed/exercises.json", "/seed/templates.json");
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
                src="/pwa-192.png"
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
          <Route path="/templates" element={<TemplateListPage />} />
          <Route path="/templates/:id" element={<TemplateDetailPage />} />
          <Route path="/templates/:id/workout" element={<ActiveWorkoutPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </div>
      <nav className="tab-nav" aria-label="Main">
        <NavLink to="/exercises" end>
          Exercises
        </NavLink>
        <NavLink to="/templates" end>
          Templates
        </NavLink>
        <NavLink to="/profile" end>
          Profile
        </NavLink>
      </nav>
    </>
  );
}
