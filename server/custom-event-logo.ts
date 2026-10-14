import { inflateSync } from "node:zlib";
import { CUSTOM_EVENT_LOGO_MAX_BYTES } from "../shared/custom-events.js";

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_DIMENSION = 4096;
const MAX_PIXELS = 4 * 1024 * 1024;
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let value = n;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crcTable[n] = value >>> 0;
}
export function pngCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export class CustomEventLogoError extends Error {
  constructor(message = "Logo-ul trebuie să fie o imagine PNG validă.") { super(message); }
}
const fail = (): never => { throw new CustomEventLogoError(); };
const passes = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];

// PNG structure, critical chunks, CRCs, pixel bounds, and the compressed scanline
// stream are checked against https://www.w3.org/TR/png-3/ before persisting bytes.
// Existing alpha/tRNS data is preserved verbatim; transparency is optional.
export function validateCustomEventLogoData(dataUrl: string): string {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) fail();
  const bytes = Buffer.from(match![1], "base64");
  if (bytes.length > CUSTOM_EVENT_LOGO_MAX_BYTES) throw new CustomEventLogoError("Logo-ul PNG trebuie să aibă maximum 1 MB.");
  if (bytes.toString("base64") !== match![1] || bytes.length < 57 || !bytes.subarray(0, 8).equals(signature)) fail();
  let width = 0, height = 0, depth = 0, color = 0, channels = 0, interlace = 0;
  let offset = 8, chunks = 0, paletteEntries = 0, transparency = false, ended = false, idatClosed = false;
  const compressed: Buffer[] = [];
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length || ++chunks > 4096) fail();
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) fail();
    const type = bytes.toString("latin1", offset + 4, offset + 8);
    if (!/^[A-Za-z]{4}$/.test(type) || type[2] !== type[2].toUpperCase()) fail();
    if (pngCrc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) fail();
    const data = bytes.subarray(offset + 8, end - 4);
    if (chunks === 1 && type !== "IHDR") fail();
    if (compressed.length && type !== "IDAT") idatClosed = true;
    if (type === "IHDR") {
      if (chunks !== 1 || length !== 13) fail();
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      depth = data[8]; color = data[9]; interlace = data[12];
      const depths: Record<number, number[]> = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
      channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[color];
      if (!depths[color]?.includes(depth) || data[10] !== 0 || data[11] !== 0 || interlace > 1) fail();
      if (!width || !height || width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) throw new CustomEventLogoError("Logo-ul PNG trebuie să aibă maximum 4096 px pe latură și maximum 4 megapixeli.");
    } else if (type === "PLTE") {
      if (paletteEntries || compressed.length || transparency || color === 0 || color === 4 || !length || length % 3 || length > 768) fail();
      paletteEntries = length / 3;
      if (color === 3 && paletteEntries > 2 ** depth) fail();
    } else if (type === "tRNS") {
      if (transparency || compressed.length || color === 4 || color === 6) fail();
      if (color === 3 && (!paletteEntries || !length || length > paletteEntries)) fail();
      if (color === 0 && (length !== 2 || data.readUInt16BE(0) >= 2 ** depth)) fail();
      if (color === 2 && (length !== 6 || [0, 2, 4].some(index => data.readUInt16BE(index) >= 2 ** depth))) fail();
      transparency = true;
    } else if (type === "IDAT") {
      if (idatClosed || (color === 3 && !paletteEntries)) fail();
      compressed.push(data);
    } else if (type === "IEND") {
      if (length || !compressed.length || end !== bytes.length) fail();
      ended = true;
    } else if (["acTL", "fcTL", "fdAT"].includes(type) || type[0] === type[0].toUpperCase()) {
      fail(); // The uploaded logo is a static PNG with recognized critical chunks.
    }
    offset = end;
  }
  if (!ended) fail();
  const scanlines = (interlace ? passes : [[0, 0, 1, 1]]).map(([x, y, dx, dy]) => ({
    width: Math.max(0, Math.ceil((width - x) / dx)), height: Math.max(0, Math.ceil((height - y) / dy)),
  })).filter(pass => pass.width && pass.height).map(pass => ({ ...pass, rowBytes: Math.ceil(pass.width * channels * depth / 8) }));
  const expectedLength = scanlines.reduce((total, pass) => total + pass.height * (pass.rowBytes + 1), 0);
  let inflated: Buffer;
  try { inflated = inflateSync(Buffer.concat(compressed), { maxOutputLength: expectedLength + 1 }); }
  catch { return fail(); }
  if (inflated.length !== expectedLength) fail();
  let cursor = 0;
  for (const pass of scanlines) {
    let previous = Buffer.alloc(pass.rowBytes);
    for (let row = 0; row < pass.height; row++) {
      const filter = inflated[cursor++];
      if (filter > 4) fail();
      if (color === 3) {
        const current = Buffer.from(inflated.subarray(cursor, cursor + pass.rowBytes));
        for (let i = 0; i < current.length; i++) {
          const left = i ? current[i - 1] : 0, up = previous[i], upperLeft = i ? previous[i - 1] : 0;
          const estimate = left + up - upperLeft;
          const a = Math.abs(estimate - left), b = Math.abs(estimate - up), c = Math.abs(estimate - upperLeft);
          const predictor = filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : filter === 4 ? (a <= b && a <= c ? left : b <= c ? up : upperLeft) : 0;
          current[i] = (current[i] + predictor) & 255;
        }
        for (let pixel = 0; pixel < pass.width; pixel++) {
          const bit = pixel * depth;
          if (((current[Math.floor(bit / 8)] >>> (8 - depth - bit % 8)) & ((1 << depth) - 1)) >= paletteEntries) fail();
        }
        previous = current;
      }
      cursor += pass.rowBytes;
    }
  }
  return `data:image/png;base64,${bytes.toString("base64")}`;
}
