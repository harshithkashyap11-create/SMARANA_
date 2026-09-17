/** Session-only data key. IndexedDB holds authenticated ciphertext, never this key. */
const encoder = new TextEncoder();
let session: { owner: string; key: CryptoKey } | null = null;
const channel = typeof window !== "undefined" && typeof window.BroadcastChannel !== "undefined"
  ? new window.BroadcastChannel("smarana-vault-lock") : null;
if (channel) channel.onmessage = () => {
  session = null;
  window.dispatchEvent(new Event("smarana:vault-locked"));
};
export function lockVault(): void {
  const wasOpen = session !== null;
  session = null;
  if (wasOpen) channel?.postMessage("lock");
}
export function vaultOwner(): string | null { return session?.owner ?? null; }
export function openVault(owner: string, key: CryptoKey): void { session = { owner, key }; }
export function vaultSession() { return session; }
export function base64(data: ArrayBuffer | Uint8Array): string {
  // Avoid argument-size limits for media and large outbox payloads.
  let result = "";
  for (const byte of new Uint8Array(data)) result += String.fromCharCode(byte);
  return btoa(result);
}
export function unbase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
export interface Envelope { version: 1; owner: string; iv: string; ciphertext: string; }
export async function seal(value: unknown, context: string): Promise<Envelope> {
  const current = session;
  if (!current) throw new Error("Offline storage is locked");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv,
    additionalData: encoder.encode(`${current.owner}:${context}`) }, current.key,
    encoder.encode(JSON.stringify(value)));
  if (session !== current) throw new Error("Offline session changed");
  return { version: 1, owner: current.owner, iv: base64(iv), ciphertext: base64(ciphertext) };
}
export async function unseal(envelope: Envelope, context: string): Promise<unknown> {
  const current = session;
  if (!current || envelope.owner !== current.owner) return undefined;
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unbase64(envelope.iv),
    additionalData: encoder.encode(`${current.owner}:${context}`) }, current.key, unbase64(envelope.ciphertext));
  if (session !== current) throw new Error("Offline session changed");
  return JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
}
