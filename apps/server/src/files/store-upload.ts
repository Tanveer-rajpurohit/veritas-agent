import { createHash } from "node:crypto";
import { once } from "node:events";
import { PassThrough, type Readable } from "node:stream";
import type { Client as BlobClient } from "minio";
import { headMatches, inspectOoxml, SNIFF_HEAD_BYTES, ZIP_TAIL_BYTES } from "./sniff";

export type UploadFailure = "too_large" | "empty" | "invalid_content" | "unsafe_archive" | "aborted" | "storage_unavailable";

export type StoreResult = { ok: true; sizeBytes: number; sha256: string } | { ok: false; failure: UploadFailure };

type Blob = Pick<BlobClient, "putObject" | "removeObject" | "removeIncompleteUpload">;

const OOXML = new Set(["docx", "xlsx", "pptx"]);

/** Hashes, counts and sniffs bytes as they pass, keeping only the head and (for OOXML) the tail in memory. */
export function createInspector(ext: string, maxBytes: number) {
  const hash = createHash("sha256");
  let size = 0;
  let head: Buffer[] = [];
  let headLength = 0;
  let isHeadChecked = false;
  const tail: Buffer[] = [];
  let tailLength = 0;
  const keepsTail = OOXML.has(ext);

  const checkHead = () => {
    isHeadChecked = true;
    const sample = Buffer.concat(head).subarray(0, SNIFF_HEAD_BYTES);
    head = [];
    return headMatches(ext, sample);
  };

  return {
    push(chunk: Buffer): UploadFailure | null {
      size += chunk.length;
      if (size > maxBytes) return "too_large";
      hash.update(chunk);
      if (!isHeadChecked) {
        head.push(chunk);
        headLength += chunk.length;
        if (headLength >= SNIFF_HEAD_BYTES && !checkHead()) return "invalid_content";
      }
      if (keepsTail) {
        tail.push(chunk);
        tailLength += chunk.length;
        while (tail.length > 1 && tailLength - tail[0]!.length >= ZIP_TAIL_BYTES) tailLength -= tail.shift()!.length;
      }
      return null;
    },
    finish(): StoreResult {
      if (size === 0) return { ok: false, failure: "empty" };
      if (!isHeadChecked && !checkHead()) return { ok: false, failure: "invalid_content" };
      if (keepsTail) {
        const buf = Buffer.concat(tail);
        const verdict = inspectOoxml(ext, buf.subarray(Math.max(0, buf.length - ZIP_TAIL_BYTES)), size);
        if (!verdict.ok) return { ok: false, failure: verdict.reason === "wrong_format" || verdict.reason === "not_zip" ? "invalid_content" : "unsafe_archive" };
      }
      return { ok: true, sizeBytes: size, sha256: hash.digest("hex") };
    },
  };
}

type StoreOptions = {
  blob: Blob;
  bucket: string;
  key: string;
  source: Readable;
  ext: string;
  mime: string;
  maxBytes: number;
  /** Declared Content-Length; lets small uploads skip multipart. */
  sizeHint: number | undefined;
  onCleanupError: (err: unknown) => void;
};

/**
 * Streams the request body into the blob store while checking it. Memory stays
 * bounded by the blob client's part size plus the sniff buffers. A rejected
 * upload is removed from the store before this returns.
 */
export async function storeUpload(opts: StoreOptions): Promise<StoreResult> {
  const out = new PassThrough();
  let hasStorageFailed = false;
  const put = opts.blob.putObject(opts.bucket, opts.key, out, opts.sizeHint, { "Content-Type": opts.mime }).then(
    () => true,
    () => {
      hasStorageFailed = true;
      return false;
    },
  );

  const inspector = createInspector(opts.ext, opts.maxBytes);
  let failure: UploadFailure | null = null;
  let received = 0;
  try {
    for await (const chunk of opts.source) {
      const buf = chunk as Buffer;
      received += buf.length;
      // Past the cap there is nothing left worth reading; leaving the loop drops the connection.
      if (received > opts.maxBytes + SNIFF_HEAD_BYTES) {
        failure ??= "too_large";
        break;
      }
      // After a rejection keep draining (within the cap) so the client still receives the error response.
      if (failure || hasStorageFailed) continue;
      failure = inspector.push(buf);
      if (failure) continue;
      if (!out.write(buf)) await Promise.race([once(out, "drain"), put]);
    }
  } catch {
    failure ??= "aborted";
  }

  const result: StoreResult = failure ? { ok: false, failure } : hasStorageFailed ? { ok: false, failure: "storage_unavailable" } : inspector.finish();
  // Ending (not destroying) lets the blob client settle instead of waiting on a stream that never ends.
  out.end();
  const isStored = await put;
  if (result.ok && isStored) return result;

  await Promise.allSettled([
    opts.blob.removeObject(opts.bucket, opts.key).catch(opts.onCleanupError),
    opts.blob.removeIncompleteUpload(opts.bucket, opts.key).catch(opts.onCleanupError),
  ]);
  return result.ok ? { ok: false, failure: "storage_unavailable" } : result;
}
