import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { db } from "../db/database";
import {
  buildMonthGrid,
  calendarRangeEnd,
  calendarRangeStart,
  dateFromLocalDateKey,
  localDateKey,
  monthsInRange,
} from "../lib/historyCalendar";
import type { WorkoutSession } from "../model/types";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

const SESSION_BAR_COLORS = [
  "#0a84ff",
  "#ff9f0a",
  "#32d74b",
  "#bf5af2",
  "#ff453a",
  "#64d2ff",
  "#ffd60a",
] as const;

function hashToIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function sessionBarColor(workoutId: string): string {
  return SESSION_BAR_COLORS[hashToIndex(workoutId, SESSION_BAR_COLORS.length)]!;
}

function formatSessionWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monthShortLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleString(undefined, { month: "short" });
}

export function HistoryListPage() {
  const sessions = useLiveQuery(
    () => db.workoutSessions.orderBy("completedAt").reverse().toArray(),
    [],
  );
  const workouts = useLiveQuery(() => db.workouts.toArray(), []);

  const workoutNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of workouts ?? []) m.set(w.id, w.name);
    return m;
  }, [workouts]);

  const now = useMemo(() => new Date(), []);

  const { rangeStart, rangeEnd, months, sessionsByDayKey } = useMemo(() => {
    const completedAts = (sessions ?? []).map((s) => s.completedAt);
    const end = calendarRangeEnd(now, completedAts);
    const start = calendarRangeStart(end);
    const byKey = new Map<string, WorkoutSession[]>();
    for (const s of sessions ?? []) {
      const d = new Date(s.completedAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = localDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      const list = byKey.get(key);
      if (list) list.push(s);
      else byKey.set(key, [s]);
    }
    for (const list of byKey.values()) {
      list.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
    }
    return {
      rangeStart: start,
      rangeEnd: end,
      months: monthsInRange(start, end),
      sessionsByDayKey: byKey,
    };
  }, [sessions, now]);

  const todayKey = localDateKey(now);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const effectiveSelected = selectedKey ?? (sessionsByDayKey.has(todayKey) ? todayKey : null);

  const yearPill =
    rangeStart.getFullYear() === rangeEnd.getFullYear()
      ? String(rangeEnd.getFullYear())
      : `${rangeStart.getFullYear()}–${rangeEnd.getFullYear()}`;

  const selectedSessions =
    effectiveSelected != null ? (sessionsByDayKey.get(effectiveSelected) ?? []) : [];

  const rows = sessions ?? [];

  return (
    <div className="list-screen history-calendar-screen">
      <div className="list-screen__sticky">
        <ScreenHeader
          variant="main"
          title="History"
          createLabel="Create"
          onCreate={() => {}}
          omitCreate
          menuLabel="History menu"
          menuItems={[]}
        />
        <div className="history-calendar__toolbar">
          <span className="history-calendar__year-pill glass">{yearPill}</span>
        </div>
      </div>
      <div className="list-with-index">
        <div className="list-with-index__scroll history-calendar__scroll">
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
                          const isSelected = effectiveSelected === cell.key;
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
                                onClick={() => setSelectedKey(cell.key)}
                              >
                                <span className="history-calendar__day-num">
                                  {cell.date.getDate()}
                                </span>
                                {hasSessions ? (
                                  <span className="history-calendar__bars" aria-hidden>
                                    {daySessions.length === 1 ? (
                                      <span
                                        className="history-calendar__bar history-calendar__bar--full"
                                        style={{
                                          background: sessionBarColor(daySessions[0]!.workoutId),
                                        }}
                                      />
                                    ) : (
                                      daySessions.map((s) => (
                                        <span
                                          key={s.id}
                                          className="history-calendar__bar history-calendar__bar--split"
                                          style={{
                                            background: sessionBarColor(s.workoutId),
                                          }}
                                        />
                                      ))
                                    )}
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

              {selectedSessions.length > 0 ? (
                <div className="history-calendar__day-detail">
                  <h3 className="history-calendar__day-detail-title">
                    {dateFromLocalDateKey(effectiveSelected!).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </h3>
                  <ul className="history-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {selectedSessions.map((s: WorkoutSession) => {
                      const name = workoutNameById.get(s.workoutId) ?? "Workout";
                      return (
                        <li key={s.id} className="history-list__item">
                          <Link to={`/history/${s.id}`} className="history-list__link">
                            <span className="history-list__name">{name}</span>
                            <span className="history-list__when muted">
                              {formatSessionWhen(s.completedAt)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : selectedKey != null && effectiveSelected != null && rows.length > 0 ? (
                <p className="muted history-calendar__hint">
                  No workouts on this day. Tap a day with a bar to open sessions.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
