import { expect, test, vi } from "vitest";

const compress = vi.hoisted(() => vi.fn((file: File) => Promise.resolve(file)));
vi.mock("browser-image-compression", () => ({ default: compress }));
import { compressMemoryPhotos } from "./compression";

test("compresses every selected image to at most 1600px", async () => {
  const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
  await compressMemoryPhotos([file]);
  expect(compress).toHaveBeenCalledWith(
    file,
    expect.objectContaining({ maxWidthOrHeight: 1600, maxSizeMB: 8 }),
  );
});
