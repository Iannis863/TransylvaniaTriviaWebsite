import {
  CUSTOM_EVENT_LOGO_MAX_BYTES, CUSTOM_EVENT_LOGO_SOURCE_MAX_BYTES,
  CUSTOM_EVENT_LOGO_SOURCE_MAX_DIMENSION, CUSTOM_EVENT_LOGO_SOURCE_MAX_PIXELS,
  CUSTOM_EVENT_LOGO_TARGET_SIZE,
} from "@shared/custom-events";

export interface PreparedCustomEventLogo {
  dataUrl: string;
  sourceWidth: number;
  sourceHeight: number;
  size: number;
  trimmed: boolean;
}
interface ImageSource {
  image: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  release: () => void;
}
interface Bounds { x: number; y: number; width: number; height: number }

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const ART_FRACTION = 0.88;
const STRIP_HEIGHT = 128;
const INVALID_PNG = "Alege o imagine PNG validă.";
const TOO_LARGE = "Imaginea este prea mare pentru a fi pregătită. Alege un PNG mai mic.";
const PROCESSING_FAILED = "Logoul nu a putut fi pregătit. Încearcă un alt PNG.";
const EMPTY_LOGO = "Logoul nu conține elemente vizibile.";

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Logo processing cancelled", "AbortError");
}
function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 1; canvas.height = 1;
}
function context(canvas: HTMLCanvasElement, readFrequently = false): CanvasRenderingContext2D {
  const result = canvas.getContext("2d", { willReadFrequently: readFrequently });
  if (!result) throw new Error(PROCESSING_FAILED);
  result.imageSmoothingEnabled = true;
  result.imageSmoothingQuality = "high";
  return result;
}

async function preflight(file: File, signal?: AbortSignal) {
  checkAbort(signal);
  if (file.size > CUSTOM_EVENT_LOGO_SOURCE_MAX_BYTES) throw new Error(TOO_LARGE);
  const bytes = new Uint8Array(await file.slice(0, 33).arrayBuffer());
  checkAbort(signal);
  if (bytes.length < 33 || !PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) throw new Error(INVALID_PNG);
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (header.getUint32(8) !== 13 || String.fromCharCode(...Array.from(bytes.subarray(12, 16))) !== "IHDR") throw new Error(INVALID_PNG);
  const width = header.getUint32(16), height = header.getUint32(20);
  if (!width || !height) throw new Error(INVALID_PNG);
  if (width > CUSTOM_EVENT_LOGO_SOURCE_MAX_DIMENSION || height > CUSTOM_EVENT_LOGO_SOURCE_MAX_DIMENSION || width * height > CUSTOM_EVENT_LOGO_SOURCE_MAX_PIXELS) throw new Error(TOO_LARGE);
}

async function decodeSource(file: File, signal?: AbortSignal): Promise<ImageSource> {
  const png = new Blob([file], { type: "image/png" });
  if (typeof createImageBitmap === "function") {
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(png);
      checkAbort(signal);
      return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap!.close() };
    } catch {
      bitmap?.close(); checkAbort(signal);
      // Some browsers cannot decode a PNG variant through ImageBitmap but support it in <img>.
    }
  }
  checkAbort(signal);
  const url = URL.createObjectURL(png);
  const image = new Image();
  image.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      const clean = () => { image.onload = null; image.onerror = null; signal?.removeEventListener("abort", abort); };
      const abort = () => { clean(); image.src = ""; reject(new DOMException("Logo processing cancelled", "AbortError")); };
      image.onload = () => { clean(); resolve(); };
      image.onerror = () => { clean(); reject(new Error(INVALID_PNG)); };
      signal?.addEventListener("abort", abort, { once: true });
      image.src = url;
    });
    checkAbort(signal);
    return { image, width: image.naturalWidth, height: image.naturalHeight, release: () => { image.src = ""; URL.revokeObjectURL(url); } };
  } catch (error) { image.src = ""; URL.revokeObjectURL(url); throw error; }
}

async function visibleBounds(source: ImageSource, signal?: AbortSignal): Promise<Bounds> {
  const canvas = document.createElement("canvas");
  canvas.width = source.width; canvas.height = Math.min(STRIP_HEIGHT, source.height);
  let minX = source.width, minY = source.height, maxX = -1, maxY = -1;
  try {
    const ctx = context(canvas, true);
    for (let y = 0; y < source.height; y += STRIP_HEIGHT) {
      checkAbort(signal);
      const height = Math.min(STRIP_HEIGHT, source.height - y);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(source.image, 0, y, source.width, height, 0, 0, source.width, height);
      const pixels = ctx.getImageData(0, 0, source.width, height).data;
      for (let row = 0; row < height; row++) {
        const rowStart = row * source.width * 4;
        for (let x = 0; x < source.width; x++) {
          // Keep even faint shadows and every opaque white/colored pixel.
          if (pixels[rowStart + x * 4 + 3] === 0) continue;
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y + row); maxY = Math.max(maxY, y + row);
        }
      }
      // Let cancellation, progress text, and browser interactions run between strips.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    checkAbort(signal);
    if (maxX < 0) throw new Error(EMPTY_LOGO);
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  } finally { releaseCanvas(canvas); }
}

async function drawLogo(source: ImageSource, bounds: Bounds, canvas: HTMLCanvasElement, signal?: AbortSignal) {
  const ctx = context(canvas);
  const available = Math.max(1, Math.floor(canvas.width * ART_FRACTION));
  const scale = Math.min(1, available / Math.max(bounds.width, bounds.height));
  const width = Math.max(1, Math.round(bounds.width * scale)), height = Math.max(1, Math.round(bounds.height * scale));
  const x = Math.floor((canvas.width - width) / 2), y = Math.floor((canvas.height - height) / 2);
  if (typeof createImageBitmap === "function") {
    let resized: ImageBitmap | undefined;
    try {
      resized = await createImageBitmap(source.image, bounds.x, bounds.y, bounds.width, bounds.height, {
        resizeWidth: width, resizeHeight: height, resizeQuality: "high",
      });
      checkAbort(signal);
      ctx.drawImage(resized, x, y);
      return;
    } catch { checkAbort(signal); }
    finally { resized?.close(); }
  }
  checkAbort(signal);
  ctx.drawImage(source.image, bounds.x, bounds.y, bounds.width, bounds.height, x, y, width, height);
}

function encodePNG(canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<Blob> {
  checkAbort(signal);
  return new Promise((resolve, reject) => {
    let settled = false;
    const clean = () => { settled = true; signal?.removeEventListener("abort", abort); };
    const abort = () => { clean(); reject(new DOMException("Logo processing cancelled", "AbortError")); };
    signal?.addEventListener("abort", abort, { once: true });
    try {
      // PNG ignores the quality argument; reducing dimensions keeps alpha and colors.
      canvas.toBlob(blob => {
        if (settled) return;
        clean();
        if (blob?.type === "image/png") resolve(blob); else reject(new Error(PROCESSING_FAILED));
      }, "image/png");
    } catch { clean(); reject(new Error(PROCESSING_FAILED)); }
  });
}

function dataURL(blob: Blob, signal?: AbortSignal): Promise<string> {
  checkAbort(signal);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const clean = () => { signal?.removeEventListener("abort", abort); reader.onload = null; reader.onerror = null; reader.onabort = null; };
    const abort = () => { clean(); if (reader.readyState === FileReader.LOADING) reader.abort(); reject(new DOMException("Logo processing cancelled", "AbortError")); };
    reader.onload = () => {
      const result = reader.result;
      clean();
      if (typeof result === "string" && result.startsWith("data:image/png;base64,")) resolve(result); else reject(new Error(PROCESSING_FAILED));
    };
    reader.onerror = () => { clean(); reject(new Error(PROCESSING_FAILED)); };
    reader.onabort = abort;
    signal?.addEventListener("abort", abort, { once: true });
    reader.readAsDataURL(blob);
  });
}

/** Prepare the exact lossless PNG shown in the preview and saved to the event. */
export async function prepareCustomEventLogo(file: File, options: { signal?: AbortSignal } = {}): Promise<PreparedCustomEventLogo> {
  const { signal } = options;
  let source: ImageSource | undefined;
  let originalCanvas: HTMLCanvasElement | undefined;
  let resizedCanvas: HTMLCanvasElement | undefined;
  try {
    await preflight(file, signal);
    source = await decodeSource(file, signal);
    checkAbort(signal);
    if (!source.width || !source.height || source.width > CUSTOM_EVENT_LOGO_SOURCE_MAX_DIMENSION || source.height > CUSTOM_EVENT_LOGO_SOURCE_MAX_DIMENSION || source.width * source.height > CUSTOM_EVENT_LOGO_SOURCE_MAX_PIXELS) throw new Error(TOO_LARGE);
    const sourceWidth = source.width, sourceHeight = source.height;
    const bounds = await visibleBounds(source, signal);
    let size = Math.min(CUSTOM_EVENT_LOGO_TARGET_SIZE, Math.ceil(Math.max(bounds.width, bounds.height) / ART_FRACTION));
    originalCanvas = document.createElement("canvas"); originalCanvas.width = size; originalCanvas.height = size;
    await drawLogo(source, bounds, originalCanvas, signal);
    source.release(); source = undefined;
    const minimumSize = Math.min(size, 512);
    let encoded = await encodePNG(originalCanvas, signal);
    while (encoded.size > CUSTOM_EVENT_LOGO_MAX_BYTES && size > minimumSize) {
      checkAbort(signal);
      size = Math.max(minimumSize, Math.floor(size * 0.8));
      if (resizedCanvas) releaseCanvas(resizedCanvas);
      resizedCanvas = document.createElement("canvas"); resizedCanvas.width = size; resizedCanvas.height = size;
      context(resizedCanvas).drawImage(originalCanvas, 0, 0, size, size);
      encoded = await encodePNG(resizedCanvas, signal);
    }
    checkAbort(signal);
    if (encoded.size > CUSTOM_EVENT_LOGO_MAX_BYTES) throw new Error(PROCESSING_FAILED);
    const result = await dataURL(encoded, signal);
    checkAbort(signal);
    return { dataUrl: result, sourceWidth, sourceHeight, size,
      trimmed: bounds.x !== 0 || bounds.y !== 0 || bounds.width !== sourceWidth || bounds.height !== sourceHeight };
  } catch (error) {
    checkAbort(signal);
    if (error instanceof Error && [INVALID_PNG, TOO_LARGE, PROCESSING_FAILED, EMPTY_LOGO].includes(error.message)) throw error;
    throw new Error(PROCESSING_FAILED);
  } finally {
    source?.release();
    if (originalCanvas) releaseCanvas(originalCanvas);
    if (resizedCanvas) releaseCanvas(resizedCanvas);
  }
}
