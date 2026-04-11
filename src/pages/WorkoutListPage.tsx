import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, GripVertical } from "lucide-react";
import { db } from "../db/database";
import { useTopNav } from "../layout/TopNavContext";
import { clearLiveWorkoutSessionDraft, getLiveWorkoutSessionDraft } from "../db/liveSessionDraft";
import { deleteSessionsForWorkout } from "../db/workoutHistory";
import { createWorkoutAndNavigate } from "../lib/navActions";
import type { Workout, WorkoutGroup } from "../model/types";
import { workoutGroupWithName } from "../model/types";
import { WorkoutCreateChoiceModal } from "../components/WorkoutCreateChoiceModal";
import { WorkoutGroupNameModal } from "../components/WorkoutGroupNameModal";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const w = parts[0] ?? "?";
  return w.slice(0, 2).toUpperCase();
}

function sortWorkoutsByOrder(ws: Workout[]): Workout[] {
  return [...ws].sort((a, b) => {
    const ao = typeof a.sortOrder === "number" && Number.isFinite(a.sortOrder) ? a.sortOrder : 0;
    const bo = typeof b.sortOrder === "number" && Number.isFinite(b.sortOrder) ? b.sortOrder : 0;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

type ListSection =
  | { kind: "group"; group: WorkoutGroup; workouts: Workout[] }
  | { kind: "ungrouped"; workouts: Workout[] };

function sectionKey(section: ListSection): string {
  return section.kind === "group" ? `g:${section.group.id}` : "u";
}

/** Build list sections; when any group exists, always include an ungrouped section (for drops) even if empty. */
function buildSections(workouts: Workout[], sortedGroups: WorkoutGroup[]): ListSection[] {
  const byGroupId = new Map<string, Workout[]>();
  for (const g of sortedGroups) byGroupId.set(g.id, []);
  const ungrouped: Workout[] = [];
  for (const w of workouts) {
    if (w.groupId && byGroupId.has(w.groupId)) {
      byGroupId.get(w.groupId)!.push(w);
    } else {
      ungrouped.push(w);
    }
  }
  const out: ListSection[] = sortedGroups.map((group) => ({
    kind: "group" as const,
    group,
    workouts: sortWorkoutsByOrder(byGroupId.get(group.id) ?? []),
  }));
  if (sortedGroups.length > 0) {
    out.push({ kind: "ungrouped", workouts: sortWorkoutsByOrder(ungrouped) });
  } else if (ungrouped.length > 0) {
    out.push({ kind: "ungrouped", workouts: sortWorkoutsByOrder(ungrouped) });
  }
  return out;
}

function moveWorkoutBetweenSections(
  all: Workout[],
  sortedGroups: WorkoutGroup[],
  draggedId: string,
  destSectionKey: string,
  destBeforeIndex: number,
): Workout[] {
  const sections = buildSections(all, sortedGroups);

  let sourceKey: string | null = null;
  let sourceIndex = -1;
  for (const sec of sections) {
    const i = sec.workouts.findIndex((w) => w.id === draggedId);
    if (i >= 0) {
      sourceKey = sectionKey(sec);
      sourceIndex = i;
      break;
    }
  }
  if (sourceKey === null || sourceIndex < 0) return all;

  const destSectionIndex = sections.findIndex((s) => sectionKey(s) === destSectionKey);
  if (destSectionIndex < 0) return all;

  const cloned: ListSection[] = sections.map((s) => ({
    ...s,
    workouts: [...s.workouts],
  }));

  const srcSec = cloned.find((s) => sectionKey(s) === sourceKey);
  const destSec = cloned[destSectionIndex];
  if (!srcSec || !destSec) return all;

  const [moved] = srcSec.workouts.splice(sourceIndex, 1);
  if (!moved) return all;

  let insertAt = Math.max(0, Math.min(destBeforeIndex, destSec.workouts.length));
  if (sourceKey === destSectionKey && sourceIndex < insertAt) insertAt -= 1;
  destSec.workouts.splice(insertAt, 0, moved);

  const byId = new Map(all.map((w) => [w.id, { ...w }]));

  const assignSection = (sec: ListSection) => {
    sec.workouts.forEach((w, i) => {
      const base = byId.get(w.id);
      if (!base) return;
      if (sec.kind === "group") {
        byId.set(w.id, { ...base, groupId: sec.group.id, sortOrder: i * 10 });
      } else {
        const { groupId: _g, ...rest } = base;
        byId.set(w.id, { ...rest, sortOrder: i * 10 });
      }
    });
  };

  assignSection(srcSec);
  if (sectionKey(srcSec) !== sectionKey(destSec)) assignSection(destSec);

  return all.map((w) => byId.get(w.id) ?? w);
}

const DND_TYPE = "application/x-gymoverload-workout-id";

function WorkoutListRow({
  w,
  deleteMode,
  sectionKey,
  beforeIndex,
  dragWorkoutId,
  setDragWorkoutId,
  dropHint,
  setDropHint,
  onApplyDrop,
  onRemoveWorkout,
}: {
  w: Workout;
  deleteMode: boolean;
  sectionKey: string;
  beforeIndex: number;
  dragWorkoutId: string | null;
  setDragWorkoutId: (id: string | null) => void;
  dropHint: { sectionKey: string; beforeIndex: number } | null;
  setDropHint: (h: { sectionKey: string; beforeIndex: number } | null) => void;
  onApplyDrop: (draggedId: string, destSectionKey: string, destBeforeIndex: number) => void;
  onRemoveWorkout: (e: React.MouseEvent, w: Workout) => void;
}) {
  const isDragging = dragWorkoutId === w.id;
  const dropActive =
    !deleteMode &&
    dropHint != null &&
    dropHint.sectionKey === sectionKey &&
    dropHint.beforeIndex === beforeIndex;

  return (
    <>
      {!deleteMode ? (
        <li
          className={
            dropActive
              ? "workout-list-drop-slot workout-list-drop-slot--active"
              : "workout-list-drop-slot"
          }
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            setDropHint({ sectionKey, beforeIndex });
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setDropHint(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = e.dataTransfer.getData(DND_TYPE) || e.dataTransfer.getData("text/plain");
            if (id) onApplyDrop(id.trim(), sectionKey, beforeIndex);
          }}
        />
      ) : null}
      <li
        className={isDragging ? "workout-list-row workout-list-row--dragging" : "workout-list-row"}
      >
        <div className="workout-list-row__inner">
          {!deleteMode ? (
            <button
              type="button"
              className="workout-list-row__drag"
              draggable
              aria-label={`Reorder ${w.name}`}
              onDragStart={(e) => {
                e.stopPropagation();
                setDragWorkoutId(w.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData(DND_TYPE, w.id);
                try {
                  e.dataTransfer.setData("text/plain", w.id);
                } catch {
                  /* ignore */
                }
              }}
              onDragEnd={() => {
                setDragWorkoutId(null);
                setDropHint(null);
              }}
            >
              <GripVertical size={20} aria-hidden strokeWidth={2} />
            </button>
          ) : null}
          <Link to={`/workouts/${w.id}`} className="list-row-link" style={{ flex: 1 }}>
            <span className="list-row-link__thumb" aria-hidden>
              {initials(w.name)}
            </span>
            <span className="list-row-link__body">
              <p className="row-title">{w.name}</p>
              <p className="row-sub">
                {w.plannedExercises.length
                  ? `${w.plannedExercises.length} exercises`
                  : "No exercises yet"}
              </p>
            </span>
            <ChevronRight
              className="list-row-link__chevron"
              size={14}
              aria-hidden
              strokeWidth={2.5}
            />
          </Link>
          {deleteMode ? (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ alignSelf: "center", padding: "0.35rem 0.5rem", flexShrink: 0 }}
              aria-label={`Delete ${w.name}`}
              onClick={(ev) => onRemoveWorkout(ev, w)}
            >
              ✕
            </button>
          ) : null}
        </div>
      </li>
    </>
  );
}

function EmptySectionDropZone({
  sectionKey,
  deleteMode,
  setDropHint,
  onApplyDrop,
}: {
  sectionKey: string;
  deleteMode: boolean;
  setDropHint: (h: { sectionKey: string; beforeIndex: number } | null) => void;
  onApplyDrop: (draggedId: string, destSectionKey: string, destBeforeIndex: number) => void;
}) {
  if (deleteMode) {
    return (
      <li className="workout-list-empty-hint">
        <span className="muted" style={{ fontSize: "0.88rem" }}>
          No workouts in this group
        </span>
      </li>
    );
  }
  return (
    <li
      className="workout-list-empty-drop"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropHint({ sectionKey, beforeIndex: 0 });
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDropHint(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData(DND_TYPE) || e.dataTransfer.getData("text/plain");
        if (id) onApplyDrop(id.trim(), sectionKey, 0);
      }}
    >
      <span className="muted">Drop here to add to this group</span>
    </li>
  );
}

export function WorkoutListPage() {
  const navigate = useNavigate();
  const workouts = useLiveQuery(() => db.workouts.toArray(), []);
  const groups = useLiveQuery(() => db.workoutGroups.orderBy("sortOrder").toArray(), []);
  const liveDraft = useLiveQuery(() => getLiveWorkoutSessionDraft(), []);
  const [deleteMode, setDeleteMode] = useState(false);
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false);
  const [groupNameModalOpen, setGroupNameModalOpen] = useState(false);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Record<string, boolean>>({});
  const [dragWorkoutId, setDragWorkoutId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ sectionKey: string; beforeIndex: number } | null>(
    null,
  );

  const resumeWorkout =
    workouts && liveDraft ? workouts.find((w) => w.id === liveDraft.workoutId) : undefined;

  useEffect(() => {
    if (!workouts || !liveDraft) return;
    if (!workouts.some((w) => w.id === liveDraft.workoutId)) void clearLiveWorkoutSessionDraft();
  }, [workouts, liveDraft]);

  const sortedGroups = useMemo(() => (groups ? [...groups] : []), [groups]);

  const sections = useMemo((): ListSection[] | null => {
    if (!workouts || !groups) return null;
    return buildSections(workouts, sortedGroups);
  }, [workouts, sortedGroups]);

  const applyDrop = useCallback(
    async (draggedId: string, destSectionKey: string, destBeforeIndex: number) => {
      if (!workouts || !groups) return;
      const next = moveWorkoutBetweenSections(
        workouts,
        sortedGroups,
        draggedId,
        destSectionKey,
        destBeforeIndex,
      );
      await db.transaction("rw", db.workouts, async () => {
        for (const w of next) {
          const prev = workouts.find((x) => x.id === w.id);
          if (!prev) continue;
          const gPrev = prev.groupId;
          const gNext = w.groupId;
          const oPrev = typeof prev.sortOrder === "number" ? prev.sortOrder : 0;
          const oNext = typeof w.sortOrder === "number" ? w.sortOrder : 0;
          if (gPrev !== gNext || oPrev !== oNext) await db.workouts.put(w);
        }
      });
      setDropHint(null);
      setDragWorkoutId(null);
    },
    [workouts, sortedGroups],
  );

  const handleDrop = useCallback(
    (draggedId: string, destSectionKey: string, destBeforeIndex: number) => {
      void applyDrop(draggedId, destSectionKey, destBeforeIndex);
    },
    [applyDrop],
  );

  useEffect(() => {
    if (!dragWorkoutId) return;
    function end() {
      setDragWorkoutId(null);
      setDropHint(null);
    }
    window.addEventListener("dragend", end);
    return () => window.removeEventListener("dragend", end);
  }, [dragWorkoutId]);

  const maxWorkoutSortOrder = useMemo(() => {
    if (!workouts || workouts.length === 0) return -10;
    return Math.max(
      ...workouts.map((w) =>
        typeof w.sortOrder === "number" && Number.isFinite(w.sortOrder) ? w.sortOrder : 0,
      ),
    );
  }, [workouts]);

  const maxGroupSortOrder = useMemo(() => {
    if (!groups || groups.length === 0) return -10;
    return Math.max(
      ...groups.map((g) =>
        typeof g.sortOrder === "number" && Number.isFinite(g.sortOrder) ? g.sortOrder : 0,
      ),
    );
  }, [groups]);

  const openCreateFlow = useCallback(() => setCreateChoiceOpen(true), []);

  async function removeWorkout(e: React.MouseEvent, w: Workout) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete “${w.name}”?`)) return;
    await deleteSessionsForWorkout(w.id);
    await db.workouts.delete(w.id);
  }

  async function removeGroup(e: React.MouseEvent, g: WorkoutGroup) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete group “${g.name}”? Workouts inside will move to the ungrouped list.`))
      return;
    const inGroup = (workouts ?? []).filter((w) => w.groupId === g.id);
    await db.transaction("rw", db.workouts, db.workoutGroups, async () => {
      for (const w of inGroup) {
        const { groupId: _g, ...rest } = w;
        await db.workouts.put(rest);
      }
      await db.workoutGroups.delete(g.id);
    });
  }

  function toggleGroupCollapsed(groupId: string) {
    setCollapsedGroupIds((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  async function confirmCreateGroup(name: string) {
    const g = workoutGroupWithName(name, maxGroupSortOrder + 10);
    await db.workoutGroups.add(g);
    setGroupNameModalOpen(false);
    setCreateChoiceOpen(false);
  }

  async function startCreateWorkout() {
    setCreateChoiceOpen(false);
    await createWorkoutAndNavigate(navigate, { sortOrder: maxWorkoutSortOrder + 10 });
  }

  function pickCreateGroup() {
    setCreateChoiceOpen(false);
    setGroupNameModalOpen(true);
  }

  const menuItems = useMemo(
    () => [
      {
        label: deleteMode ? "Done deleting" : "Delete workouts…",
        onSelect: () => setDeleteMode((d) => !d),
      },
    ],
    [deleteMode],
  );

  useTopNav(
    () => ({
      variant: "main",
      title: "Workouts",
      createLabel: "Create",
      onCreate: openCreateFlow,
      menuLabel: "Workout list menu",
      menuItems,
    }),
    [openCreateFlow, menuItems],
  );

  const loading = !workouts || !groups;

  return (
    <div className="list-screen">
      {resumeWorkout ? (
        <div className="glass" style={{ margin: "0.65rem 1rem 0", padding: "0.65rem 0.85rem" }}>
          <p style={{ margin: 0, fontSize: "0.88rem" }} className="muted">
            Workout in progress
          </p>
          <Link
            to={`/workouts/${resumeWorkout.id}?session=1`}
            className="btn btn-primary"
            style={{ display: "block", width: "100%", marginTop: "0.45rem", textAlign: "center" }}
          >
            Resume “{resumeWorkout.name}”
          </Link>
        </div>
      ) : null}
      {loading && <p className="empty">Loading…</p>}
      {!loading && workouts!.length === 0 && sortedGroups.length === 0 && (
        <p className="empty">No workouts yet.</p>
      )}
      {!loading && (workouts!.length > 0 || sortedGroups.length > 0) && sections && (
        <ul className="list" style={{ marginTop: "0.65rem" }}>
          {sections.map((section) =>
            section.kind === "group" ? (
              <li key={`g-${section.group.id}`} style={{ listStyle: "none" }}>
                <div
                  className="workout-group-row"
                  onDragEnter={() =>
                    setCollapsedGroupIds((p) => ({ ...p, [section.group.id]: false }))
                  }
                >
                  <button
                    type="button"
                    className="workout-group-row__toggle"
                    aria-expanded={!collapsedGroupIds[section.group.id]}
                    onClick={() => toggleGroupCollapsed(section.group.id)}
                  >
                    <ChevronRight
                      size={18}
                      aria-hidden
                      strokeWidth={2.5}
                      className={
                        collapsedGroupIds[section.group.id]
                          ? "workout-group-row__chevron"
                          : "workout-group-row__chevron workout-group-row__chevron--open"
                      }
                    />
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {section.group.name}
                    </span>
                  </button>
                  {deleteMode && (
                    <button
                      type="button"
                      className="btn btn-ghost workout-group-row__delete"
                      aria-label={`Delete group ${section.group.name}`}
                      onClick={(ev) => void removeGroup(ev, section.group)}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {!collapsedGroupIds[section.group.id] && (
                  <ul
                    className="list workout-list-section"
                    style={{ marginTop: 0, marginBottom: "0.35rem" }}
                    onDragEnter={() =>
                      setCollapsedGroupIds((p) => ({ ...p, [section.group.id]: false }))
                    }
                  >
                    {section.workouts.length === 0 ? (
                      <EmptySectionDropZone
                        sectionKey={sectionKey(section)}
                        deleteMode={deleteMode}
                        setDropHint={setDropHint}
                        onApplyDrop={handleDrop}
                      />
                    ) : (
                      <>
                        {section.workouts.map((w, i) => (
                          <WorkoutListRow
                            key={w.id}
                            w={w}
                            deleteMode={deleteMode}
                            sectionKey={sectionKey(section)}
                            beforeIndex={i}
                            dragWorkoutId={dragWorkoutId}
                            setDragWorkoutId={setDragWorkoutId}
                            dropHint={dropHint}
                            setDropHint={setDropHint}
                            onApplyDrop={handleDrop}
                            onRemoveWorkout={removeWorkout}
                          />
                        ))}
                        {!deleteMode ? (
                          <li
                            className={
                              dropHint != null &&
                              dropHint.sectionKey === sectionKey(section) &&
                              dropHint.beforeIndex === section.workouts.length
                                ? "workout-list-drop-slot workout-list-drop-slot--active"
                                : "workout-list-drop-slot"
                            }
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              setDropHint({
                                sectionKey: sectionKey(section),
                                beforeIndex: section.workouts.length,
                              });
                            }}
                            onDragLeave={(e) => {
                              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                              setDropHint(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const id =
                                e.dataTransfer.getData(DND_TYPE) ||
                                e.dataTransfer.getData("text/plain");
                              if (id)
                                handleDrop(id.trim(), sectionKey(section), section.workouts.length);
                            }}
                          />
                        ) : null}
                      </>
                    )}
                  </ul>
                )}
              </li>
            ) : (
              <li key="ungrouped" style={{ listStyle: "none" }}>
                {sortedGroups.length > 0 ? (
                  <p className="list-section-label" style={{ marginTop: "0.85rem" }}>
                    Other workouts
                  </p>
                ) : null}
                <ul
                  className="list workout-list-section"
                  style={{ marginTop: sortedGroups.length > 0 ? "0.25rem" : 0 }}
                >
                  {section.workouts.length === 0 && sortedGroups.length > 0 ? (
                    <EmptySectionDropZone
                      sectionKey={sectionKey(section)}
                      deleteMode={deleteMode}
                      setDropHint={setDropHint}
                      onApplyDrop={handleDrop}
                    />
                  ) : (
                    <>
                      {section.workouts.map((w, i) => (
                        <WorkoutListRow
                          key={w.id}
                          w={w}
                          deleteMode={deleteMode}
                          sectionKey={sectionKey(section)}
                          beforeIndex={i}
                          dragWorkoutId={dragWorkoutId}
                          setDragWorkoutId={setDragWorkoutId}
                          dropHint={dropHint}
                          setDropHint={setDropHint}
                          onApplyDrop={handleDrop}
                          onRemoveWorkout={removeWorkout}
                        />
                      ))}
                      {!deleteMode && section.workouts.length > 0 ? (
                        <li
                          className={
                            dropHint != null &&
                            dropHint.sectionKey === sectionKey(section) &&
                            dropHint.beforeIndex === section.workouts.length
                              ? "workout-list-drop-slot workout-list-drop-slot--active"
                              : "workout-list-drop-slot"
                          }
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            setDropHint({
                              sectionKey: sectionKey(section),
                              beforeIndex: section.workouts.length,
                            });
                          }}
                          onDragLeave={(e) => {
                            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                            setDropHint(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const id =
                              e.dataTransfer.getData(DND_TYPE) ||
                              e.dataTransfer.getData("text/plain");
                            if (id)
                              handleDrop(id.trim(), sectionKey(section), section.workouts.length);
                          }}
                        />
                      ) : null}
                    </>
                  )}
                </ul>
              </li>
            ),
          )}
        </ul>
      )}
      {createChoiceOpen ? (
        <WorkoutCreateChoiceModal
          onClose={() => setCreateChoiceOpen(false)}
          onCreateWorkout={() => void startCreateWorkout()}
          onCreateGroup={pickCreateGroup}
        />
      ) : null}
      {groupNameModalOpen ? (
        <WorkoutGroupNameModal
          title="Create new workout group"
          onClose={() => setGroupNameModalOpen(false)}
          onConfirm={(name) => void confirmCreateGroup(name)}
        />
      ) : null}
    </div>
  );
}
