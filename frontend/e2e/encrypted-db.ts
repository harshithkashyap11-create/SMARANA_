import type { Page } from "@playwright/test";
/** Test-only inspection: unlocks the persisted wrapped key with the fixture PIN. */
export async function readEncryptedRecords(page: Page, store: string): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(async (store) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("smarana"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error ?? new Error("IndexedDB failed"));
    });
    const get = (store: string, key: string) => new Promise<Record<string, unknown>>((resolve, reject) => {
      const r = db.transaction(store).objectStore(store).get(key); r.onsuccess = () => resolve(r.result as Record<string, unknown>); r.onerror = () => reject(r.error ?? new Error("IndexedDB failed"));
    });
    const meta = await get("meta", "pinVerifier");
    const secrets = JSON.parse(String(meta.value)) as { owner: string; salt: string; keyIv: string; wrappedKey: string };
    const bytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode("1234"), "PBKDF2", false, ["deriveKey"]);
    const wrapping = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: bytes(secrets.salt), iterations: 210000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const rawKey = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(secrets.keyIv) }, wrapping, bytes(secrets.wrappedKey));
    const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
    const rows = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => resolve(r.result as Array<Record<string, unknown>>); r.onerror = () => reject(r.error ?? new Error("IndexedDB failed"));
    });
    db.close();
    return Promise.all(rows.map(async (row) => {
      if (!row.__sealed) return row;
      const envelope = row.__sealed as { owner: string; iv: string; ciphertext: string };
      const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(envelope.iv), additionalData: new TextEncoder().encode(`${envelope.owner}:${store}:${String(row[store === "meta" ? "key" : "id"])}`) }, key, bytes(envelope.ciphertext));
      return JSON.parse(new TextDecoder().decode(plaintext)) as Record<string, unknown>;
    }));
  }, store);
}
