import { db } from "./schema";
import { base64, unbase64, vaultOwner } from "./vault";
/** Private media bypasses HTTP and service-worker caches and is encrypted in memoryMedia. */
export async function privateMediaUrl(url: string): Promise<string | undefined> {
  if (url.startsWith("/content/") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  const owner = vaultOwner();
  if (!owner) return undefined;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
  const id = `media:${owner}:${base64(digest)}`;
  let row = await db.memoryMedia.get(id);
  if (!row && navigator.onLine) {
    const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) return undefined;
    const content = base64(await response.arrayBuffer());
    if (owner !== vaultOwner()) return undefined;
    row = { id, patientId: owner, deviceUpdatedAt: new Date().toISOString(), content, mime: response.headers.get("Content-Type") ?? "application/octet-stream" };
    await db.memoryMedia.put(row);
  }
  if (!row || owner !== vaultOwner() || typeof row.content !== "string") return undefined;
  return URL.createObjectURL(new Blob([unbase64(row.content)], { type: String(row.mime) }));
}

/** Preserve owned legacy cached photos before retiring the plaintext media cache. */
export async function migrateLegacyMedia(): Promise<void> {
  if (typeof caches === "undefined") return;
  const owner = vaultOwner();
  if (!owner || !(await caches.has("smarana-media"))) return;
  const legacy = await caches.open("smarana-media");
  const urls = new Set<string>();
  for (const member of await db.familyMembers.toArray()) if (member.photoUrl) urls.add(member.photoUrl);
  for (const memory of await db.memories.toArray()) for (const media of memory.media) if (media.url) urls.add(media.url);
  for (const url of urls) {
    const response = await legacy.match(url);
    if (!response) continue;
    const id = `media:${owner}:${base64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url)))}`;
    await db.memoryMedia.put({ id, patientId: owner, deviceUpdatedAt: new Date().toISOString(), content: base64(await response.arrayBuffer()), mime: response.headers.get("Content-Type") ?? "application/octet-stream" });
  }
  await caches.delete("smarana-media");
}
