type NormalizeOptions = {
  maxDimension?: number; // px
  jpegQuality?: number; // 0..1
};

const DEFAULTS: Required<NormalizeOptions> = {
  maxDimension: 1600,
  jpegQuality: 0.85,
};

export async function fileToDataUrl(file: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function isLikelyUnsupportedMime(mime: string) {
  // The AI gateway + many browsers are inconsistent with HEIC/HEIF.
  // We normalize EVERYTHING except jpeg/png/webp to JPEG.
  const m = (mime || "").toLowerCase();
  return !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(m);
}

async function decodeToBitmap(file: File): Promise<ImageBitmap> {
  // Prefer createImageBitmap when available.
  if ("createImageBitmap" in window) {
    return await createImageBitmap(file);
  }

  // Fallback: HTMLImageElement decode
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, 0, 0);
    const bitmap = await createImageBitmap(canvas);
    canvas.width = 0;
    canvas.height = 0;
    return bitmap;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function computeTargetSize(w: number, h: number, maxDimension: number) {
  if (w <= maxDimension && h <= maxDimension) return { w, h };
  const scale = Math.min(maxDimension / w, maxDimension / h);
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

async function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  quality: number,
  nameHint: string,
): Promise<File> {
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode JPEG"))),
      "image/jpeg",
      quality,
    );
  });
  const safeName = (nameHint || "receipt").replace(/\.[^/.]+$/, "");
  return new File([blob], `${safeName}.jpg`, { type: "image/jpeg" });
}

export async function normalizeReceiptImage(
  file: File,
  opts: NormalizeOptions = {},
): Promise<{ normalizedFile: File; dataUrl: string; wasConverted: boolean }>
{
  const { maxDimension, jpegQuality } = { ...DEFAULTS, ...opts };
  const shouldConvert = isLikelyUnsupportedMime(file.type) || file.type.toLowerCase() === "image/heic" || file.type.toLowerCase() === "image/heif";

  // Always downscale/convert when mime is unknown/unsupported.
  if (shouldConvert) {
    const bitmap = await decodeToBitmap(file);
    const { w, h } = computeTargetSize(bitmap.width, bitmap.height, maxDimension);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const normalizedFile = await canvasToJpegFile(canvas, jpegQuality, file.name);
    const dataUrl = await fileToDataUrl(normalizedFile);
    return { normalizedFile, dataUrl, wasConverted: true };
  }

  // For supported mimes, still downscale large images for stability.
  const bitmap = await decodeToBitmap(file);
  const { w, h } = computeTargetSize(bitmap.width, bitmap.height, maxDimension);
  const needsResize = w !== bitmap.width || h !== bitmap.height;

  if (!needsResize) {
    bitmap.close();
    const dataUrl = await fileToDataUrl(file);
    return { normalizedFile: file, dataUrl, wasConverted: false };
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  // If original was PNG/WEBP, converting to JPEG is ok for receipts and improves OCR consistency.
  const normalizedFile = await canvasToJpegFile(canvas, jpegQuality, file.name);
  const dataUrl = await fileToDataUrl(normalizedFile);
  return { normalizedFile, dataUrl, wasConverted: true };
}
