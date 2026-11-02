"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { completedDays, enqueue, localDay, shiftDay, stamp, streaks, type Habit, type Snapshot } from "@/lib/domain";
import { changeSnapshot, readSnapshot } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { syncAccount } from "@/lib/sync";

const icons = ["✦", "🚶", "📖", "💧", "🌱", "🏋️", "🧘", "✍️", "🎯", "☀️"];
function Dialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement; ref.current?.showModal(); return () => { previous?.focus(); }; }, []);
  return <dialog ref={ref} aria-label={title} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <div className="dialog-head"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}>×</button></div>{children}
  </dialog>;
}
function CheckIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function Brand() { return <div className="brand"><span className="brand-icon"><CheckIcon/></span>checkmate<span className="brand-dot">.</span></div>; }
const labelDate = (day: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(day + "T12:00:00Z"));
export default function Checkmate() {
  const [scope, setScope] = useState<string | null>(null), [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<Snapshot | null>(null), [tab, setTab] = useState<"today" | "habits">("today");
  const [now, setNow] = useState(() => new Date()), [online, setOnline] = useState(true);
  const [status, setStatus] = useState("Saved on this device"), [error, setError] = useState("");
  const [modal, setModal] = useState<"add" | "account" | null>(null);
  const [selected, setSelected] = useState<string | null>(null), [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState(""), [icon, setIcon] = useState(icons[0]), [email, setEmail] = useState("");
  const [month, setMonth] = useState(""), [busy, setBusy] = useState(false);
  const scopeRef = useRef(scope); scopeRef.current = scope;
  useEffect(() => {
    let live = true; const client = supabase();
    const useUser = (next: User | null) => {
      if (!live) return; setUser(next); setState(null); setSelected(null); setModal(null); setScope(next?.id ?? "guest");
    };
    if (client) {
      client.auth.getSession().then(({ data, error }) => { if (error) setError("Could not restore your account. Local habits remain available."); useUser(data.session?.user ?? null); });
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        const next = session?.user ?? null;
        if (scopeRef.current !== (next?.id ?? "guest")) useUser(next); else setUser(next);
      });
      return () => { live = false; data.subscription.unsubscribe(); };
    } else { useUser(null); return () => { live = false; }; }
  }, []);
  useEffect(() => {
    if (!scope) return;
    let live = true;
    const refresh = () => { readSnapshot(scope).then(s => { if (live) setState(s); }).catch(() => { if (live) setError("Local storage is unavailable. Enable browser storage to save your progress."); }); };
    refresh();
    window.addEventListener("checkmate-storage", refresh);
    const channel = "BroadcastChannel" in window ? new BroadcastChannel("checkmate") : null;
    if (channel) channel.onmessage = e => { if (e.data === scope) refresh(); };
    return () => { live = false; window.removeEventListener("checkmate-storage", refresh); channel?.close(); };
  }, [scope]);
  useEffect(() => {
    const update = () => { setNow(new Date()); setOnline(navigator.onLine); };
    update(); const timer = window.setInterval(update, 1000);
    window.addEventListener("online", update); window.addEventListener("offline", update); document.addEventListener("visibilitychange", update);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").then(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => {
          navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
        });
        // Cache the public JS/CSS app shell even on the first controlled visit.
        const assets = performance.getEntriesByType("resource").map(entry => entry.name).filter(url => url.startsWith(location.origin + "/_next/static/"));
        navigator.serviceWorker.controller?.postMessage({ type: "CACHE_ASSETS", assets });
      }).catch(() => setError("Offline installation is unavailable. Your habits still save locally."));
    }
    return () => { clearInterval(timer); window.removeEventListener("online", update); window.removeEventListener("offline", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  useEffect(() => {
    const client = supabase(); if (!client || !scope || scope === "guest") return;
    let cancelled = false, running = false, timer: ReturnType<typeof setTimeout>, delay = 2000;
    const run = async () => {
      if (cancelled || running) return;
      clearTimeout(timer);
      if (!navigator.onLine) { setStatus("Offline · changes saved locally"); timer = setTimeout(run, 5000); return; }
      running = true; setStatus("Syncing…");
      try { await syncAccount(client, scope); delay = 2000; if (!cancelled) setStatus("Up to date"); }
      catch { if (!cancelled) setStatus("Saved locally · sync will retry"); delay = Math.min(delay * 2, 60000); }
      finally { running = false; if (!cancelled) timer = setTimeout(run, delay); }
    };
    const wake = () => { if (document.visibilityState === "visible") void run(); };
    void run(); window.addEventListener("online", wake); document.addEventListener("visibilitychange", wake);
    return () => { cancelled = true; clearTimeout(timer); window.removeEventListener("online", wake); document.removeEventListener("visibilitychange", wake); };
  }, [scope]);
  const today = state ? localDay(now, state.timezone) : "";
  const active = state?.habits.filter(h => !h.archived_at).sort((a,b) => a.display_order-b.display_order || a.id.localeCompare(b.id)) ?? [];
  const archived = state?.habits.filter(h => h.archived_at) ?? [];
  const doneCount = state ? active.filter(h => streaks(h, state.checks, today).completed).length : 0;
  const detail = state?.habits.find(h => h.id === selected);
  const ready = !!state && state.timezoneConfirmed;
  async function mutate(update: (s: Snapshot) => Snapshot) {
    if (!scope || !ready) return;
    try { const next = await changeSnapshot(scope, update); if (scopeRef.current === scope) setState(next); setError(""); }
    catch { setError("That change could not be saved. Please try again; your previous progress is still safe."); throw new Error("Local save failed"); }
  }
  function openAdd(h?: Habit) { setEditing(h?.id ?? null); setName(h?.name ?? ""); setIcon(h?.icon ?? icons[0]); setSelected(null); setModal("add"); }
  async function saveHabit(event: FormEvent) {
    event.preventDefault(); if (!name.trim() || busy || !today) return; setBusy(true);
    try {
      await mutate(s => {
        const old = s.habits.find(h => h.id === editing);
        return enqueue(s, { kind: "habit", row: { id: old?.id ?? crypto.randomUUID(), user_id: scope!, name: name.trim().slice(0,80), icon, start_date: old?.start_date ?? localDay(new Date(), s.timezone), display_order: old?.display_order ?? Math.max(-1, ...s.habits.map(h => h.display_order)) + 1, archived_at: old?.archived_at ?? null, ...stamp(s) } });
      }); setModal(null);
    } catch {} finally { setBusy(false); }
  }
  async function toggle(h: Habit, day: string) {
    if (!ready || !state || day > localDay(new Date(), state.timezone) || day < h.start_date) return;
    await mutate(s => {
      const existing = s.checks.find(c => c.habit_id === h.id && c.local_date === day);
      const version = stamp(s);
      return enqueue(s, { kind: "check", row: { id: h.id + ":" + day, user_id: scope!, habit_id: h.id, local_date: day, completed_at: existing?.completed_at ? null : version.updated_at, ...version } });
    }).catch(() => {});
  }
  async function archive(h: Habit) {
    await mutate(s => enqueue(s, { kind: "habit", row: { ...h, archived_at: h.archived_at ? null : new Date().toISOString(), ...stamp(s) } })).then(() => setSelected(null)).catch(() => {});
  }
  async function move(h: Habit, delta: number) {
    const index = active.findIndex(row => row.id === h.id), other = active[index + delta]; if (!other) return;
    await mutate(s => {
      const order = [...active]; [order[index], order[index + delta]] = [order[index + delta], order[index]];
      return order.reduce((next, item, i) => enqueue(next, { kind: "habit", row: { ...item, display_order: i, ...stamp(next) } }), s);
    }).catch(() => {});
  }
  function showDetail(h: Habit) { setSelected(h.id); setMonth(today.slice(0,7)); }
  async function signIn(event: FormEvent) {
    event.preventDefault(); const client = supabase(); if (!client) return; setBusy(true);
    const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin + "/" } });
    setError(error ? error.message : "Check your email for your sign-in link."); setBusy(false);
  }
  async function importGuest() {
    if (!scope || scope === "guest" || busy || !ready) return; setBusy(true);
    try {
      const guest = await readSnapshot("guest");
      await mutate(s => {
        if (s.importedGuest) return s;
        let next = s;
        for (const habit of guest.habits) {
          const id = crypto.randomUUID();
          next = enqueue(next, { kind: "habit", row: { ...habit, id, user_id: scope, display_order: next.habits.length, ...stamp(next) } });
          for (const check of guest.checks.filter(c => c.habit_id === habit.id))
            next = enqueue(next, { kind: "check", row: { ...check, id: id + ":" + check.local_date, habit_id: id, user_id: scope, ...stamp(next) } });
        }
        return { ...next, importedGuest: true };
      });
    } catch {} finally { setBusy(false); }
  }
  const selectedStats = detail && state ? streaks(detail, state.checks, today) : null;
  const daysInMonth = month ? new Date(Date.UTC(Number(month.slice(0,4)), Number(month.slice(5)), 0)).getUTCDate() : 0;
  const monthOffset = month ? new Date(month + "-01T12:00:00Z").getUTCDay() : 0;
  function nextMonth(delta: number) { const d = new Date(month + "-01T12:00:00Z"); d.setUTCMonth(d.getUTCMonth()+delta); setMonth(d.toISOString().slice(0,7)); }
  return <div className="app-shell">
    <aside className="sidebar"><Brand/><div className="sidebar-caption">A LITTLE BETTER, EVERY DAY</div>
      <nav aria-label="Main navigation">
        <button aria-current={tab === "today" ? "page" : undefined} onClick={() => setTab("today")}><span aria-hidden="true">▦</span> Today</button>
        <button aria-current={tab === "habits" ? "page" : undefined} onClick={() => setTab("habits")}><span aria-hidden="true">☷</span> My habits <small>{active.length}</small></button>
      </nav>
      <div className="sidebar-note"><span aria-hidden="true">✦</span><p>Small steps.<br/><strong>Real momentum.</strong></p><span className="note-line"/></div>
      <button className="account-nav" onClick={() => setModal("account")}><span className="avatar">{user ? "●" : "○"}</span><span>{user ? "Your account" : "Your space"}<small>{user ? "Cloud sync enabled" : "Stored on this device"}</small></span><span aria-hidden="true">↗</span></button>
    </aside>
    <main id="main"><header className="mobile-brand"><Brand/><button className="icon-button" aria-label="Open account" onClick={() => setModal("account")}>○</button></header>
      <div className="topline"><span>YOUR DAILY CHECK-IN</span><span className="save-status"><i className={online ? "" : "offline"}/>{user ? status : online ? "Saved on this device" : "Offline · saved on this device"}</span></div>
      <div className="page-heading"><div><h1>{tab === "today" ? "Today" : "My habits"}<span className="heading-dot">.</span></h1><p>{tab === "today" ? today ? labelDate(today) : "One day at a time." : "Make room for what matters."}</p></div>
        <button className="primary" onClick={() => openAdd()} disabled={!ready}><span aria-hidden="true">＋</span> Add a habit</button></div>
      {error && <div className="message" role="status">{error}<button aria-label="Dismiss message" onClick={() => setError("")}>×</button></div>}
      {!state ? <div className="empty" role="status">Loading your habits…</div> : <>
        {!ready && <div className="message" role="status">Connect once to load your account timezone before checking off habits.</div>}
        {tab === "today" ? <>
          <section className="progress-panel" aria-label="Daily progress">
            <div><span className="eyebrow">ONE CHECK AT A TIME</span><h2>{active.length && doneCount === active.length ? "You showed up. Nicely done." : "A little progress goes a long way."}</h2><p>{active.length ? doneCount + " of " + active.length + " habits complete. " + (doneCount === active.length ? "Enjoy the rest of your day." : "You've got this.") : "Your next chapter starts with one small habit."}</p></div>
            <div className="progress-circle" role="progressbar" aria-label="Habits completed today" aria-valuemin={0} aria-valuemax={active.length || 1} aria-valuenow={doneCount} style={{ "--progress": (active.length ? doneCount/active.length*100 : 0) + "%" } as React.CSSProperties}><span><strong>{active.length ? Math.round(doneCount/active.length*100) : 0}<small>%</small></strong><em>TODAY</em></span></div>
          </section>
          <div className="section-heading"><h2>Your daily habits <span>{active.length}</span></h2><p>Show up for yourself.</p></div>
          {!active.length ? <section className="empty"><span className="empty-mark">✦</span><h2>Big things start small.</h2><p>Add one thing you'd like to do every day.<br/>We’ll take it one check at a time.</p><button className="primary" disabled={!ready} onClick={() => openAdd()}>Create your first habit</button>
            <div className="suggestions">{["Take a walk", "Read for 10 minutes", "Drink more water"].map((v,i) => <button key={v} disabled={!ready} onClick={() => { openAdd(); setName(v); setIcon(icons[[1,2,3][i]]); }}>＋ {v}</button>)}</div></section>
          : <div className="habit-list">{active.map(h => {
            const stats = streaks(h, state.checks, today);
            return <article key={h.id} className={"habit-card " + (stats.completed ? "is-complete" : "")}>
              <span className="habit-symbol" aria-hidden="true">{h.icon}</span>
              <button className="habit-title" aria-label={"View " + h.name + " details"} onClick={() => showDetail(h)}><h3>{h.name}</h3><span>{stats.completed ? "Done for today" : "A fresh opportunity, every day"} <span aria-hidden="true">↗</span></span></button>
              <div className="streak"><span aria-hidden="true">✦</span><strong>{stats.current}</strong><span>day{stats.current !== 1 ? "s" : ""}</span></div>
              <button disabled={!ready} className="check-button" aria-label={(stats.completed ? "Undo " : "Complete ") + h.name} aria-pressed={stats.completed} onClick={() => void toggle(h, localDay(new Date(), state.timezone))}><CheckIcon/></button>
            </article>;
          })}</div>}
          <div className="daily-footer"><span aria-hidden="true">↗</span><p>Consistency isn't perfection. It's coming back.</p><span>ONE DAY AT A TIME</span></div>
        </> : <>
          <div className="section-heading"><h2>Active habits <span>{active.length}</span></h2><p>Use the arrows to reorder.</p></div>
          <div className="manage-list">{active.map((h,i) => <article key={h.id}><span className="habit-symbol" aria-hidden="true">{h.icon}</span><button className="manage-name" onClick={() => showDetail(h)}>{h.name}<small>Daily · since {labelDate(h.start_date)}</small></button><div className="manage-actions"><button className="icon-button" disabled={!ready || i === 0} aria-label={"Move " + h.name + " up"} onClick={() => void move(h,-1)}>↑</button><button className="icon-button" disabled={!ready || i === active.length-1} aria-label={"Move " + h.name + " down"} onClick={() => void move(h,1)}>↓</button><button disabled={!ready} onClick={() => openAdd(h)}>Rename</button><button disabled={!ready} onClick={() => void archive(h)}>Archive</button></div></article>)}</div>
          {!active.length && <div className="empty"><h2>A little room to grow.</h2><p>Add a habit to start building momentum.</p></div>}
          {!!archived.length && <><div className="section-heading"><h2>Archived <span>{archived.length}</span></h2><p>Your history stays with you.</p></div><div className="manage-list">{archived.map(h => <article key={h.id}><span className="habit-symbol" aria-hidden="true">{h.icon}</span><button className="manage-name" onClick={() => showDetail(h)}>{h.name}<small>View saved history</small></button><button disabled={!ready} onClick={() => void archive(h)}>Restore</button></article>)}</div></>}
        </>}
        <footer className="timezone">Days follow {state.timezone.replaceAll("_"," ")}{user ? " · account timezone" : " · device profile timezone"}</footer>
      </>}
      <nav className="mobile-nav" aria-label="Mobile navigation"><button aria-current={tab === "today" ? "page" : undefined} onClick={() => setTab("today")}>▦ Today</button><button aria-current={tab === "habits" ? "page" : undefined} onClick={() => setTab("habits")}>☷ My habits</button><button onClick={() => setModal("account")}>○ Account</button></nav>
    </main>
    {modal === "add" && <Dialog title={editing ? "Edit your habit" : "Make a little room for growth."} close={() => setModal(null)}><p className="dialog-intro">Pick something small. Make it yours. Show up daily.</p><form onSubmit={saveHabit}><label htmlFor="habit-name">Habit name</label><input id="habit-name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Walk 10,000 steps" autoFocus autoComplete="off"/><fieldset><legend>Choose an icon <span>(optional)</span></legend><div className="icon-picker">{icons.map(v => <button type="button" key={v} aria-label={"Choose icon " + v} aria-pressed={icon === v} onClick={() => setIcon(v)}>{v}</button>)}</div></fieldset><div className="frequency"><span aria-hidden="true">↻</span><div><strong>Every day</strong><small>A fresh start each morning</small></div><span className="pill">DAILY</span></div><button className="primary full" disabled={busy || !ready || !name.trim()}>{busy ? "Saving…" : editing ? "Save changes" : "Add habit"}</button></form></Dialog>}
    {detail && selectedStats && state && <Dialog title={detail.name} close={() => setSelected(null)}><div className="detail-stats"><div><strong>{selectedStats.current}</strong><span>Current streak</span></div><div><strong>{selectedStats.longest}</strong><span>Longest streak</span></div><div><strong>{selectedStats.total}</strong><span>Days completed</span></div></div>
      <div className="calendar-heading"><button className="icon-button" aria-label="Previous month" disabled={month <= detail.start_date.slice(0,7)} onClick={() => nextMonth(-1)}>←</button><h3>{month && new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(month+"-01T12:00:00Z"))}</h3><button className="icon-button" aria-label="Next month" disabled={month >= today.slice(0,7)} onClick={() => nextMonth(1)}>→</button></div>
      <div className="calendar" aria-label="Completion calendar">{["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <span className="weekday" key={d}>{d}</span>)}{Array.from({length:monthOffset},(_,i) => <span key={"blank"+i}/>)}{Array.from({length:daysInMonth},(_,i) => {
        const day = month + "-" + String(i+1).padStart(2,"0"), checked = completedDays(detail,state.checks,today).has(day);
        return <button key={day} disabled={!ready || day > today || day < detail.start_date} aria-label={(checked ? "Undo completion for " : "Complete ") + labelDate(day)} aria-pressed={checked} aria-current={day === today ? "date" : undefined} onClick={() => void toggle(detail,day)}>{i+1}</button>;
      })}</div><p className="calendar-help">Tap any tracked day to correct your history. Future days are locked.</p><div className="detail-actions"><button disabled={!ready} onClick={() => openAdd(detail)}>Rename habit</button><button disabled={!ready} onClick={() => void archive(detail)}>{detail.archived_at ? "Restore habit" : "Archive habit"}</button></div></Dialog>}
    {modal === "account" && <Dialog title="Your space" close={() => setModal(null)}>
      {user ? <><p className="dialog-intro">Signed in as <strong>{user.email}</strong></p><p>{status}. Your account timezone is <strong>{state?.timezone}</strong>.</p><p className="muted">Guest habits stay separate from your account unless you import them. Import keeps their recorded calendar dates.</p><button className="secondary full" disabled={busy || !ready || state?.importedGuest} onClick={() => void importGuest()}>{state?.importedGuest ? "Device habits imported" : "Import this device’s guest habits"}</button><button className="text-button full" onClick={async () => { const result = await supabase()?.auth.signOut({scope:"local"}); if (result?.error) setError(result.error.message); }}>Sign out on this device</button></>
      : supabase() ? <><p className="dialog-intro">Keep your progress with you. Sign in to sync across devices.</p><form onSubmit={signIn}><label htmlFor="email">Email address</label><input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/><button className="primary full" disabled={busy || !online}>{busy ? "Sending…" : "Email me a sign-in link"}</button></form><p className="muted">You can keep tracking without an account. Local progress stays in this browser.</p></>
      : <><p className="dialog-intro">Your habits work offline and are saved in this browser.</p><p>Accounts and device sync will be available when the cloud connection is configured.</p><p className="muted">Clearing this browser’s storage removes local progress. Install Checkmate from your browser’s menu for quick access.</p></>}
    </Dialog>}
  </div>;
}
