import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { storeUpload } from "./store-upload";
import { buildZip, minimalDocx, minimalPdf } from "./test-zip";

function fakeBlob(options: { failPut?: boolean } = {}) {
  const objects = new Map<string, Buffer>();
  const removed: string[] = [];
  const blob = {
    putObject: async (_bucket: string, key: string, stream: Readable) => {
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        if (options.failPut) throw new Error("connect ECONNREFUSED");
        chunks.push(chunk as Buffer);
      }
      objects.set(key, Buffer.concat(chunks));
      return { etag: "e", versionId: null };
    },
    removeObject: async (_bucket: string, key: string) => {
      removed.push(key);
      objects.delete(key);
    },
    removeIncompleteUpload: async () => undefined,
  };
  return { blob: blob as unknown as Parameters<typeof storeUpload>[0]["blob"], objects, removed };
}

/** Splits the body into small chunks, like a socket would deliver it. */
const body = (buf: Buffer, chunk = 1024) => Readable.from(Array.from({ length: Math.ceil(buf.length / chunk) }, (_, i) => buf.subarray(i * chunk, (i + 1) * chunk)));

const store = (blob: ReturnType<typeof fakeBlob>["blob"], data: Buffer, ext: string, maxBytes = 10 * 1024 * 1024) =>
  storeUpload({ blob, bucket: "b", key: "k", source: body(data), ext, mime: "application/octet-stream", maxBytes, sizeHint: data.length, onCleanupError: () => {} });

describe("storeUpload", () => {
  it("stores a valid PDF and returns its size and checksum", async () => {
    const fake = fakeBlob();
    const pdf = Buffer.concat([minimalPdf(), Buffer.alloc(20_000, 0x20)]);
    const result = await store(fake.blob, pdf, "pdf");
    expect(result).toEqual({ ok: true, sizeBytes: pdf.length, sha256: createHash("sha256").update(pdf).digest("hex") });
    expect(fake.objects.get("k")?.equals(pdf)).toBe(true);
  });

  it("rejects an executable renamed to .pdf and removes what was written", async () => {
    const fake = fakeBlob();
    const exe = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(50_000, 0x90)]);
    expect(await store(fake.blob, exe, "pdf")).toEqual({ ok: false, failure: "invalid_content" });
    expect(fake.removed).toEqual(["k"]);
    expect(fake.objects.has("k")).toBe(false);
  });

  it("rejects a body over the cap", async () => {
    const fake = fakeBlob();
    const big = Buffer.concat([minimalPdf(), Buffer.alloc(40_000)]);
    expect(await store(fake.blob, big, "pdf", 30_000)).toEqual({ ok: false, failure: "too_large" });
    expect(fake.objects.has("k")).toBe(false);
  });

  it("rejects an empty body", async () => {
    expect(await store(fakeBlob().blob, Buffer.alloc(0), "pdf")).toEqual({ ok: false, failure: "empty" });
  });

  it("accepts a docx and rejects a zip bomb dressed as one", async () => {
    expect((await store(fakeBlob().blob, minimalDocx(), "docx")).ok).toBe(true);
    const bomb = buildZip([
      { name: "[Content_Types].xml", data: Buffer.from("<Types/>") },
      { name: "word/document.xml", data: Buffer.alloc(16 * 1024 * 1024) },
    ]);
    expect(await store(fakeBlob().blob, bomb, "docx")).toEqual({ ok: false, failure: "unsafe_archive" });
  });

  it("reports the store being down instead of hanging", async () => {
    const fake = fakeBlob({ failPut: true });
    const pdf = Buffer.concat([minimalPdf(), Buffer.alloc(200_000, 0x20)]);
    expect(await store(fake.blob, pdf, "pdf")).toEqual({ ok: false, failure: "storage_unavailable" });
  });
});
