import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { CUSTOM_EVENT_LOGO_MAX_BYTES } from "../shared/custom-events.js";
import { pngCrc32, validateCustomEventLogoData } from "./custom-event-logo.js";

function chunk(type: string, data: Buffer) {
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0); result.write(type, 4, "ascii"); data.copy(result, 8);
  result.writeUInt32BE(pngCrc32(result.subarray(4, result.length - 4)), result.length - 4);
  return result;
}
function fixture(options: { width?: number; height?: number; depth?: number; color?: number; interlace?: number; rows?: Buffer; before?: Buffer[]; after?: Buffer[]; compressed?: Buffer } = {}) {
  const header = Buffer.alloc(13); header.writeUInt32BE(options.width ?? 1, 0); header.writeUInt32BE(options.height ?? 1, 4);
  header[8] = options.depth ?? 8; header[9] = options.color ?? 6; header[12] = options.interlace ?? 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), ...(options.before ?? []),
    chunk("IDAT", options.compressed ?? deflateSync(options.rows ?? Buffer.from([0, 255, 0, 0, 0]))), ...(options.after ?? []), chunk("IEND", Buffer.alloc(0))]);
}
const url = (bytes: Buffer) => `data:image/png;base64,${bytes.toString("base64")}`;

test("PNG validation preserves transparent/opaque pixels, palette transparency, split data and Adam7 passes", () => {
  assert.equal(pngCrc32(Buffer.from("123456789")), 0xcbf43926, "Standard CRC32 reference vector");
  const transparent = fixture(), opaque = fixture({ rows: Buffer.from([0, 255, 0, 0, 255]) });
  for (const png of [transparent, opaque]) assert.equal(validateCustomEventLogoData(url(png)), url(png));
  const indexed = fixture({ color: 3, depth: 1, rows: Buffer.from([0, 0]), before: [chunk("PLTE", Buffer.from([255, 0, 0, 0, 0, 255])), chunk("tRNS", Buffer.from([0, 255]))] });
  assert.equal(validateCustomEventLogoData(url(indexed)), url(indexed));
  const adam7 = fixture({ interlace: 1 }); // A 1x1 image uses only Adam7's first pass.
  assert.equal(validateCustomEventLogoData(url(adam7)), url(adam7));
  const compressed = deflateSync(Buffer.from([0, 1, 2, 3, 0]));
  const one = fixture({ compressed: compressed.subarray(0, 4), after: [chunk("IDAT", compressed.subarray(4))] });
  assert.equal(validateCustomEventLogoData(url(one)), url(one));
});

test("PNG validation rejects fake MIME types, malformed chunks, bad CRCs, invalid filters and compressed bombs", () => {
  const valid = fixture(), corrupted = Buffer.from(valid); corrupted[corrupted.length - 1] ^= 1;
  const signaturesOnly = Buffer.concat([valid.subarray(0, 8), Buffer.from("<svg><script>bad</script></svg>")]);
  const invalid: Buffer[] = [
    corrupted, signaturesOnly, valid.subarray(0, valid.length - 1), Buffer.concat([valid, Buffer.from("trailing")]),
    fixture({ rows: Buffer.from([5, 1, 2, 3, 4]) }), fixture({ rows: Buffer.alloc(50_000) }),
    fixture({ rows: Buffer.from([0, 1]) }), fixture({ compressed: Buffer.from("not zlib") }),
    fixture({ width: 0 }), fixture({ width: 4097 }), fixture({ width: 4096, height: 4096 }), fixture({ depth: 1, color: 6 }),
    fixture({ before: [chunk("IHDR", valid.subarray(16, 29))] }), fixture({ before: [chunk("EVIL", Buffer.from("critical"))] }),
    fixture({ before: [chunk("acTL", Buffer.alloc(8))] }), fixture({ color: 3, depth: 1, rows: Buffer.from([0, 0]) }),
    fixture({ color: 3, depth: 1, rows: Buffer.from([0, 128]), before: [chunk("PLTE", Buffer.from([255, 0, 0]))] }),
    fixture({ before: [chunk("tRNS", Buffer.from([0]))] }),
    fixture({ color: 3, depth: 1, rows: Buffer.from([0, 0]), before: [chunk("PLTE", Buffer.from([0, 0, 0])), chunk("tRNS", Buffer.from([0, 255]))] }),
    fixture({ after: [chunk("tEXt", Buffer.from("Note\0hello")), chunk("IDAT", Buffer.alloc(0))] }),
  ];
  for (const [i, png] of invalid.entries()) assert.throws(() => validateCustomEventLogoData(url(png)), /Logo-ul/, `Invalid PNG ${i}`);
  for (const data of ["data:image/svg+xml;base64," + valid.toString("base64"), "data:image/png;base64," + Buffer.from("<svg/>").toString("base64"), url(valid).replace(/.$/, " "), "https://example.com/logo.png"])
    assert.throws(() => validateCustomEventLogoData(data), /Logo-ul/);
  const tooLarge = fixture({ before: [chunk("tEXt", Buffer.alloc(CUSTOM_EVENT_LOGO_MAX_BYTES, 120))] });
  assert.throws(() => validateCustomEventLogoData(url(tooLarge)), /maximum 1 MB/);
});

test("palette scanline filters are decoded before validating palette indexes", () => {
  // With one palette entry, an Up-filtered second row containing 1 is invalid.
  const png = fixture({ width: 1, height: 2, depth: 8, color: 3, rows: Buffer.from([0, 0, 2, 1]), before: [chunk("PLTE", Buffer.from([0, 0, 0]))] });
  assert.throws(() => validateCustomEventLogoData(url(png)), /Logo-ul/);
  const valid = fixture({ width: 1, height: 2, depth: 8, color: 3, rows: Buffer.from([0, 0, 4, 0]), before: [chunk("PLTE", Buffer.from([0, 0, 0]))] });
  assert.equal(validateCustomEventLogoData(url(valid)), url(valid));
});
