import imageCompression from "browser-image-compression";

export async function compressMemoryPhotos(files: File[]): Promise<File[]> {
  return Promise.all(
    files.map((file) =>
      imageCompression(file, {
        maxWidthOrHeight: 1600,
        maxSizeMB: 8,
        useWebWorker: true,
        fileType: file.type,
      }),
    ),
  );
}
