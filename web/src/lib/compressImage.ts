export type CompressOptions = {
  maxEdge?: number;
  quality?: number;
};

const JPEG = "image/jpeg";

function jpgName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || "photo";
  return `${base}.jpg`;
}

export async function compressImageFile(file: File, options: CompressOptions = {}): Promise<File> {
  const maxEdge = options.maxEdge ?? 1600;
  const quality = options.quality ?? 0.8;
  if (file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, JPEG, quality));
    if (!blob) return file;
    const maxBytes = 4.5 * 1024 * 1024;
    let output = blob;
    if (output.size > maxBytes) {
      const tighter = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, JPEG, 0.65));
      if (tighter && tighter.size < output.size) output = tighter;
    }
    if (output.size >= file.size && scale === 1) return file;
    return new File([output], jpgName(file.name || "photo.jpg"), { type: JPEG, lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function compressImageFiles(files: File[], options?: CompressOptions): Promise<File[]> {
  const out: File[] = [];
  const concurrency = 3;
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    out.push(...(await Promise.all(batch.map((file) => compressImageFile(file, options)))));
  }
  return out;
}
