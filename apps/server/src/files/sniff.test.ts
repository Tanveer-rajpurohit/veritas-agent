import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { headMatches, inspectOoxml } from "./sniff";
import { buildZip, minimalDocx, minimalPdf } from "./test-zip";

describe("headMatches", () => {
  it("accepts real signatures", () => {
    expect(headMatches("pdf", minimalPdf())).toBe(true);
    expect(headMatches("docx", minimalDocx())).toBe(true);
    expect(headMatches("png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe(true);
    expect(headMatches("jpg", Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(headMatches("csv", Buffer.from("party,amount\nAcme,1200\n"))).toBe(true);
  });

  it("rejects an executable renamed to .pdf", () => {
    const exe = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(200, 0x90)]);
    expect(headMatches("pdf", exe)).toBe(false);
    expect(headMatches("docx", exe)).toBe(false);
  });

  it("treats binary as not text and tolerates a cut multi-byte character", () => {
    expect(headMatches("txt", Buffer.from([0x68, 0x00, 0x69]))).toBe(false);
    const rupee = Buffer.from("Total ₹", "utf8");
    expect(headMatches("txt", rupee.subarray(0, rupee.length - 1))).toBe(true);
  });

  it("knows no extension outside the allowlist", () => {
    expect(headMatches("exe", Buffer.from("MZ"))).toBe(false);
  });
});

describe("inspectOoxml", () => {
  it("accepts a well-formed docx", () => {
    const docx = minimalDocx();
    expect(inspectOoxml("docx", docx, docx.length)).toEqual({ ok: true });
  });

  it("rejects a zip that is not the claimed Office format", () => {
    const docx = minimalDocx();
    expect(inspectOoxml("xlsx", docx, docx.length)).toEqual({ ok: false, reason: "wrong_format" });
  });

  it("rejects a zip bomb from the central directory alone", () => {
    const bomb = buildZip([
      { name: "[Content_Types].xml", data: Buffer.from("<Types/>") },
      { name: "word/document.xml", data: Buffer.alloc(20 * 1024 * 1024) },
    ]);
    expect(bomb.length).toBeLessThan(100 * 1024);
    expect(inspectOoxml("docx", bomb, bomb.length)).toEqual({ ok: false, reason: "suspicious_ratio" });
  });

  it("rejects declared sizes that add up past the unpacked cap", () => {
    const zip = buildZip([
      { name: "[Content_Types].xml", data: Buffer.from("<Types/>") },
      { name: "word/document.xml", data: Buffer.from("<w:document/>") },
    ]);
    // Rewrite the second entry's declared uncompressed size to 600 MB, as a crafted file would.
    const cd = zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])) + 1);
    zip.writeUInt32LE(4096 * 1024, cd + 20);
    zip.writeUInt32LE(600 * 1024 * 1024, cd + 24);
    expect(inspectOoxml("docx", zip, zip.length)).toEqual({ ok: false, reason: "too_large_unpacked" });
  });

  it("rejects bytes without an end-of-central-directory record", () => {
    const junk = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), deflateRawSync(Buffer.from("x"))]);
    expect(inspectOoxml("docx", junk, junk.length)).toEqual({ ok: false, reason: "not_zip" });
  });
});
