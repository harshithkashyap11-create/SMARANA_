import { beforeEach, expect, test, vi } from "vitest";
const state = vi.hoisted(() => ({
  meta: new Map<string, { key: string; value: string }>(),
  profiles: new Map<string, unknown>(),
}));
vi.mock("dexie", () => ({
  default: class {
    meta = {
      get: (key: string) => Promise.resolve(state.meta.get(key)),
      put: (row: { key: string; value: string }) => {
        state.meta.set(row.key, row);
        return Promise.resolve();
      },
      delete: (key: string) => {
        state.meta.delete(key);
        return Promise.resolve();
      },
    };
    profile = {
      get: (key: string) => Promise.resolve(state.profiles.get(key)),
    };
    version() {
      return {
        stores: () => {
          this.meta = {
            get: (key: string) => Promise.resolve(state.meta.get(key)),
            put: (row: { key: string; value: string }) => {
              state.meta.set(row.key, row);
              return Promise.resolve();
            },
            delete: (key: string) => {
              state.meta.delete(key);
              return Promise.resolve();
            },
          };
          this.profile = {
            get: (key: string) => Promise.resolve(state.profiles.get(key)),
          };
          return this;
        },
      };
    }
    use() { return this; }
    transaction(_mode: string, _table: unknown, run: () => Promise<void>) {
      return run();
    }
  },
}));
import {
  activeProfile,
  activatePatient,
  getMeta,
  setMeta,
  setSessionUser,
} from "./schema";
beforeEach(() => {
  state.meta.clear();
  state.profiles.clear();
  setSessionUser(null);
});
test("switching accounts isolates comfort settings and pull cursors", async () => {
  setSessionUser("user-a");
  await activatePatient("patient-a", "user-a");
  await setMeta("lastPullAt", "cursor-a");
  await setMeta("languageLocked", "1");
  state.profiles.set("patient-a", { id: "patient-a" });
  setSessionUser("user-b");
  await activatePatient("patient-b", "user-b");
  expect(await getMeta("lastPullAt")).toBeUndefined();
  expect(await getMeta("languageLocked")).toBeUndefined();
  expect(await activeProfile()).toBeUndefined();
  setSessionUser("user-a");
  await activatePatient("patient-a", "user-a");
  expect(await getMeta("lastPullAt")).toBe("cursor-a");
  expect((await activeProfile())?.id).toBe("patient-a");
  setSessionUser("user-b");
  expect(await activeProfile()).toBeUndefined();
});
test("legacy metadata is only adopted for the proven offline credential owner", async () => {
  state.meta.set("pinVerifier", {
    key: "pinVerifier",
    value: JSON.stringify({ user: { id: "user-a" } }),
  });
  state.meta.set("gamePatient", {
    key: "gamePatient",
    value: "old-private-data",
  });
  setSessionUser("user-b");
  await activatePatient("patient-b", "user-b");
  expect(await getMeta("gamePatient")).toBeUndefined();
});
