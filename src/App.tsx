import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { ensureSeeded } from "./db/bootstrap";
import { ExerciseDetailPage } from "./pages/ExerciseDetailPage";
import { ExerciseListPage } from "./pages/ExerciseListPage";
import { TemplateDetailPage } from "./pages/TemplateDetailPage";
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
          <h1>GymOverload</h1>
        </header>
        <Routes>
          <Route path="/" element={<Navigate to="/exercises" replace />} />
          <Route path="/exercises" element={<ExerciseListPage />} />
          <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
          <Route path="/templates" element={<TemplateListPage />} />
          <Route path="/templates/:id" element={<TemplateDetailPage />} />
        </Routes>
      </div>
      <nav className="tab-nav" aria-label="Main">
        <NavLink to="/exercises" end>
          Exercises
        </NavLink>
        <NavLink to="/templates" end>
          Templates
        </NavLink>
      </nav>
    </>
  );
}
