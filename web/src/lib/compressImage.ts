export type CompressOptions = {
  maxEdge?: number;
  quality?: number;
};

const JPEG = "image/jpeg";
const SKIP_BYTES = 400 * 1024;

function jpgName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || "photo";
  return `${base}.jpg`;
}

export async function compressImageFile(file: File, options: CompressOptions = {}): Promise<File> {
  const maxEdge = options.maxEdge ?? 1200;
  const quality = options.quality ?? 0.7;
  if (file.type === "image/gif") return file;
  const alreadySmallJpeg =
    file.size <= SKIP_BYTES && (file.type === "image/jpeg" || file.type === "image/webp");
  if (alreadySmallJpeg) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SKIP_BYTES * 2) {
      bitmap.close();
      return file;
    }
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    let source: ImageBitmap = bitmap;
    if (scale < 1) {
      try {
        source = await createImageBitmap(bitmap, {
          resizeWidth: width,
          resizeHeight: height,
          resizeQuality: "low",
        });
        bitmap.close();
      } catch {
        source = bitmap;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      source.close();
      return file;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "low";
    ctx.drawImage(source, 0, 0, width, height);
    source.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, JPEG, quality));
    canvas.width = 0;
    canvas.height = 0;
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], jpgName(file.name || "photo.jpg"), { type: JPEG, lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function compressImageFiles(files: File[], options?: CompressOptions): Promise<File[]> {
  const concurrency = 4;
  const out: File[] = new Array(files.length);
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const done = await Promise.all(batch.map((file) => compressImageFile(file, options)));
    done.forEach((file, offset) => {
      out[i + offset] = file;
    });
  }
  return out;
}
