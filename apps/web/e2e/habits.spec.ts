import { test, expect, type Page } from "@playwright/test";
async function add(page: Page, name: string) {
  await page.getByRole("button",{name:"Add a habit",exact:true}).click();
  await page.getByLabel("Habit name",{exact:true}).fill(name);
  await page.getByRole("button",{name:"Add habit",exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
test("fast checkoff, undo, rename, reorder and archive preserve history", async ({page}) => {
  await page.goto("/");
  await add(page,"Read 10 pages"); await add(page,"Take a walk");
  await page.getByRole("button",{name:"Complete Read 10 pages",exact:true}).click();
  await expect(page.getByRole("button",{name:"Undo Read 10 pages",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.reload();
  await expect(page.getByRole("button",{name:"Undo Read 10 pages",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Undo Read 10 pages",exact:true}).click();
  await page.getByRole("button",{name:"Complete Read 10 pages",exact:true}).click();
  await page.getByRole("button",{name:"View Read 10 pages details",exact:true}).click();
  await expect(page.getByRole("dialog")).toContainText("Longest streak");
  await page.getByRole("button",{name:"Rename habit",exact:true}).click();
  await page.getByLabel("Habit name",{exact:true}).fill("Read a chapter");
  await page.getByRole("button",{name:"Save changes",exact:true}).click();
  await page.getByRole("navigation").filter({has:page.getByRole("button",{name:/My habits/})}).first().getByRole("button",{name:/My habits/}).click();
  await page.getByRole("button",{name:"Move Take a walk up",exact:true}).click();
  await expect(page.locator(".manage-name").first()).toContainText("Take a walk");
  await page.locator(".manage-list article").filter({hasText:"Read a chapter"}).getByRole("button",{name:"Archive",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Archived"})).toBeVisible();
  await page.locator(".manage-list article").filter({hasText:"Read a chapter"}).getByRole("button",{name:"Restore",exact:true}).click();
  await page.getByRole("button",{name:"Read a chapter Daily",exact:false}).click();
  await expect(page.getByRole("dialog").locator(".detail-stats strong").nth(2)).toHaveText("1");
});
test("past-day corrections recalculate; future days cannot be checked", async ({page}) => {
  await page.goto("/"); await add(page,"Stretch");
  await page.evaluate(async () => {
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open("checkmate",1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    await new Promise<void>((resolve,reject)=>{const tx=db.transaction("snapshots","readwrite"),store=tx.objectStore("snapshots"),r=store.get("guest");r.onsuccess=()=>{const s=r.result;s.habits[0].start_date="2020-01-01";store.put(s,"guest");};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);}); window.dispatchEvent(new Event("checkmate-storage"));
  });
  await page.getByRole("button",{name:"View Stretch details",exact:true}).click();
  const allowed=page.getByRole("dialog").locator(".calendar button:not([disabled])");
  await allowed.first().click();
  await expect(allowed.first()).toHaveAttribute("aria-pressed","true");
  await allowed.first().click();
  await expect(allowed.first()).toHaveAttribute("aria-pressed","false");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("installed shell and IndexedDB work through offline reload and checkoffs", async ({page,context}) => {
  await page.goto("/"); await add(page,"Drink water");
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.reload(); // First controlled load caches the JS/CSS resources.
  await expect(page.getByRole("button",{name:"Complete Drink water",exact:true})).toBeVisible();
  await page.waitForFunction(async()=>{
    const cache=await caches.open("checkmate-shell-v1");
    const resources=performance.getEntriesByType("resource").map(e=>e.name).filter(u=>u.includes("/_next/static/"));
    return (await Promise.all(resources.map(u=>cache.match(u)))).every(Boolean);
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button",{name:"Complete Drink water",exact:true}).click();
  await expect(page.getByRole("button",{name:"Undo Drink water",exact:true})).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByRole("button",{name:"Undo Drink water",exact:true})).toBeVisible();
  await page.screenshot({path:"test-results/today.png",fullPage:true});
});
