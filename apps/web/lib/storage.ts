import { emptySnapshot, type Snapshot } from "./domain";
let connection: Promise<IDBDatabase> | undefined;
function database() {
  if (!connection) connection = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("checkmate", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("snapshots");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { connection = undefined; reject(req.error); };
  });
  return connection;
}
export async function readSnapshot(scope: string): Promise<Snapshot> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("snapshots", "readonly"), req = tx.objectStore("snapshots").get(scope);
    req.onsuccess = () => resolve(req.result ?? emptySnapshot(scope));
    req.onerror = () => reject(req.error);
  });
}
export async function changeSnapshot(scope: string, update: (state: Snapshot) => Snapshot): Promise<Snapshot> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("snapshots", "readwrite"), store = tx.objectStore("snapshots");
    const req = store.get(scope); let next: Snapshot;
    req.onsuccess = () => {
      try { next = update(req.result ?? emptySnapshot(scope)); store.put(next, scope); }
      catch (error) { tx.abort(); reject(error); }
    };
    tx.oncomplete = () => {
      window.dispatchEvent(new Event("checkmate-storage"));
      if ("BroadcastChannel" in window) { const channel = new BroadcastChannel("checkmate"); channel.postMessage(scope); channel.close(); }
      resolve(next);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Could not save locally."));
  });
}
