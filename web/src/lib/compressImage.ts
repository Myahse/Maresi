export type CompressOptions = {
  maxEdge?: number;
  quality?: number;
};

const JPEG = "image/jpeg";
const SKIP_BYTES = 280 * 1024;

function jpgName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || "photo";
  return `${base}.jpg`;
}

function jpegSize(view: DataView): { width: number; height: number } | null {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 8 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0x00 || marker === 0xff) {
      offset += 1;
      continue;
    }
    const len = view.getUint16(offset + 2);
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
    }
    if (len < 2) return null;
    offset += 2 + len;
  }
  return null;
}

function pngSize(view: DataView): { width: number; height: number } | null {
  if (view.byteLength < 24 || view.getUint32(0) !== 0x89504e47) return null;
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function webpSize(view: DataView): { width: number; height: number } | null {
  if (view.byteLength < 30) return null;
  const tag = String.fromCharCode(
    view.getUint8(12),
    view.getUint8(13),
    view.getUint8(14),
    view.getUint8(15)
  );
  if (tag === "VP8X") {
    const width = 1 + (view.getUint8(24) | (view.getUint8(25) << 8) | (view.getUint8(26) << 16));
    const height = 1 + (view.getUint8(27) | (view.getUint8(28) << 8) | (view.getUint8(29) << 16));
    return { width, height };
  }
  if (tag === "VP8 ") {
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }
  if (tag === "VP8L") {
    const bits = view.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function probeSize(buffer: ArrayBuffer, type: string): { width: number; height: number } | null {
  const view = new DataView(buffer);
  if (type === "image/png") return pngSize(view);
  if (type === "image/webp") return webpSize(view);
  return jpegSize(view) ?? pngSize(view) ?? webpSize(view);
}

function targetSize(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number; scale: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

async function bitmapFromFile(
  file: File,
  maxEdge: number
): Promise<{ bitmap: ImageBitmap; scale: number }> {
  const header = await file.slice(0, 96 * 1024).arrayBuffer();
  const probed = probeSize(header, file.type);
  const bitmapOptions = { imageOrientation: "from-image" } as ImageBitmapOptions;

  if (probed) {
    const next = targetSize(probed.width, probed.height, maxEdge);
    // One edge only: width+height plus EXIF rotation can squash the image.
    const resize =
      next.scale < 1
        ? probed.width >= probed.height
          ? { resizeWidth: next.width, resizeQuality: "low" as const }
          : { resizeHeight: next.height, resizeQuality: "low" as const }
        : {};
    const bitmap = await createImageBitmap(file, {
      ...bitmapOptions,
      ...resize,
    });
    return { bitmap, scale: next.scale };
  }

  const bitmap = await createImageBitmap(file, {
    ...bitmapOptions,
    resizeWidth: maxEdge,
    resizeQuality: "low",
  });
  return { bitmap, scale: Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height)) };
}

async function downscaleBitmap(bitmap: ImageBitmap, maxEdge: number): Promise<ImageBitmap> {
  const next = targetSize(bitmap.width, bitmap.height, maxEdge);
  if (next.scale >= 1) return bitmap;
  try {
    const smaller = await createImageBitmap(bitmap, {
      resizeWidth: next.width,
      resizeHeight: next.height,
      resizeQuality: "low",
    });
    bitmap.close();
    return smaller;
  } catch {
    return bitmap;
  }
}

async function encodeJpeg(source: ImageBitmap, quality: number): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(source.width, source.height);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "low";
    ctx.drawImage(source, 0, 0);
    return canvas.convertToBlob({ type: JPEG, quality });
  }
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "low";
  ctx.drawImage(source, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, JPEG, quality));
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}

export async function compressImageFile(file: File, options: CompressOptions = {}): Promise<File> {
  const maxEdge = options.maxEdge ?? 1080;
  const quality = options.quality ?? 0.68;
  if (file.type === "image/gif") return file;
  const alreadySmallJpeg =
    file.size <= SKIP_BYTES && (file.type === "image/jpeg" || file.type === "image/webp");
  if (alreadySmallJpeg) return file;

  try {
    const loaded = await bitmapFromFile(file, maxEdge);
    const bitmap = await downscaleBitmap(loaded.bitmap, maxEdge);
    if (Math.max(bitmap.width, bitmap.height) <= maxEdge && file.size <= SKIP_BYTES * 2 && loaded.scale === 1) {
      bitmap.close();
      return file;
    }
    const blob = await encodeJpeg(bitmap, quality);
    bitmap.close();
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], jpgName(file.name || "photo.jpg"), { type: JPEG, lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function compressImageFiles(files: File[], options?: CompressOptions): Promise<File[]> {
  const concurrency = 2;
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
