import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CategoryPickerModal } from "../components/CategoryPickerModal";
import { db } from "../db/database";
import type { Exercise, ExerciseCategory } from "../model/types";
import { defaultExercise } from "../model/types";

export function ExerciseListPage() {
  const navigate = useNavigate();
  const exercises = useLiveQuery(() => db.exercises.orderBy("createdAt").reverse().toArray(), []);
  const [search, setSearch] = useState("");
  const [filterCats, setFilterCats] = useState<ExerciseCategory[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!exercises) return [];
    return exercises.filter((ex) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || ex.name.toLowerCase().includes(q);
      const matchesCat =
        filterCats.length === 0 ||
        ex.categories.some((c) => filterCats.includes(c));
      return matchesSearch && matchesCat;
    });
  }, [exercises, search, filterCats]);

  async function addExercise() {
    const ex = defaultExercise();
    await db.exercises.add(ex);
    navigate(`/exercises/${ex.id}`);
  }

  async function removeExercise(e: React.MouseEvent, ex: Exercise) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete “${ex.name}”?`)) return;
    await db.exercises.delete(ex.id);
  }

  return (
    <>
      <div className="toolbar">
        <button type="button" className="btn btn-ghost" onClick={() => setFilterOpen(true)}>
          Filter
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void addExercise()}>
          New exercise
        </button>
      </div>
      {filterCats.length > 0 && (
        <div className="chips">
          {filterCats.map((c) => (
            <span key={c} className="chip">
              {c}
            </span>
          ))}
        </div>
      )}
      <input
        className="search"
        type="search"
        placeholder="Search exercises"
        value={search}
        onChange={(ev) => setSearch(ev.target.value)}
        autoComplete="off"
      />
      {!exercises && <p className="empty">Loading…</p>}
      {exercises && filtered.length === 0 && (
        <p className="empty">No exercises match.</p>
      )}
      {filtered.length > 0 && (
        <ul className="list">
          {filtered.map((ex) => (
            <li key={ex.id}>
              <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                <Link to={`/exercises/${ex.id}`} style={{ flex: 1, paddingRight: "0.5rem" }}>
                  <p className="row-title">{ex.name}</p>
                  <p className="row-sub">{ex.categories.join(", ") || "No categories"}</p>
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ alignSelf: "center", padding: "0.35rem 0.5rem" }}
                  aria-label={`Delete ${ex.name}`}
                  onClick={(ev) => void removeExercise(ev, ex)}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {filterOpen && (
        <CategoryPickerModal
          title="Filter by category"
          showClear
          selected={filterCats}
          onChange={setFilterCats}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </>
  );
}
