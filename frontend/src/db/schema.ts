import Dexie, { type EntityTable } from "dexie";

export interface MetaEntry {
  key: string;
  value: string;
}

class SmaranaDatabase extends Dexie {
  meta!: EntityTable<MetaEntry, "key">;

  constructor() {
    super("smarana");
    this.version(1).stores({ meta: "&key" });
  }
}

export const db = new SmaranaDatabase();

export async function getMeta(key: string): Promise<string | undefined> {
  return (await db.meta.get(key))?.value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}
