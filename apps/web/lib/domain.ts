export type Day = string;
export type Versioned = { updated_at: string; mutation_id: string };
export type Habit = Versioned & {
  id: string; user_id: string; name: string; icon: string; start_date: Day;
  display_order: number; archived_at: string | null;
};
export type DailyCheck = Versioned & {
  id: string; user_id: string; habit_id: string; local_date: Day; completed_at: string | null;
};
export type Pending = { kind: "habit"; row: Habit } | { kind: "check"; row: DailyCheck };
export type Snapshot = {
  habits: Habit[]; checks: DailyCheck[]; pending: Pending[];
  timezone: string; timezoneConfirmed: boolean; importedGuest: boolean;
};
export function localDay(date: Date, timezone: string): Day {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const v = (kind: string) => p.find(part => part.type === kind)!.value;
  return v("year") + "-" + v("month") + "-" + v("day");
}
export function shiftDay(day: Day, amount: number): Day {
  const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
export function completedDays(habit: Habit, checks: DailyCheck[], today: Day): Set<Day> {
  return new Set(checks.filter(c => c.habit_id === habit.id && c.completed_at && c.local_date >= habit.start_date && c.local_date <= today).map(c => c.local_date));
}
export function streaks(habit: Habit, checks: DailyCheck[], today: Day) {
  const done = completedDays(habit, checks, today);
  let cursor = done.has(today) ? today : shiftDay(today, -1), current = 0;
  while (done.has(cursor)) { current++; cursor = shiftDay(cursor, -1); }
  let longest = 0, run = 0, previous = "";
  for (const day of [...done].sort()) {
    run = previous && shiftDay(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run); previous = day;
  }
  return { current, longest, completed: done.has(today), total: done.size };
}
export function newer(a: Versioned, b: Versioned) {
  return a.updated_at > b.updated_at || (a.updated_at === b.updated_at && a.mutation_id > b.mutation_id);
}
export function mergeRows<T extends Versioned>(local: T[], remote: T[], key: (row: T) => string): T[] {
  const rows = new Map(local.map(row => [key(row), row]));
  for (const row of remote) { const old = rows.get(key(row)); if (!old || newer(row, old)) rows.set(key(row), row); }
  return [...rows.values()];
}
export function enqueue(state: Snapshot, change: Pending): Snapshot {
  const key = (p: Pending) => p.kind + ":" + p.row.id;
  const pending = state.pending.filter(p => key(p) !== key(change)).concat(change);
  return change.kind === "habit"
    ? { ...state, pending, habits: state.habits.filter(h => h.id !== change.row.id).concat(change.row) }
    : { ...state, pending, checks: state.checks.filter(c => c.id !== change.row.id).concat(change.row) };
}
export function acknowledge(state: Snapshot, mutationIds: string[]): Snapshot {
  return { ...state, pending: state.pending.filter(p => !mutationIds.includes(p.row.mutation_id)) };
}
export function stamp(state: Snapshot): Versioned {
  const last = Math.max(0, ...state.pending.map(p => Date.parse(p.row.updated_at)));
  return { updated_at: new Date(Math.max(Date.now(), last + 1)).toISOString(), mutation_id: crypto.randomUUID() };
}
export function emptySnapshot(scope: string): Snapshot {
  return { habits: [], checks: [], pending: [], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    timezoneConfirmed: scope === "guest", importedGuest: false };
}
