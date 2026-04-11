import {
  closestCenter,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function workoutIdsBySection(
  workouts: Workout[],
  sortedGroups: WorkoutGroup[],
): Record<string, string[]> {
  const sections = buildSections(workouts, sortedGroups);
  const out: Record<string, string[]> = {};
  for (const s of sections) {
    out[sectionKey(s)] = s.workouts.map((w) => w.id);
  }
  return out;
}

function findContainer(containers: Record<string, string[]>, itemId: string): string | null {
  for (const [key, ids] of Object.entries(containers)) {
    if (ids.includes(itemId)) return key;
  }
  return null;
}

function emptyDropId(sectionKeyStr: string): string {
  return `empty-${sectionKeyStr}`;
}

function parseEmptyDropId(overId: string): string | null {
  if (!overId.startsWith("empty-")) return null;
  return overId.slice("empty-".length);
}

function applyContainersToWorkouts(
  containers: Record<string, string[]>,
  workouts: Workout[],
): Workout[] {
  const byId = new Map(workouts.map((w) => [w.id, { ...w }]));
  for (const [secKey, ids] of Object.entries(containers)) {
    if (secKey === "u") {
      ids.forEach((id, i) => {
        const base = byId.get(id);
        if (!base) return;
        const { groupId: _g, ...rest } = base;
        byId.set(id, { ...rest, sortOrder: i * 10 });
      });
    } else if (secKey.startsWith("g:")) {
      const gid = secKey.slice(2);
      ids.forEach((id, i) => {
        const base = byId.get(id);
        if (!base) return;
        byId.set(id, { ...base, groupId: gid, sortOrder: i * 10 });
      });
    }
  }
  return workouts.map((w) => byId.get(w.id) ?? w);
}

function WorkoutSortableRow({
  w,
  deleteMode,
  onRemoveWorkout,
}: {
  w: Workout;
  deleteMode: boolean;
  onRemoveWorkout: (e: React.MouseEvent, w: Workout) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: w.id,
    disabled: deleteMode,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={isDragging ? "workout-list-row workout-list-row--dragging" : "workout-list-row"}
    >
      <div className="workout-list-row__inner">
        {!deleteMode ? (
          <div
            className="workout-list-row__drag"
            aria-label={`Reorder ${w.name}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={20} aria-hidden strokeWidth={2} />
          </div>
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
  );
}

function SectionEmptyDropTarget({
  sectionKeyStr,
  deleteMode,
  isUngrouped,
}: {
  sectionKeyStr: string;
  deleteMode: boolean;
  isUngrouped: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: emptyDropId(sectionKeyStr),
    disabled: deleteMode,
  });

  if (deleteMode) {
    return (
      <li className="workout-list-empty-hint" ref={setNodeRef}>
        <span className="muted" style={{ fontSize: "0.88rem" }}>
          No workouts in this group
        </span>
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      className={
        isOver
          ? "workout-list-empty-drop workout-list-empty-drop--active"
          : "workout-list-empty-drop"
      }
    >
      <span className="muted">
        {isUngrouped
          ? "Drop here to remove from all groups (Other workouts)"
          : "Drop here to add to this group"}
      </span>
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
  const [dragState, setDragState] = useState<Record<string, string[]> | null>(null);
  const dragStateRef = useRef<Record<string, string[]> | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
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

  const computedContainers = useMemo((): Record<string, string[]> | null => {
    if (!workouts || !groups) return null;
    return workoutIdsBySection(workouts, sortedGroups);
  }, [workouts, sortedGroups]);

  const displayContainers = dragState ?? computedContainers;

  const persistContainers = useCallback(
    async (nextContainers: Record<string, string[]>) => {
      if (!workouts) return;
      const next = applyContainersToWorkouts(nextContainers, workouts);
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
    },
    [workouts],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveDragId(String(event.active.id));
      if (computedContainers) {
        const copy = Object.fromEntries(
          Object.entries(computedContainers).map(([k, v]) => [k, [...v]]),
        ) as Record<string, string[]>;
        dragStateRef.current = copy;
        setDragState(copy);
      }
    },
    [computedContainers],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;
      const base = dragStateRef.current ?? computedContainers;
      if (!base) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      const emptyTarget = parseEmptyDropId(overId);
      const activeContainer = findContainer(base, activeId);
      if (!activeContainer) return;
      const overContainer = emptyTarget ?? findContainer(base, overId);
      if (!overContainer) return;

      let next: Record<string, string[]>;
      if (activeContainer === overContainer) {
        if (emptyTarget) return;
        const items = [...base[activeContainer]];
        const oldIndex = items.indexOf(activeId);
        const newIndex = items.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
        next = { ...base, [activeContainer]: arrayMove(items, oldIndex, newIndex) };
      } else {
        const fromList = [...base[activeContainer]];
        const toList = [...base[overContainer]];
        const fromIdx = fromList.indexOf(activeId);
        if (fromIdx === -1) return;
        fromList.splice(fromIdx, 1);
        let insertAt: number;
        if (emptyTarget) insertAt = toList.length;
        else {
          const overIdx = toList.indexOf(overId);
          insertAt = overIdx === -1 ? toList.length : overIdx;
        }
        toList.splice(insertAt, 0, activeId);
        next = { ...base, [activeContainer]: fromList, [overContainer]: toList };
      }

      dragStateRef.current = next;
      setDragState(next);
    },
    [computedContainers],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { over } = event;
      setActiveDragId(null);
      const final = dragStateRef.current;
      dragStateRef.current = null;
      setDragState(null);
      if (!final || !workouts) return;
      if (!over) return;
      await persistContainers(final);
    },
    [persistContainers, workouts],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
    dragStateRef.current = null;
    setDragState(null);
  }, []);

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
  const activeWorkout =
    activeDragId && workouts ? workouts.find((w) => w.id === activeDragId) : undefined;

  function renderSectionBody(section: ListSection) {
    const key = sectionKey(section);
    const ids = displayContainers?.[key] ?? section.workouts.map((w) => w.id);
    const isUngrouped = section.kind === "ungrouped";

    if (ids.length === 0) {
      return (
        <SectionEmptyDropTarget
          sectionKeyStr={key}
          deleteMode={deleteMode}
          isUngrouped={isUngrouped}
        />
      );
    }

    return (
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {ids.map((id) => {
          const w = workouts?.find((x) => x.id === id);
          if (!w) return null;
          return (
            <WorkoutSortableRow
              key={id}
              w={w}
              deleteMode={deleteMode}
              onRemoveWorkout={removeWorkout}
            />
          );
        })}
      </SortableContext>
    );
  }

  const listInner =
    !loading &&
    (workouts!.length > 0 || sortedGroups.length > 0) &&
    sections &&
    displayContainers ? (
      <ul className="list" style={{ marginTop: "0.65rem" }}>
        {sections.map((section) =>
          section.kind === "group" ? (
            <li key={`g-${section.group.id}`} style={{ listStyle: "none", border: "none" }}>
              <div
                className="workout-group-row"
                onPointerEnter={() => {
                  if (activeDragId) {
                    setCollapsedGroupIds((p) => ({ ...p, [section.group.id]: false }));
                  }
                }}
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
                >
                  {renderSectionBody(section)}
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
                {renderSectionBody(section)}
              </ul>
            </li>
          ),
        )}
      </ul>
    ) : null;

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
      {!deleteMode && listInner ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={(e) => void handleDragEnd(e)}
          onDragCancel={handleDragCancel}
        >
          {listInner}
          <DragOverlay dropAnimation={null}>
            {activeWorkout ? (
              <div className="workout-list-row workout-list-row--overlay glass">
                <div className="workout-list-row__inner">
                  <span className="workout-list-row__drag" style={{ cursor: "grabbing" }}>
                    <GripVertical size={20} aria-hidden strokeWidth={2} />
                  </span>
                  <div className="list-row-link" style={{ flex: 1, pointerEvents: "none" }}>
                    <span className="list-row-link__thumb" aria-hidden>
                      {initials(activeWorkout.name)}
                    </span>
                    <span className="list-row-link__body">
                      <p className="row-title">{activeWorkout.name}</p>
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        listInner
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
