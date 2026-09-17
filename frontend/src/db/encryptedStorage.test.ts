import "fake-indexeddb/auto";
import { webcrypto } from "node:crypto";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { db, activatePatient, getMeta, setMeta, setSessionUser, deleteLocalPatientData } from "./schema";
import { storeOfflineSecrets, unlockOffline, clearOfflineSecrets, changeOfflinePin, updateEncryptedRefreshToken, revokeOfflineAccess } from "./crypto";
import { createOutboxEntry, nextBatch, markRetry, markRejected } from "./outbox";
import { lockVault } from "./vault";
const user = { id: "user-a", display_name: "Private patient", role: "patient" as const, email: "", phone: "" };
async function login() {
  await storeOfflineSecrets("1234", "secret-token", user);
  setSessionUser(user.id);
  await activatePatient("patient-a", user.id);
}
async function raw(store: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const request = db.backendDB().transaction(store).objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as unknown[]);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed"));
  });
}
beforeEach(async () => {
  vi.stubGlobal("crypto", webcrypto);
  lockVault(); setSessionUser(null);
  await db.delete(); await db.open();
});
afterEach(async () => { lockVault(); await db.delete(); });
test("all patient stores and metadata persist as ciphertext; indexes and CRUD still work", async () => {
  await login();
  await db.transaction("rw", db.memories, db.outbox, db.meta, async () => {
    await db.memories.put({ id: "memory-a", patientId: "patient-a", title: "Private wedding", occasion: "wedding", occurredOn: null, place: "Private home", summary: "Private story", people: [], media: [] });
    await setMeta("checkins", '[{"private":"Private checkin"}]');
    await db.outbox.put(createOutboxEntry("mood_log", "log-a", "patient-a", { note: "Private symptom" }));
  });
  expect(JSON.stringify(await raw("memories"))).not.toContain("Private");
  expect(JSON.stringify(await raw("outbox"))).not.toContain("Private");
  expect(JSON.stringify(await raw("meta"))).not.toContain("Private");
  expect((await db.memories.where("patientId").equals("patient-a").first())?.title).toBe("Private wedding");
  await db.memories.update("memory-a", { title: "Updated wedding" });
  expect((await db.memories.filter((x) => x.title === "Updated wedding").toArray())).toHaveLength(1);
  const pending = await nextBatch();
  expect(pending[0]?.payload.note).toBe("Private symptom");
  await markRetry(pending[0]!.id, "Private network error");
  await markRejected(pending[0]!.id, "invalid", "Private rejection");
  expect(JSON.stringify(await raw("outboxDead"))).not.toContain("Private");
});
test("reload/offline unlock restores writes; wrong PIN, logout and another account cannot read them", async () => {
  await login();
  await setMeta("checkins", "Private checkin");
  await db.outbox.put(createOutboxEntry("mood_log", "log-a", "patient-a", { note: "Private symptom" }));
  await clearOfflineSecrets(); setSessionUser(null); db.close(); await db.open();
  expect(await getMeta("checkins")).toBeUndefined();
  expect(await unlockOffline("9999")).toBeNull();
  expect(await nextBatch()).toHaveLength(0);
  const unlocked = await unlockOffline("1234"); expect(unlocked?.user).toEqual(user);
  setSessionUser(user.id);
  expect((await nextBatch())[0]?.payload.note).toBe("Private symptom");
  const other = { ...user, id: "user-b" };
  await storeOfflineSecrets("5678", "other-token", other); setSessionUser(other.id); await activatePatient("patient-b", other.id);
  expect(await nextBatch()).toHaveLength(0);
  expect(await getMeta("checkins")).toBeUndefined();
  await storeOfflineSecrets("1234", "new-token", user); setSessionUser(user.id); await activatePatient("patient-a", user.id);
  expect(await nextBatch()).toHaveLength(1);
  expect(await getMeta("checkins")).toBe("Private checkin");
});
test("PIN rewrap preserves outbox; reset without old PIN fails; deletion guards pending writes", async () => {
  await login();
  await db.outbox.put(createOutboxEntry("mood_log", "log-a", "patient-a", { note: "Private symptom" }));
  await expect(storeOfflineSecrets("9999", "new-token", user)).rejects.toThrow();
  await unlockOffline("1234");
  await changeOfflinePin("1234", "4321"); await clearOfflineSecrets();
  expect(await unlockOffline("1234")).toBeNull();
  expect(await unlockOffline("4321")).not.toBeNull();
  expect(await nextBatch()).toHaveLength(1);
  await expect(deleteLocalPatientData()).rejects.toThrow("pending");
  await deleteLocalPatientData(true);
  expect(await raw("outbox")).toEqual([]);
  expect(await unlockOffline("4321")).toBeNull();
});

test("authenticated legacy migration preserves unsynced identities and removes plaintext", async () => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode("1234"), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const b64 = (value: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(value)));
  const verifierIv = crypto.getRandomValues(new Uint8Array(12));
  const tokenIv = crypto.getRandomValues(new Uint8Array(12));
  const verifier = b64(await crypto.subtle.encrypt({ name: "AES-GCM", iv: verifierIv }, key, new TextEncoder().encode("smarana-pin")));
  const token = b64(await crypto.subtle.encrypt({ name: "AES-GCM", iv: tokenIv }, key, new TextEncoder().encode("old-token")));
  await db.meta.put({ key: "pinVerifier", value: JSON.stringify({ salt: b64(salt), verifierIv: b64(verifierIv), verifier, tokenIv: b64(tokenIv), user }) });
  await db.meta.put({ key: "refreshTokenEncrypted", value: token });
  const queued = createOutboxEntry("mood_log", "legacy-log", "patient-a", { note: "Private unsynced note" });
  await new Promise<void>((resolve, reject) => {
    const transaction = db.backendDB().transaction("outbox", "readwrite");
    transaction.objectStore("outbox").put(queued);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("legacy fixture failed"));
  });
  expect(await unlockOffline("9999")).toBeNull();
  expect((await raw("outbox"))[0]).toEqual(queued);
  expect(await unlockOffline("1234")).not.toBeNull();
  expect(await nextBatch()).toEqual([queued]);
  expect(JSON.stringify(await raw("outbox"))).not.toContain("Private unsynced note");
  expect(JSON.stringify(await raw("meta"))).not.toContain("Private patient");
});

test("private photos persist only as ciphertext and reload offline", async () => {
  const { privateMediaUrl } = await import("./media");
  await login();
  const content = new TextEncoder().encode("Private photo bytes");
  const objectUrl = vi.fn().mockReturnValue("blob:private-photo");
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: objectUrl }));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(content, { headers: { "Content-Type": "image/png" } })));
  expect(await privateMediaUrl("/media/private-family.png")).toBe("blob:private-photo");
  const persisted = JSON.stringify(await raw("memoryMedia"));
  expect(persisted).not.toContain("private-family");
  expect(persisted).not.toContain(btoa("Private photo bytes"));
  await clearOfflineSecrets();
  expect(await privateMediaUrl("/media/private-family.png")).toBeUndefined();
  await unlockOffline("1234");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  expect(await privateMediaUrl("/media/private-family.png")).toBe("blob:private-photo");
  vi.unstubAllGlobals();
});


test("refresh rotation survives reload; rejected credentials lock retained pending writes", async () => {
  await login();
  await db.outbox.put(createOutboxEntry("mood_log", "log-a", "patient-a", { note: "Private symptom" }));
  await updateEncryptedRefreshToken("rotated-token");
  await clearOfflineSecrets();
  expect((await unlockOffline("1234"))?.refreshToken).toBe("rotated-token");
  await revokeOfflineAccess();
  expect(await unlockOffline("1234")).toBeNull();
  expect(await nextBatch()).toHaveLength(0);
  expect(await raw("outbox")).toHaveLength(1);
  await storeOfflineSecrets("1234", "reauth-token", user);
  setSessionUser(user.id);
  expect(await nextBatch()).toHaveLength(1);
});

test("authenticated envelopes reject ciphertext tampering", async () => {
  await login();
  await db.memories.put({ id: "memory-a", patientId: "patient-a", title: "Private wedding", occasion: "wedding", occurredOn: null, place: "Private home", summary: "Private story", people: [], media: [] });
  const rows = await raw("memories") as Array<{ __sealed: { ciphertext: string } }>;
  rows[0]!.__sealed.ciphertext = btoa("corrupted encrypted record");
  await new Promise<void>((resolve, reject) => {
    const transaction = db.backendDB().transaction("memories", "readwrite");
    transaction.objectStore("memories").put(rows[0]);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("tamper fixture failed"));
  });
  await expect(db.memories.get("memory-a")).rejects.toThrow();
});
