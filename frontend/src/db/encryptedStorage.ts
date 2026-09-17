import Dexie, { type DBCoreCursor, type Middleware, type DBCore } from "dexie";
import { seal, unseal, vaultOwner, type Envelope } from "./vault";

// Only routing UUIDs, scheduling indexes, and public catalog data remain outside ciphertext.
// All patient content, metrics, notes, tokens, and metadata values are inside the envelope.
const publicMeta = new Set(["pinVerifier", "refreshTokenEncrypted", "offlineFailures", "offlineLockedUntil", "patientId", "patientUserId", "language"]);
export function sensitive(table: string, row: Record<string, unknown>): boolean {
  return table !== "gameDefinitions" && (table !== "meta" || !publicMeta.has(String(row.key)) && !String(row.key).startsWith("credential:"));
}
let migrating = false;
export function allowLegacyMigration(value: boolean): void { migrating = value; }
function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? value as Record<string, unknown> : undefined;
}
export const encryptedStorage: Middleware<DBCore> = {
  stack: "dbcore", name: "patient-encryption", level: 0,
  create(down) {
    return { ...down, table(name) {
      const table = down.table(name);
      const indexFields = new Set<string>();
      for (const index of [table.schema.primaryKey, ...table.schema.indexes]) {
        for (const key of typeof index.keyPath === "string" ? [index.keyPath] : index.keyPath ?? []) indexFields.add(key);
      }
      const context = (row: Record<string, unknown>) => `${name}:${String(row[name === "meta" ? "key" : name === "gameDefinitions" ? "key" : "id"])}`;
      const decode = async (value: unknown): Promise<unknown> => {
        const row = record(value);
        if (!row || !sensitive(name, row)) return value;
        if (row.__sealed) return unseal(row.__sealed as Envelope, context(row));
        // Legacy plaintext is accessible only during an authenticated, atomic migration.
        return migrating && vaultOwner() ? row : undefined;
      };
      return { ...table,
        async mutate(req) {
          if (req.type !== "add" && req.type !== "put") return table.mutate(req);
          const values = await Dexie.waitFor(Promise.all(req.values.map(async (value: unknown) => {
            const row = record(value);
            if (!row || !sensitive(name, row)) return value;
            const indexed: Record<string, unknown> = {};
            for (const field of indexFields) if (field in row) indexed[field] = row[field];
            return { ...indexed, __sealed: await seal(row, context(row)) };
          })));
          return table.mutate({ ...req, values });
        },
        async get(req) { return Dexie.waitFor(decode(await table.get(req))); },
        async getMany(req) { return Dexie.waitFor(Promise.all((await table.getMany(req)).map(decode))); },
        async query(req) {
          const result = await table.query(req);
          if (!req.values) return result;
          return { result: (await Dexie.waitFor(Promise.all(result.result.map(decode)))).filter((x) => x !== undefined) };
        },
        async openCursor(req) {
          const cursor = await table.openCursor(req);
          if (!cursor || !req.values) return cursor;
          let value = await Dexie.waitFor(decode(cursor.value));
          const wrapped: DBCoreCursor = {
            get trans() { return cursor.trans; }, get key() { return cursor.key as unknown; },
            get primaryKey() { return cursor.primaryKey as unknown; }, get done() { return cursor.done; },
            get value() { return value; },
            continue: (key) => cursor.continue(key), continuePrimaryKey: (key, primary) => cursor.continuePrimaryKey(key, primary),
            advance: (count) => cursor.advance(count), stop: (result) => cursor.stop(result), fail: (error) => cursor.fail(error),
            async next() { await cursor.next(); value = await Dexie.waitFor(decode(cursor.value)); return wrapped; },
            start(onNext) {
              return cursor.start(() => {
                void Dexie.waitFor(decode(cursor.value)).then((decoded) => {
                  value = decoded;
                  if (value === undefined && !cursor.done) cursor.continue(); else onNext();
                }).catch((error: Error) => cursor.fail(error));
              });
            },
          };
          return wrapped;
        },
      };
    } };
  },
};
