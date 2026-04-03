import { useCallback, useMemo, type RefObject } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { groupByFirstLetter } from "../lib/groupByLetter";
import type { Exercise } from "../model/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const w = parts[0] ?? "?";
  return w.slice(0, 2).toUpperCase();
}

export function exerciseRowSubtitle(ex: Exercise): string {
  const primaryCat = ex.categories?.[0];
  const equip = ex.equipment;
  const parts = [primaryCat, equip].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return ex.categories.join(", ") || "No categories";
}

function sectionElementId(namespace: string, letterKey: string): string {
  return `${namespace}-section-${letterKey === "#" ? "sym" : letterKey}`;
}

function ExerciseRowThumb({ ex }: { ex: Exercise }) {
  if (ex.imageDataUrl) {
    return (
      <span className="list-row-link__thumb list-row-link__thumb--media" aria-hidden>
        <img src={ex.imageDataUrl} alt="" />
      </span>
    );
  }
  return (
    <span className="list-row-link__thumb" aria-hidden>
      {initials(ex.name)}
    </span>
  );
}

type BaseProps = {
  exercises: Exercise[];
  /** Used for section heading `id`s (e.g. `ex` → `ex-section-A`). Must be unique per scroll container. */
  idNamespace: string;
  showLetterIndex: boolean;
  scrollRef?: RefObject<HTMLDivElement | null>;
  emptyMessage?: string;
};

type LinkModeProps = BaseProps & {
  mode: "link";
  deleteMode?: boolean;
  onDeleteExercise?: (e: React.MouseEvent, ex: Exercise) => void;
};

type SelectModeProps = BaseProps & {
  mode: "select";
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
};

export type ExerciseListBodyProps = LinkModeProps | SelectModeProps;

export function ExerciseListBody(props: ExerciseListBodyProps) {
  const {
    exercises,
    idNamespace,
    showLetterIndex,
    scrollRef,
    emptyMessage = "No exercises match.",
  } = props;

  const grouped = useMemo(() => groupByFirstLetter(exercises), [exercises]);
  const showIndex = showLetterIndex && grouped.length > 1;

  const scrollToSection = useCallback(
    (key: string) => {
      const id = sectionElementId(idNamespace, key);
      const el = scrollRef?.current?.querySelector(`#${CSS.escape(id)}`);
      el?.scrollIntoView({ block: "start", behavior: "smooth" });
    },
    [idNamespace, scrollRef],
  );

  function renderRow(ex: Exercise) {
    const sub = exerciseRowSubtitle(ex);
    if (props.mode === "link") {
      return (
        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
          <Link to={`/exercises/${ex.id}`} className="list-row-link" style={{ flex: 1 }}>
            <ExerciseRowThumb ex={ex} />
            <span className="list-row-link__body">
              <p className="row-title">{ex.name}</p>
              <p className="row-sub">{sub}</p>
            </span>
            <ChevronRight
              className="list-row-link__chevron"
              size={14}
              aria-hidden
              strokeWidth={2.5}
            />
          </Link>
          {props.deleteMode && props.onDeleteExercise ? (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ alignSelf: "center", padding: "0.35rem 0.5rem", flexShrink: 0 }}
              aria-label={`Delete ${ex.name}`}
              onClick={(ev) => void props.onDeleteExercise!(ev, ex)}
            >
              ✕
            </button>
          ) : null}
        </div>
      );
    }
    const checked = props.selectedIds.has(ex.id);
    return (
      <button
        type="button"
        className="list-row-link"
        aria-pressed={checked}
        aria-label={`${checked ? "Deselect" : "Select"} ${ex.name}`}
        onClick={() => props.onToggle(ex.id)}
      >
        <ExerciseRowThumb ex={ex} />
        <span className="list-row-link__body">
          <p className="row-title" style={{ margin: 0 }}>
            {ex.name}
          </p>
          <p className="row-sub" style={{ margin: "0.25rem 0 0" }}>
            {sub}
          </p>
        </span>
        <input type="checkbox" readOnly checked={checked} tabIndex={-1} aria-hidden />
      </button>
    );
  }

  if (exercises.length === 0) {
    return <p className="empty">{emptyMessage}</p>;
  }

  return (
    <div className={`list-with-index${showIndex ? " list-with-index--with-scrubber" : ""}`}>
      <div className="list-with-index__scroll" ref={scrollRef}>
        {showIndex ? (
          grouped.map((section) => (
            <section key={section.key} aria-labelledby={sectionElementId(idNamespace, section.key)}>
              <h2 className="list-section-label" id={sectionElementId(idNamespace, section.key)}>
                {section.key}
              </h2>
              <ul className="list">
                {section.items.map((ex) => (
                  <li key={ex.id}>{renderRow(ex)}</li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <ul className="list">
            {exercises.map((ex) => (
              <li key={ex.id}>{renderRow(ex)}</li>
            ))}
          </ul>
        )}
      </div>
      {showIndex ? (
        <aside className="section-index" aria-label="Jump to letter">
          {grouped.map((g) => (
            <button key={g.key} type="button" onClick={() => scrollToSection(g.key)}>
              {g.key}
            </button>
          ))}
        </aside>
      ) : null}
    </div>
  );
}
