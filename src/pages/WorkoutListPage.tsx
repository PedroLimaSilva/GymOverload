import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
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

export function WorkoutListPage() {
  const navigate = useNavigate();
  const workouts = useLiveQuery(() => db.workouts.toArray(), []);
  const groups = useLiveQuery(() => db.workoutGroups.orderBy("sortOrder").toArray(), []);
  const liveDraft = useLiveQuery(() => getLiveWorkoutSessionDraft(), []);
  const [deleteMode, setDeleteMode] = useState(false);
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false);
  const [groupNameModalOpen, setGroupNameModalOpen] = useState(false);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Record<string, boolean>>({});

  const resumeWorkout =
    workouts && liveDraft ? workouts.find((w) => w.id === liveDraft.workoutId) : undefined;

  useEffect(() => {
    if (!workouts || !liveDraft) return;
    if (!workouts.some((w) => w.id === liveDraft.workoutId)) void clearLiveWorkoutSessionDraft();
  }, [workouts, liveDraft]);

  const sortedGroups = useMemo(() => (groups ? [...groups] : []), [groups]);

  const sections = useMemo((): ListSection[] | null => {
    if (!workouts || !groups) return null;
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
    if (ungrouped.length > 0) {
      out.push({ kind: "ungrouped", workouts: sortWorkoutsByOrder(ungrouped) });
    }
    return out;
  }, [workouts, sortedGroups]);

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
                <div className="workout-group-row">
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
                  <ul className="list" style={{ marginTop: 0, marginBottom: "0.35rem" }}>
                    {section.workouts.map((w) => (
                      <li key={w.id}>
                        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                          <Link
                            to={`/workouts/${w.id}`}
                            className="list-row-link"
                            style={{ flex: 1 }}
                          >
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
                          {deleteMode && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{
                                alignSelf: "center",
                                padding: "0.35rem 0.5rem",
                                flexShrink: 0,
                              }}
                              aria-label={`Delete ${w.name}`}
                              onClick={(ev) => void removeWorkout(ev, w)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
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
                <ul className="list" style={{ marginTop: sortedGroups.length > 0 ? "0.25rem" : 0 }}>
                  {section.workouts.map((w) => (
                    <li key={w.id}>
                      <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                        <Link
                          to={`/workouts/${w.id}`}
                          className="list-row-link"
                          style={{ flex: 1 }}
                        >
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
                        {deleteMode && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{
                              alignSelf: "center",
                              padding: "0.35rem 0.5rem",
                              flexShrink: 0,
                            }}
                            aria-label={`Delete ${w.name}`}
                            onClick={(ev) => void removeWorkout(ev, w)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
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
