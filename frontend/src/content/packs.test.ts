import { afterEach, expect, it, vi } from "vitest";

const cache = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("../db/schema", () => ({ db: { contentPacks: cache } }));
import { defaultPack, loadPack, packFromRemote } from "./packs";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("keeps the regional pack when the network is unavailable", async () => {
  const pack = {
    ...defaultPack,
    dishes: [{ id: "local", title: "Regional dish", imageUrl: "" }],
  };
  cache.get.mockResolvedValue({ pack, version: "v1" });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  expect(await loadPack("ML", "en")).toBe(pack);
});

it("falls back per kind when a region has only dishes", () => {
  const pack = packFromRemote({
    version: "v1",
    items: {
      dish: [
        {
          id: "local",
          title: "Regional dish",
          image_url: null,
          audio_url: null,
          tags: {},
        },
      ],
    },
  });
  expect(pack.dishes[0]?.title).toBe("Regional dish");
  expect(pack.festivals).toBe(defaultPack.festivals);
});

it("uses region-specific activity steps rather than the default tea sequence", () => {
  const steps = ["Pack rice", "Pack fruit", "Carry basket"].map((title, index) => ({ id: String(index), title, imageUrl: `/step-${index}.svg` }));
  const pack = packFromRemote({version: "v2", items: {activity: [{id: "picnic", title: "Picnic", image_url: null, audio_url: null, tags: {steps}}]}});
  expect(pack.activities[0]?.steps).toEqual(steps);
});
