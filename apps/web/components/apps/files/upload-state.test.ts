import { describe, expect, it } from "vitest";
import { classifyUploadError, nextToStart, uploadPercent, uploadReducer, type UploadItem } from "./upload-state";

const MB = 1024 * 1024;

function added(files: { id: string; name: string; size: number }[]): UploadItem[] {
  return uploadReducer([], { type: "add", files, parentId: "folder-1" });
}

describe("uploadReducer", () => {
  it("queues valid files and fails oversized or blocked ones before any bytes are sent", () => {
    const items = added([
      { id: "a", name: "Brief.docx", size: 2 * MB },
      { id: "b", name: "Scan.pdf", size: 120 * MB },
      { id: "c", name: "setup.exe", size: MB },
    ]);
    expect(items.map((i) => [i.id, i.status, i.error?.kind])).toEqual([
      ["a", "queued", undefined],
      ["b", "failed", "too_large"],
      ["c", "failed", "blocked"],
    ]);
    expect(items[1]!.error!.message).toBe("Files must be 100 MB or smaller");
    expect(items.every((i) => i.parentId === "folder-1")).toBe(true);
  });

  it("tracks progress, caps it at the file size and finishes at 100%", () => {
    let items = added([{ id: "a", name: "Deck.pptx", size: 1000 }]);
    items = uploadReducer(items, { type: "start", id: "a" });
    items = uploadReducer(items, { type: "progress", id: "a", loaded: 250 });
    expect(uploadPercent(items[0]!)).toBe(25);
    items = uploadReducer(items, { type: "progress", id: "a", loaded: 5000 });
    expect(items[0]!.loaded).toBe(1000);
    items = uploadReducer(items, { type: "succeed", id: "a" });
    expect(items[0]).toMatchObject({ status: "done", loaded: 1000, error: null });
  });

  it("retries only failures that can succeed on a second try", () => {
    let items = added([
      { id: "net", name: "a.pdf", size: 10 },
      { id: "bad", name: "b.pdf", size: 10 },
    ]);
    items = uploadReducer(items, { type: "fail", id: "net", error: classifyUploadError(0, "") });
    items = uploadReducer(items, { type: "fail", id: "bad", error: classifyUploadError(415, "This file isn't a valid PDF") });
    items = uploadReducer(items, { type: "retry", id: "net" });
    items = uploadReducer(items, { type: "retry", id: "bad" });
    expect(items.map((i) => i.status)).toEqual(["queued", "failed"]);
  });

  it("never dismisses an upload in flight and clears only finished ones", () => {
    let items = added([
      { id: "a", name: "a.pdf", size: 10 },
      { id: "b", name: "b.pdf", size: 10 },
      { id: "c", name: "c.exe", size: 10 },
    ]);
    items = uploadReducer(items, { type: "start", id: "a" });
    items = uploadReducer(items, { type: "dismiss", id: "a" });
    expect(items).toHaveLength(3);
    items = uploadReducer(items, { type: "clearFinished" });
    expect(items.map((i) => i.id)).toEqual(["a", "b"]);
  });
});

describe("nextToStart", () => {
  it("keeps at most the limit in flight", () => {
    let items = added(["a", "b", "c", "d"].map((id) => ({ id, name: `${id}.pdf`, size: 10 })));
    expect(nextToStart(items, 2)).toEqual(["a", "b"]);
    items = uploadReducer(items, { type: "start", id: "a" });
    expect(nextToStart(items, 2)).toEqual(["b"]);
  });
});

describe("classifyUploadError", () => {
  it("separates storage outages and dropped connections from bad files", () => {
    expect(classifyUploadError(503, "x")).toMatchObject({ kind: "storage", canRetry: true });
    expect(classifyUploadError(0, "")).toMatchObject({ kind: "network", canRetry: true });
    expect(classifyUploadError(413, "Files must be 100 MB or smaller")).toMatchObject({ kind: "too_large", canRetry: false });
    expect(classifyUploadError(415, "x")).toMatchObject({ kind: "blocked", canRetry: false });
    expect(classifyUploadError(500, "x")).toMatchObject({ kind: "server", canRetry: true });
    expect(classifyUploadError(400, "This file is empty.")).toMatchObject({ kind: "server", canRetry: false });
  });
});
