import type { FilesEntry } from "@veritas/shared";
import { describe, expect, it } from "vitest";
import { formatBytes, shortHash, sortEntries } from "./files-format";

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [1023, "1023 B"],
    [1024, "1 KB"],
    [1536, "1.5 KB"],
    [20 * 1024, "20 KB"],
    [100 * 1024 * 1024, "100 MB"],
    [3.25 * 1024 ** 3, "3.3 GB"],
  ])("formats %i as %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe("sortEntries", () => {
  const at = "2026-11-27T10:00:00.000Z";
  const folder = (name: string): FilesEntry => ({ type: "folder", id: crypto.randomUUID(), name, parentId: null, updatedAt: at, deletedAt: null });
  const file = (name: string): FilesEntry => ({
    type: "file",
    id: crypto.randomUUID(),
    name,
    kind: "pdf",
    mime: "application/pdf",
    sizeBytes: 1,
    parentId: null,
    currentVersionId: null,
    updatedAt: at,
    deletedAt: null,
  });

  it("puts folders first and sorts numbers naturally", () => {
    const sorted = sortEntries([file("Exhibit 10.pdf"), folder("zeta"), file("Exhibit 2.pdf"), folder("Alpha")]);
    expect(sorted.map((e) => e.name)).toEqual(["Alpha", "zeta", "Exhibit 2.pdf", "Exhibit 10.pdf"]);
  });
});

describe("shortHash", () => {
  it("drops the algorithm prefix", () => {
    expect(shortHash("sha256:0123456789abcdef")).toBe("01234567");
  });
});
