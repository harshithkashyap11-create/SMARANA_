import imageCompression from "browser-image-compression";

export async function compressMemoryPhotos(files: File[]): Promise<File[]> {
  return Promise.all(
    files.map(async (file) => {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1600,
        maxSizeMB: 8,
        useWebWorker: true,
        fileType: file.type,
      });
      // Canvas/worker compression can return a Blob without a filename.
      // Django validates image extensions as well as the actual image bytes.
      return new File([compressed], file.name, {
        type: compressed.type || file.type,
        lastModified: file.lastModified,
      });
    }),
  );
}
