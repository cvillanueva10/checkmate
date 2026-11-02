import { describe, expect, it } from "vitest";
import { acknowledge, completedDays, emptySnapshot, enqueue, localDay, mergeRows, shiftDay, stamp, streaks, type Habit, type DailyCheck } from "../lib/domain";
const habit: Habit = { id: "a", user_id:"guest", name:"Walk", icon:"✦",start_date:"2026-01-01",display_order:0,archived_at:null,updated_at:"2026-01-01T00:00:00.000Z",mutation_id:"a" };
const check = (day: string, completed = true): DailyCheck => ({ id:"a:"+day, habit_id:"a", user_id:"guest", local_date:day,completed_at:completed?"2026-01-01T00:00:00.000Z":null,updated_at:"2026-01-01T00:00:00.000Z",mutation_id:"a" });
describe("daily streak rules", () => {
  it("keeps yesterday's streak until local midnight; checking today adds a day", () => {
    const rows=["2026-01-05","2026-01-06","2026-01-07"].map(d=>check(d));
    expect(streaks(habit,rows,"2026-01-08")).toMatchObject({current:3,longest:3,completed:false});
    expect(streaks(habit,[...rows,check("2026-01-08")],"2026-01-08").current).toBe(4);
    expect(streaks(habit,rows,"2026-01-09").current).toBe(0);
  });
  it("recalculates current and longest after a past correction or undo", () => {
    const rows=["2026-01-05","2026-01-07","2026-01-08"].map(d=>check(d));
    expect(streaks(habit,rows,"2026-01-08").current).toBe(2);
    expect(streaks(habit,[...rows,check("2026-01-06")],"2026-01-08").longest).toBe(4);
    expect(streaks(habit,rows.filter(c=>c.local_date!=="2026-01-07"),"2026-01-08").current).toBe(1);
  });
  it("counts each date once and ignores undone, future, other-habit, and pre-start rows", () => {
    const rows=[check("2026-01-01"),check("2026-01-01"),check("2025-12-31"),check("2026-01-02",false),check("2026-01-04"),{...check("2026-01-03"),habit_id:"b"}];
    expect([...completedDays(habit,rows,"2026-01-03")]).toEqual(["2026-01-01"]);
  });
  it("handles leap years, month/year boundaries and DST as calendar days", () => {
    expect(shiftDay("2024-02-28",1)).toBe("2024-02-29");
    expect(shiftDay("2026-12-31",1)).toBe("2027-01-01");
    expect(shiftDay("2026-03-08",1)).toBe("2026-03-09");
    expect(localDay(new Date("2026-11-02T07:59:59Z"),"America/Los_Angeles")).toBe("2026-11-01");
    expect(localDay(new Date("2026-11-02T08:00:00Z"),"America/Los_Angeles")).toBe("2026-11-02");
    expect(localDay(new Date("2026-01-01T12:00:00Z"),"Pacific/Auckland")).toBe("2026-01-02");
  });
});
describe("offline retries and merge", () => {
  it("does not resurrect a later undo when an older device syncs", () => {
    const old=check("2026-01-01"), undo={...old, completed_at:null, updated_at:"2026-01-02T00:00:00.000Z",mutation_id:"b"};
    expect(mergeRows([undo],[old],c=>c.id)).toEqual([undo]);
    expect(mergeRows([old],[undo],c=>c.id)).toEqual([undo]);
  });
  it("keeps edits to different dates and uses a deterministic tie break", () => {
    const a=check("2026-01-01"), b=check("2026-01-02");
    expect(mergeRows([a],[b],c=>c.id)).toHaveLength(2);
    const undo={...a,completed_at:null,mutation_id:"z"};
    expect(mergeRows([a],[undo],c=>c.id)[0].completed_at).toBeNull();
  });
  it("acknowledging an in-flight change leaves a newer queued edit intact", () => {
    let state=enqueue(emptySnapshot("guest"),{kind:"check",row:check("2026-01-01")});
    state=enqueue(state,{kind:"check",row:{...check("2026-01-01",false),mutation_id:"b"}});
    expect(acknowledge(state,["a"]).pending).toHaveLength(1);
    expect(acknowledge(state,["b"]).pending).toHaveLength(0);
  });
});

it("compares server timestamp formats by instant and keeps local edits monotonic", () => {
  const local=check("2026-01-01");
  const remote={...local,completed_at:null,updated_at:"2026-01-01T00:00:00+00:00",mutation_id:"z"};
  expect(mergeRows([local],[remote],c=>c.id)[0].completed_at).toBeNull();
  const state=emptySnapshot("guest"); state.checks=[{...local,updated_at:"2099-01-01T00:00:00Z"}];
  expect(Date.parse(stamp(state).updated_at)).toBeGreaterThan(Date.parse(state.checks[0].updated_at));
});
