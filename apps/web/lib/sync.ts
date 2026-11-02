import type { SupabaseClient } from "@supabase/supabase-js";
import { acknowledge, mergeRows, type Habit, type DailyCheck } from "./domain";
import { readSnapshot, changeSnapshot } from "./storage";
async function allRows<T>(client: SupabaseClient, table: string, userId: string): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 1000) {
    const result = await client.from(table).select("*").eq("user_id", userId).order("id").range(start, start + 999);
    if (result.error) throw result.error;
    rows.push(...(result.data as T[])); if (result.data.length < 1000) return rows;
  }
}
export async function syncAccount(client: SupabaseClient, userId: string) {
  let state = await readSnapshot(userId);
  const created = await client.from("profiles").upsert({ id: userId, timezone: state.timezone }, { onConflict: "id", ignoreDuplicates: true });
  if (created.error) throw created.error;
  const profile = await client.from("profiles").select("timezone").eq("id", userId).single();
  if (profile.error) throw profile.error;
  state = await changeSnapshot(userId, s => ({ ...s, timezone: profile.data.timezone, timezoneConfirmed: true }));
  // Habits must exist before their checks. Mutation IDs ensure an in-flight acknowledgement
  // cannot remove a newer local edit to the same row.
  const pending = [...state.pending].sort((a, b) => (a.kind === "habit" ? 0 : 1) - (b.kind === "habit" ? 0 : 1));
  for (const entry of pending) {
    const result = await client.rpc(entry.kind === "habit" ? "apply_habit" : "apply_daily_check", { payload: entry.row });
    if (result.error) throw result.error;
    await changeSnapshot(userId, s => acknowledge(s, [entry.row.mutation_id]));
  }
  const [habits, checks] = await Promise.all([
    allRows<Habit>(client, "habits", userId), allRows<DailyCheck>(client, "daily_checks", userId)
  ]);
  await changeSnapshot(userId, s => ({
    ...s, habits: mergeRows(s.habits, habits, h => h.id), checks: mergeRows(s.checks, checks, c => c.id)
  }));
}
