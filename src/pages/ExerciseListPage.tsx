import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CategoryPickerModal } from "../components/CategoryPickerModal";
import { IconChevronRight, IconSearch } from "../components/Icons";
import { ScreenHeader } from "../components/ScreenHeader";
import { db } from "../db/database";
import { groupByFirstLetter } from "../lib/groupByLetter";
import { createExerciseAndNavigate } from "../lib/navActions";
import type { Exercise, ExerciseCategory } from "../model/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const w = parts[0] ?? "?";
  return w.slice(0, 2).toUpperCase();
}

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

  const grouped = useMemo(() => groupByFirstLetter(filtered), [filtered]);
  const showIndex = grouped.length > 1 && !search.trim() && filterCats.length === 0;

  const scrollToSection = useCallback((key: string) => {
    const id = `ex-section-${key === "#" ? "sym" : key}`;
    const el = scrollRef.current?.querySelector(`#${id}`);
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

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
          <IconSearch />
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
      {exercises && filtered.length === 0 && <p className="empty">No exercises match.</p>}
      {filtered.length > 0 && (
        <div className={`list-with-index${showIndex ? " list-with-index--with-scrubber" : ""}`}>
          <div className="list-with-index__scroll" ref={scrollRef}>
            {showIndex ? (
              grouped.map((section) => (
                <section
                  key={section.key}
                  aria-labelledby={`ex-section-${section.key === "#" ? "sym" : section.key}`}
                >
                  <h2
                    className="list-section-label"
                    id={`ex-section-${section.key === "#" ? "sym" : section.key}`}
                  >
                    {section.key}
                  </h2>
                  <ul className="list">
                    {section.items.map((ex) => (
                      <li key={ex.id}>
                        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                          <Link
                            to={`/exercises/${ex.id}`}
                            className="list-row-link"
                            style={{ flex: 1 }}
                          >
                            <span className="list-row-link__thumb" aria-hidden>
                              {initials(ex.name)}
                            </span>
                            <span className="list-row-link__body">
                              <p className="row-title">{ex.name}</p>
                              <p className="row-sub">
                                {ex.categories.join(", ") || "No categories"}
                              </p>
                            </span>
                            <IconChevronRight className="list-row-link__chevron" />
                          </Link>
                          {deleteMode && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{
                                alignSelf: "center",
                                padding: "0.35rem 0.5rem",
                                flexShrink: 0,
                              }}
                              aria-label={`Delete ${ex.name}`}
                              onClick={(ev) => void removeExercise(ev, ex)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <ul className="list">
                {filtered.map((ex) => (
                  <li key={ex.id}>
                    <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                      <Link
                        to={`/exercises/${ex.id}`}
                        className="list-row-link"
                        style={{ flex: 1 }}
                      >
                        <span className="list-row-link__thumb" aria-hidden>
                          {initials(ex.name)}
                        </span>
                        <span className="list-row-link__body">
                          <p className="row-title">{ex.name}</p>
                          <p className="row-sub">{ex.categories.join(", ") || "No categories"}</p>
                        </span>
                        <IconChevronRight className="list-row-link__chevron" />
                      </Link>
                      {deleteMode && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ alignSelf: "center", padding: "0.35rem 0.5rem", flexShrink: 0 }}
                          aria-label={`Delete ${ex.name}`}
                          onClick={(ev) => void removeExercise(ev, ex)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {showIndex && (
            <aside className="section-index" aria-label="Jump to letter">
              {grouped.map((g) => (
                <button key={g.key} type="button" onClick={() => scrollToSection(g.key)}>
                  {g.key}
                </button>
              ))}
            </aside>
          )}
        </div>
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
