/** Local calendar day at midnight (no time zone string parsing). */
export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse `YYYY-MM-DD` as a local calendar date. */
export function dateFromLocalDateKey(key: string): Date {
  const [ys, ms, ds] = key.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return new Date(NaN);
  }
  return new Date(y, m - 1, d);
}

export function parseIsoToLocalDay(iso: string): Date | undefined {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return undefined;
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * End of the visible calendar range: the later of today (local) and the latest session day.
 * When there are no sessions, this is today.
 */
export function calendarRangeEnd(now: Date, sessionCompletedAts: readonly string[]): Date {
  const today = startOfLocalDay(now);
  let latest = 0;
  for (const iso of sessionCompletedAts) {
    const day = parseIsoToLocalDay(iso);
    if (day) latest = Math.max(latest, day.getTime());
  }
  const endMs = Math.max(today.getTime(), latest);
  return new Date(endMs);
}

/** First day of the month three months before the month containing `rangeEnd`. */
export function calendarRangeStart(rangeEnd: Date): Date {
  return new Date(rangeEnd.getFullYear(), rangeEnd.getMonth() - 3, 1);
}

export function isDateInRange(day: Date, rangeStart: Date, rangeEnd: Date): boolean {
  const t = startOfLocalDay(day).getTime();
  return t >= rangeStart.getTime() && t <= rangeEnd.getTime();
}

export interface YearMonth {
  year: number;
  monthIndex: number;
}

export function monthsInRange(rangeStart: Date, rangeEnd: Date): YearMonth[] {
  const out: YearMonth[] = [];
  let y = rangeStart.getFullYear();
  let m = rangeStart.getMonth();
  const endY = rangeEnd.getFullYear();
  const endM = rangeEnd.getMonth();
  while (y < endY || (y === endY && m <= endM)) {
    out.push({ year: y, monthIndex: m });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

export interface CalendarCell {
  date: Date;
  inCurrentMonth: boolean;
  inRange: boolean;
  isToday: boolean;
  key: string;
}

/** Sunday = 0 … Saturday = 6. */
export function buildMonthGrid(
  year: number,
  monthIndex: number,
  rangeStart: Date,
  rangeEnd: Date,
  today: Date,
): CalendarCell[] {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const lead = first.getDay();
  const totalDays = last.getDate();
  const cells: CalendarCell[] = [];
  const todayStart = startOfLocalDay(today);

  for (let i = lead; i > 0; i--) {
    const d = new Date(year, monthIndex, 1 - i);
    cells.push({
      date: d,
      inCurrentMonth: false,
      inRange: isDateInRange(d, rangeStart, rangeEnd),
      isToday: startOfLocalDay(d).getTime() === todayStart.getTime(),
      key: localDateKey(d),
    });
  }

  for (let dom = 1; dom <= totalDays; dom++) {
    const d = new Date(year, monthIndex, dom);
    cells.push({
      date: d,
      inCurrentMonth: true,
      inRange: isDateInRange(d, rangeStart, rangeEnd),
      isToday: startOfLocalDay(d).getTime() === todayStart.getTime(),
      key: localDateKey(d),
    });
  }

  const tail = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= tail; i++) {
    const d = new Date(year, monthIndex, totalDays + i);
    cells.push({
      date: d,
      inCurrentMonth: false,
      inRange: isDateInRange(d, rangeStart, rangeEnd),
      isToday: startOfLocalDay(d).getTime() === todayStart.getTime(),
      key: localDateKey(d),
    });
  }

  return cells;
}
