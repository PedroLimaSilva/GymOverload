import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { CategoryPickerModal } from "./CategoryPickerModal";
import { ExerciseListBody } from "./ExerciseListBody";
import type { Exercise, ExerciseCategory } from "../model/types";

export function ExerciseMultiPickerModal({
  exercises,
  onAdd,
  onQuickCreate,
  onClose,
}: {
  exercises: Exercise[];
  onAdd: (selected: Exercise[]) => void;
  onQuickCreate: (name: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterCats, setFilterCats] = useState<ExerciseCategory[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quickCreating, setQuickCreating] = useState(false);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const q = search.trim().toLowerCase();
      const okSearch = !q || ex.name.toLowerCase().includes(q);
      const okCat = filterCats.length === 0 || ex.categories.some((c) => filterCats.includes(c));
      return okSearch && okCat;
    });
  }, [exercises, search, filterCats]);

  const searchTrimmed = search.trim();
  const canQuickCreate =
    searchTrimmed.length > 0 &&
    !exercises.some((ex) => ex.name.toLowerCase() === searchTrimmed.toLowerCase());

  const showLetterIndex = !search.trim() && filterCats.length === 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    const list = exercises.filter((e) => selected.has(e.id));
    onAdd(list);
    setSelected(new Set());
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="multi-picker-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal modal--exercise-picker"
        style={{ maxHeight: "90dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2 id="multi-picker-title">Add exercises</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </header>
        <div className="body modal-body--exercise-picker">
          <div className="toolbar" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setFilterOpen(true)}>
              Filter
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={selected.size === 0}
              onClick={() => confirm()}
            >
              Add {selected.size || ""}
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
          <label className="search-wrap glass">
            <Search size={18} aria-hidden strokeWidth={2} />
            <input
              className="search"
              type="search"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              enterKeyHint="search"
              onKeyDown={(e) => {
                if (e.key !== "Enter" || !canQuickCreate || quickCreating) return;
                e.preventDefault();
                void (async () => {
                  setQuickCreating(true);
                  try {
                    await onQuickCreate(searchTrimmed);
                  } finally {
                    setQuickCreating(false);
                  }
                })();
              }}
            />
          </label>
          {canQuickCreate ? (
            <div className="exercise-picker-quick-create">
              <button
                type="button"
                className="btn btn-primary exercise-picker-quick-create__btn"
                disabled={quickCreating}
                onClick={() => {
                  void (async () => {
                    setQuickCreating(true);
                    try {
                      await onQuickCreate(searchTrimmed);
                    } finally {
                      setQuickCreating(false);
                    }
                  })();
                }}
              >
                {quickCreating ? "Adding…" : `Create “${searchTrimmed}”`}
              </button>
              <p className="muted exercise-picker-quick-create__hint">
                Saves to your exercise list and adds it to this workout.
              </p>
            </div>
          ) : null}
          <ExerciseListBody
            mode="select"
            exercises={filtered}
            idNamespace="picker"
            showLetterIndex={showLetterIndex}
            scrollRef={listScrollRef}
            emptyMessage="No exercises match."
            selectedIds={selected}
            onToggle={toggle}
          />
        </div>
      </div>
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
