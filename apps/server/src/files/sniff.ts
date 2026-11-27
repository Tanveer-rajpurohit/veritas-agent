/**
 * Content checks for uploads. The extension says what a file claims to be;
 * these read the bytes to confirm it. Pure functions over buffers so they are
 * cheap to test and never touch the network.
 */

export const SNIFF_HEAD_BYTES = 8 * 1024;
/** Enough for the end-of-central-directory record plus a central directory of a few thousand parts. */
export const ZIP_TAIL_BYTES = 1024 * 1024;

export const ZIP_LIMITS = {
  maxEntries: 5_000,
  maxTotalUncompressed: 512 * 1024 * 1024,
  /** Real OOXML XML compresses roughly 5 to 20 times; bombs go to thousands. */
  maxRatio: 200,
  /** Ratios on tiny parts are noise; only judge parts larger than this. */
  ratioFloorBytes: 1024 * 1024,
} as const;

const OOXML_MAIN_PART: Record<string, string> = {
  docx: "word/document.xml",
  xlsx: "xl/workbook.xml",
  pptx: "ppt/presentation.xml",
};

const startsWith = (buf: Buffer, bytes: number[]) => buf.length >= bytes.length && bytes.every((b, i) => buf[i] === b);

function looksLikeText(head: Buffer): boolean {
  if (head.includes(0)) return false;
  try {
    // stream: true tolerates a multi-byte character cut off at the end of the sample.
    new TextDecoder("utf-8", { fatal: true }).decode(head, { stream: true });
    return true;
  } catch {
    return false;
  }
}

/** True when the first bytes match the format the extension claims. */
export function headMatches(ext: string, head: Buffer): boolean {
  switch (ext) {
    case "pdf":
      return head.subarray(0, 1024).includes("%PDF-");
    case "docx":
    case "xlsx":
    case "pptx":
      return startsWith(head, [0x50, 0x4b, 0x03, 0x04]);
    case "png":
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "jpg":
    case "jpeg":
      return startsWith(head, [0xff, 0xd8, 0xff]);
    case "csv":
    case "txt":
    case "md":
      return looksLikeText(head);
    default:
      return false;
  }
}

export type ZipVerdict = { ok: true } | { ok: false; reason: "not_zip" | "zip64" | "too_many_parts" | "too_large_unpacked" | "suspicious_ratio" | "wrong_format" };

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const EOCD_MIN_BYTES = 22;
const CENTRAL_HEADER_BYTES = 46;

/**
 * Reads only the zip central directory from the file's tail. It never
 * inflates anything, so a zip bomb costs the same memory as any other upload.
 * Declared sizes can lie; whatever later unpacks a part must still cap its output.
 */
export function inspectOoxml(ext: string, tail: Buffer, totalSize: number): ZipVerdict {
  const mainPart = OOXML_MAIN_PART[ext];
  if (!mainPart) return { ok: false, reason: "wrong_format" };

  let eocd = -1;
  for (let i = tail.length - EOCD_MIN_BYTES; i >= 0 && i >= tail.length - EOCD_MIN_BYTES - 0xffff; i--) {
    if (tail.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return { ok: false, reason: "not_zip" };

  const entryCount = tail.readUInt16LE(eocd + 10);
  const cdSize = tail.readUInt32LE(eocd + 12);
  const cdOffset = tail.readUInt32LE(eocd + 16);
  if (entryCount === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) return { ok: false, reason: "zip64" };
  if (entryCount > ZIP_LIMITS.maxEntries) return { ok: false, reason: "too_many_parts" };

  // Position of the central directory inside `tail`, which holds the last tail.length bytes of the file.
  const cdStart = cdOffset - (totalSize - tail.length);
  if (cdStart < 0 || cdStart + cdSize > eocd) return { ok: false, reason: cdStart < 0 ? "too_many_parts" : "not_zip" };

  let pos = cdStart;
  let totalUncompressed = 0;
  let hasContentTypes = false;
  let hasMainPart = false;
  for (let n = 0; n < entryCount; n++) {
    if (pos + CENTRAL_HEADER_BYTES > eocd || tail.readUInt32LE(pos) !== CENTRAL_HEADER_SIGNATURE) return { ok: false, reason: "not_zip" };
    const compressed = tail.readUInt32LE(pos + 20);
    const uncompressed = tail.readUInt32LE(pos + 24);
    const nameLength = tail.readUInt16LE(pos + 28);
    const extraLength = tail.readUInt16LE(pos + 30);
    const commentLength = tail.readUInt16LE(pos + 32);
    if (compressed === 0xffffffff || uncompressed === 0xffffffff) return { ok: false, reason: "zip64" };
    const name = tail.toString("utf8", pos + CENTRAL_HEADER_BYTES, pos + CENTRAL_HEADER_BYTES + nameLength);

    totalUncompressed += uncompressed;
    if (totalUncompressed > ZIP_LIMITS.maxTotalUncompressed) return { ok: false, reason: "too_large_unpacked" };
    if (uncompressed > ZIP_LIMITS.ratioFloorBytes && uncompressed > Math.max(compressed, 1) * ZIP_LIMITS.maxRatio) {
      return { ok: false, reason: "suspicious_ratio" };
    }
    if (name === "[Content_Types].xml") hasContentTypes = true;
    if (name === mainPart) hasMainPart = true;
    pos += CENTRAL_HEADER_BYTES + nameLength + extraLength + commentLength;
  }

  return hasContentTypes && hasMainPart ? { ok: true } : { ok: false, reason: "wrong_format" };
}
