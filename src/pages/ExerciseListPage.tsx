import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { CategoryPickerModal } from "../components/CategoryPickerModal";
import { ExerciseListBody } from "../components/ExerciseListBody";
import { ScreenHeader } from "../components/ScreenHeader";
import { db } from "../db/database";
import { createExerciseAndNavigate } from "../lib/navActions";
import type { Exercise, ExerciseCategory } from "../model/types";

export function ExerciseListPage() {
  const navigate = useNavigate();
  const exercises = useLiveQuery(() => db.exercises.orderBy("createdAt").reverse().toArray(), []);
  const [search, setSearch] = useState("");
  const [filterCats, setFilterCats] = useState<ExerciseCategory[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!exercises) return [];
    return exercises.filter((ex) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || ex.name.toLowerCase().includes(q);
      const matchesCat =
        filterCats.length === 0 || ex.categories.some((c) => filterCats.includes(c));
      return matchesSearch && matchesCat;
    });
  }, [exercises, search, filterCats]);

  const showLetterIndex = !search.trim() && filterCats.length === 0;

  async function removeExercise(e: React.MouseEvent, ex: Exercise) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete “${ex.name}”?`)) return;
    await db.exercises.delete(ex.id);
  }

  const menuItems = [
    {
      label: filterCats.length ? "Edit filter…" : "Filter by category…",
      onSelect: () => setFilterOpen(true),
    },
    ...(filterCats.length
      ? [
          {
            label: "Clear filters",
            onSelect: () => setFilterCats([]),
          },
        ]
      : []),
    {
      label: deleteMode ? "Done deleting" : "Delete exercises…",
      onSelect: () => setDeleteMode((d) => !d),
    },
  ];

  return (
    <div className="list-screen">
      <div className="list-screen__sticky">
        <ScreenHeader
          variant="main"
          title="Exercises"
          createLabel="Create"
          onCreate={() => void createExerciseAndNavigate(navigate)}
          menuLabel="Exercise list menu"
          menuItems={menuItems}
        />
        <label className="search-wrap glass">
          <Search size={18} aria-hidden strokeWidth={2} />
          <input
            className="search"
            type="search"
            placeholder="Search"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>
        {filterCats.length > 0 && (
          <div className="chips">
            {filterCats.map((c) => (
              <span key={c} className="chip">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
      {!exercises && <p className="empty">Loading…</p>}
      {exercises && (
        <ExerciseListBody
          mode="link"
          exercises={filtered}
          idNamespace="ex"
          showLetterIndex={showLetterIndex}
          scrollRef={scrollRef}
          emptyMessage="No exercises match."
          deleteMode={deleteMode}
          onDeleteExercise={removeExercise}
        />
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
    </div>
  );
}
