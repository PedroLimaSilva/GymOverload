import { describe, expect, it } from "vitest";
import type { WorkoutSession } from "../model/types";
import {
  buildMonthGrid,
  calendarRangeEnd,
  calendarRangeStart,
  dateFromLocalDateKey,
  localDateKey,
  monthsInRange,
  parseIsoToLocalDay,
  sessionCalendarPlacementIso,
} from "./historyCalendar";

function session(over: Partial<WorkoutSession>): WorkoutSession {
  return {
    id: "s1",
    workoutId: "w1",
    completedAt: "2026-06-16T10:00:00.000Z",
    ...over,
  };
}

describe("historyCalendar", () => {
  it("calendarRangeEnd uses today when there are no sessions", () => {
    const now = new Date(2026, 3, 4, 15, 30);
    const end = calendarRangeEnd(now, []);
    expect(localDateKey(end)).toBe("2026-04-04");
  });

  it("calendarRangeEnd uses latest session day when after today", () => {
    const now = new Date(2026, 3, 1, 12, 0);
    const iso = "2026-04-10T10:00:00.000Z";
    const end = calendarRangeEnd(now, [iso]);
    const expected = parseIsoToLocalDay(iso);
    expect(expected).toBeDefined();
    expect(localDateKey(end)).toBe(localDateKey(expected!));
  });

  it("calendarRangeStart is first of month three months before range end month", () => {
    const end = new Date(2026, 3, 4);
    const start = calendarRangeStart(end);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
  });

  it("monthsInRange includes four months for a three-month lookback window", () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 3, 4);
    const months = monthsInRange(start, end);
    expect(months.map((m) => m.monthIndex)).toEqual([0, 1, 2, 3]);
  });

  it("buildMonthGrid pads to full weeks and flags today", () => {
    const rangeStart = new Date(2026, 0, 1);
    const rangeEnd = new Date(2026, 3, 30);
    const today = new Date(2026, 3, 4);
    const grid = buildMonthGrid(2026, 3, rangeStart, rangeEnd, today);
    expect(grid.length % 7).toBe(0);
    const todayCells = grid.filter((c) => c.isToday);
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0]?.inCurrentMonth).toBe(true);
  });

  it("parseIsoToLocalDay returns a valid local day", () => {
    const d = parseIsoToLocalDay("2026-04-03T12:00:00.000Z");
    expect(d).toBeDefined();
    expect(Number.isNaN(d!.getTime())).toBe(false);
  });

  it("dateFromLocalDateKey round-trips with localDateKey", () => {
    const d = new Date(2026, 0, 5);
    expect(localDateKey(dateFromLocalDateKey(localDateKey(d)))).toBe(localDateKey(d));
  });

  it("sessionCalendarPlacementIso uses startedAt when valid and not after completedAt", () => {
    const started = "2026-06-15T08:00:00.000Z";
    expect(sessionCalendarPlacementIso(session({ startedAt: started }))).toBe(started);
  });

  it("sessionCalendarPlacementIso falls back to completedAt when startedAt is missing", () => {
    const c = "2026-06-16T10:00:00.000Z";
    expect(sessionCalendarPlacementIso(session({ completedAt: c }))).toBe(c);
  });

  it("sessionCalendarPlacementIso ignores startedAt after completedAt", () => {
    const c = "2026-06-10T12:00:00.000Z";
    expect(
      sessionCalendarPlacementIso(
        session({ completedAt: c, startedAt: "2026-06-11T00:00:00.000Z" }),
      ),
    ).toBe(c);
  });
});
