import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../db/database";
import { useTopNav } from "../layout/TopNavContext";
import {
  buildMonthGrid,
  calendarRangeEnd,
  calendarRangeStart,
  localDateKey,
  monthsInRange,
  sessionCalendarPlacementIso,
} from "../lib/historyCalendar";
import {
  buildExerciseLookupMaps,
  sessionMuscleBarSegments,
  type SessionBarSegment,
} from "../lib/sessionMuscleBar";
import type { LoggedExerciseEntry, WorkoutSession } from "../model/types";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

function formatSessionSheetSubtitle(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const part = d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `@ ${part}`;
}

function formatDurationHm(ms: number | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return "0h:00m";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h:${String(m).padStart(2, "0")}m`;
}

function monthShortLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleString(undefined, { month: "short" });
}

export function HistoryListPage() {
  const navigate = useNavigate();
  const sessions = useLiveQuery(
    () => db.workoutSessions.orderBy("completedAt").reverse().toArray(),
    [],
  );
  const workouts = useLiveQuery(() => db.workouts.toArray(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const loggedEntries = useLiveQuery(() => db.loggedExerciseEntries.toArray(), []);

  const workoutNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of workouts ?? []) m.set(w.id, w.name);
    return m;
  }, [workouts]);

  const sessionMuscleSegmentsById = useMemo(() => {
    const maps = buildExerciseLookupMaps(exercises ?? []);
    const workoutById = new Map((workouts ?? []).map((w) => [w.id, w]));
    const entriesBySession = new Map<string, LoggedExerciseEntry[]>();
    for (const e of loggedEntries ?? []) {
      const list = entriesBySession.get(e.sessionId);
      if (list) list.push(e);
      else entriesBySession.set(e.sessionId, [e]);
    }
    const out = new Map<string, SessionBarSegment[]>();
    for (const s of sessions ?? []) {
      out.set(
        s.id,
        sessionMuscleBarSegments(s, workoutById.get(s.workoutId), maps, entriesBySession.get(s.id)),
      );
    }
    return out;
  }, [sessions, workouts, exercises, loggedEntries]);

  const now = useMemo(() => new Date(), []);

  const { rangeStart, rangeEnd, months, sessionsByDayKey } = useMemo(() => {
    const placementIsos = (sessions ?? []).map(sessionCalendarPlacementIso);
    const end = calendarRangeEnd(now, placementIsos);
    const start = calendarRangeStart(end);
    const byKey = new Map<string, WorkoutSession[]>();
    for (const s of sessions ?? []) {
      const d = new Date(sessionCalendarPlacementIso(s));
      if (Number.isNaN(d.getTime())) continue;
      const key = localDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      const list = byKey.get(key);
      if (list) list.push(s);
      else byKey.set(key, [s]);
    }
    for (const list of byKey.values()) {
      list.sort((a, b) => (a.completedAt < b.completedAt ? -1 : 1));
    }
    return {
      rangeStart: start,
      rangeEnd: end,
      months: monthsInRange(start, end),
      sessionsByDayKey: byKey,
    };
  }, [sessions, now]);

  const [sheetDayKey, setSheetDayKey] = useState<string | null>(null);
  const [selectedEmptyKey, setSelectedEmptyKey] = useState<string | null>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const didInitialCalendarScrollRef = useRef(false);

  const closeDaySheet = useCallback(() => setSheetDayKey(null), []);

  useLayoutEffect(() => {
    if (sessions === undefined || didInitialCalendarScrollRef.current) return;
    const scrollEl = calendarScrollRef.current;
    const monthEl = document.getElementById("history-calendar-current-month");
    if (!scrollEl) return;
    if (monthEl) {
      const c = scrollEl.getBoundingClientRect();
      const m = monthEl.getBoundingClientRect();
      scrollEl.scrollTop = Math.max(0, scrollEl.scrollTop + (m.top - c.top));
    }
    didInitialCalendarScrollRef.current = true;
  }, [sessions, months]);

  useEffect(() => {
    if (sheetDayKey == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDaySheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetDayKey, closeDaySheet]);

  const yearPill =
    rangeStart.getFullYear() === rangeEnd.getFullYear()
      ? String(rangeEnd.getFullYear())
      : `${rangeStart.getFullYear()}–${rangeEnd.getFullYear()}`;

  const sheetSessions = sheetDayKey != null ? (sessionsByDayKey.get(sheetDayKey) ?? []) : [];

  const rows = sessions ?? [];

  useTopNav(
    () => ({
      variant: "main",
      title: "History",
      createLabel: "Create",
      onCreate: () => {},
      omitCreate: true,
      menuLabel: "History menu",
      menuItems: [],
    }),
    [],
  );

  function onDayActivate(cellKey: string, daySessions: WorkoutSession[]) {
    if (daySessions.length === 1) {
      setSheetDayKey(null);
      setSelectedEmptyKey(null);
      navigate(`/history/${daySessions[0]!.id}`);
      return;
    }
    if (daySessions.length > 1) {
      setSelectedEmptyKey(null);
      setSheetDayKey(cellKey);
      return;
    }
    setSheetDayKey(null);
    setSelectedEmptyKey(cellKey);
  }

  return (
    <div className="list-screen history-calendar-screen">
      <div className="list-screen__sticky">
        <div className="history-calendar__toolbar">
          <span className="history-calendar__year-pill glass">{yearPill}</span>
        </div>
      </div>
      <div className="list-with-index">
        <div ref={calendarScrollRef} className="list-with-index__scroll history-calendar__scroll">
          {sessions === undefined ? (
            <p className="empty">Loading…</p>
          ) : (
            <>
              <div className="history-calendar__months" aria-busy={false}>
                {months.map(({ year, monthIndex }) => {
                  const grid = buildMonthGrid(year, monthIndex, rangeStart, rangeEnd, now);
                  const isCurrentMonth =
                    now.getFullYear() === year && now.getMonth() === monthIndex;
                  return (
                    <section
                      key={`${year}-${monthIndex}`}
                      id={isCurrentMonth ? "history-calendar-current-month" : undefined}
                      className="history-calendar__month"
                      aria-label={`${monthShortLabel(year, monthIndex)} ${year}`}
                    >
                      <h2
                        className={
                          isCurrentMonth
                            ? "history-calendar__month-title history-calendar__month-title--current"
                            : "history-calendar__month-title"
                        }
                      >
                        {monthShortLabel(year, monthIndex)}
                      </h2>
                      <div className="history-calendar__weekdays">
                        {WEEKDAY_LABELS.map((l, i) => (
                          <span key={i} className="history-calendar__weekday">
                            {l}
                          </span>
                        ))}
                      </div>
                      <div className="history-calendar__grid" role="grid">
                        {grid.map((cell) => {
                          const daySessions = sessionsByDayKey.get(cell.key) ?? [];
                          const hasSessions = daySessions.length > 0;
                          const isSelected =
                            sheetDayKey === cell.key || selectedEmptyKey === cell.key;
                          const label = `${cell.date.toLocaleString(undefined, {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}${hasSessions ? `, ${daySessions.length} workout${daySessions.length === 1 ? "" : "s"}` : ""}`;

                          return (
                            <div
                              key={cell.key}
                              role="presentation"
                              className="history-calendar__cell-wrap"
                            >
                              <button
                                type="button"
                                role="gridcell"
                                className={[
                                  "history-calendar__day",
                                  !cell.inCurrentMonth ? "history-calendar__day--muted" : "",
                                  !cell.inRange ? "history-calendar__day--out-range" : "",
                                  cell.isToday ? "history-calendar__day--today" : "",
                                  isSelected ? "history-calendar__day--selected" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                aria-label={label}
                                aria-pressed={isSelected}
                                disabled={!cell.inRange}
                                onClick={() => onDayActivate(cell.key, daySessions)}
                              >
                                <span className="history-calendar__day-num">
                                  {cell.date.getDate()}
                                </span>
                                {hasSessions ? (
                                  <span
                                    className={
                                      daySessions.length > 1
                                        ? "history-calendar__bars history-calendar__bars--stack"
                                        : "history-calendar__bars"
                                    }
                                    aria-hidden
                                  >
                                    {daySessions.map((s) => {
                                      const segs = sessionMuscleSegmentsById.get(s.id) ?? [];
                                      return (
                                        <span key={s.id} className="history-calendar__muscle-bar">
                                          {segs.map((seg, i) => (
                                            <span
                                              key={i}
                                              className="history-calendar__muscle-segment"
                                              style={{
                                                flexGrow: seg.flex,
                                                flexBasis: 0,
                                                background: seg.color,
                                              }}
                                            />
                                          ))}
                                        </span>
                                      );
                                    })}
                                  </span>
                                ) : (
                                  <span className="history-calendar__bars history-calendar__bars--empty" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>

              {rows.length === 0 ? (
                <p className="muted history-calendar__hint">
                  No completed sessions yet. Finish a workout to see it on the calendar.
                </p>
              ) : null}

              {selectedEmptyKey != null && rows.length > 0 ? (
                <p className="muted history-calendar__hint">
                  No workouts on this day. Tap a day with a bar to open a session.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {sessions !== undefined && sheetDayKey != null && sheetSessions.length > 1 ? (
        <div className="history-day-sheet-backdrop" role="presentation" onClick={closeDaySheet}>
          <div
            className="history-day-sheet glass"
            role="dialog"
            aria-modal="true"
            aria-label="Sessions on this day"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="history-day-sheet__handle" aria-hidden />
            <ul className="history-day-sheet__list">
              {sheetSessions.map((s: WorkoutSession) => {
                const name = workoutNameById.get(s.workoutId) ?? "Workout";
                return (
                  <li key={s.id} className="history-day-sheet__item">
                    <button
                      type="button"
                      className="history-day-sheet__row"
                      onClick={() => {
                        closeDaySheet();
                        navigate(`/history/${s.id}`);
                      }}
                    >
                      <span className="history-day-sheet__row-main">
                        <span className="history-day-sheet__title">{name}</span>
                        <span className="history-day-sheet__subtitle muted">
                          {formatSessionSheetSubtitle(sessionCalendarPlacementIso(s))}
                        </span>
                      </span>
                      <span className="history-day-sheet__duration">
                        {formatDurationHm(s.durationMs)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
