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

test("retains a valid upload filename when a compression worker returns a Blob", async () => {
  compress.mockResolvedValueOnce(
    new Blob(["compressed"], { type: "image/png" }) as File,
  );
  const original = new File(["original"], "family.png", { type: "image/png" });
  const [result] = await compressMemoryPhotos([original]);
  expect(result).toBeInstanceOf(File);
  expect(result?.name).toBe("family.png");
  expect(result?.type).toBe("image/png");
  expect(result?.size).toBe(10);
});
