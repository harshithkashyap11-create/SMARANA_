import type { UserSummary } from "../api/generated/models";

import { db, getMeta, setMeta } from "./schema";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_OFFLINE_FAILURES = 5;
const OFFLINE_LOCK_MS = 15 * 60 * 1000;

interface StoredSecrets {
  salt: string;
  verifierIv: string;
  verifier: string;
  tokenIv: string;
  user: UserSummary;
}

let activeOfflineKey: CryptoKey | null = null;

export interface OfflineUnlock {
  refreshToken: string;
  user: UserSummary;
}

function b64(data: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)));
}

function bytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 210_000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function storeOfflineSecrets(
  pin: string,
  refreshToken: string,
  user: UserSummary,
): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const verifierIv = crypto.getRandomValues(new Uint8Array(12));
  const tokenIv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  activeOfflineKey = key;
  const verifier = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: verifierIv },
    key,
    encoder.encode("smarana-pin"),
  );
  const encryptedToken = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: tokenIv },
    key,
    encoder.encode(refreshToken),
  );
  const metadata: StoredSecrets = {
    salt: b64(salt),
    verifierIv: b64(verifierIv),
    verifier: b64(verifier),
    tokenIv: b64(tokenIv),
    user,
  };
  await setMeta("pinVerifier", JSON.stringify(metadata));
  await setMeta("refreshTokenEncrypted", b64(encryptedToken));
  await clearOfflineFailures();
}

export async function unlockOffline(
  pin: string,
): Promise<OfflineUnlock | null> {
  const raw = await getMeta("pinVerifier");
  const encrypted = await getMeta("refreshTokenEncrypted");
  if (!raw || !encrypted) return null;
  try {
    const data = JSON.parse(raw) as StoredSecrets;
    const key = await deriveKey(pin, bytes(data.salt));
    const verifier = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes(data.verifierIv) as BufferSource },
      key,
      bytes(data.verifier) as BufferSource,
    );
    if (decoder.decode(verifier) !== "smarana-pin") return null;
    const token = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes(data.tokenIv) as BufferSource },
      key,
      bytes(encrypted) as BufferSource,
    );
    activeOfflineKey = key;
    return { refreshToken: decoder.decode(token), user: data.user };
  } catch {
    return null;
  }
}

export async function updateEncryptedRefreshToken(
  refreshToken: string,
): Promise<void> {
  const raw = await getMeta("pinVerifier");
  if (!raw || !activeOfflineKey) return;
  const data = JSON.parse(raw) as StoredSecrets;
  const tokenIv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedToken = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: tokenIv },
    activeOfflineKey,
    encoder.encode(refreshToken),
  );
  await setMeta(
    "pinVerifier",
    JSON.stringify({ ...data, tokenIv: b64(tokenIv) }),
  );
  await setMeta("refreshTokenEncrypted", b64(encryptedToken));
}

export async function offlineLockedUntil(
  now = Date.now(),
): Promise<number | null> {
  const value = Number(await getMeta("offlineLockedUntil"));
  if (!Number.isFinite(value) || value <= now) {
    if (value) await clearOfflineFailures();
    return null;
  }
  return value;
}

export async function recordOfflineFailure(
  now = Date.now(),
): Promise<number | null> {
  const failures = Number(await getMeta("offlineFailures")) || 0;
  const next = failures + 1;
  await setMeta("offlineFailures", String(next));
  if (next < MAX_OFFLINE_FAILURES) return null;
  const lockedUntil = now + OFFLINE_LOCK_MS;
  await setMeta("offlineLockedUntil", String(lockedUntil));
  return lockedUntil;
}

export async function clearOfflineFailures(): Promise<void> {
  await db.meta.bulkDelete(["offlineFailures", "offlineLockedUntil"]);
}

export async function clearOfflineSecrets(): Promise<void> {
  activeOfflineKey = null;
  await db.meta.bulkDelete([
    "pinVerifier",
    "refreshTokenEncrypted",
    "offlineFailures",
    "offlineLockedUntil",
  ]);
}
