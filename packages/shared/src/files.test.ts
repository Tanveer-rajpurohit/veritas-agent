import { describe, expect, it } from "vitest";
import { createFolderInput, fileNameError, MAX_UPLOAD_BYTES, sanitizeFileName, updateEntryInput, uploadPreflightError, uploadTypeFor } from "./files";

describe("fileNameError", () => {
  it.each([
    ["Clients", null],
    ["  Term sheet v2  ", null],
    ["", "Enter a name."],
    ["   ", "Enter a name."],
    ["..", "Choose a different name."],
    ["a/b", 'Names can\'t contain / \\ : * ? " < > |'],
    ["notes:draft", 'Names can\'t contain / \\ : * ? " < > |'],
    ["x".repeat(121), "Use 120 characters or fewer."],
  ])("%j gives %j", (name, expected) => {
    expect(fileNameError(name)).toBe(expected);
  });
});

describe("sanitizeFileName", () => {
  it("drops any path and replaces unsafe characters", () => {
    expect(sanitizeFileName("C:\\Users\\a\\..\\evil.pdf")).toBe("evil.pdf");
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName('bad"name<1>.docx')).toBe("bad_name_1_.docx");
    expect(sanitizeFileName("line\nbreak\u0000.txt")).toBe("line_break_.txt");
  });

  it("trims dots and spaces and never returns an empty name", () => {
    expect(sanitizeFileName("  .hidden.pdf.  ")).toBe("hidden.pdf");
    expect(sanitizeFileName("...")).toBe("Untitled");
  });

  it("keeps the extension when shortening", () => {
    const name = sanitizeFileName(`${"a".repeat(200)}.xlsx`);
    expect(name).toHaveLength(120);
    expect(name.endsWith(".xlsx")).toBe(true);
  });
});

describe("uploadPreflightError", () => {
  it("refuses large, empty and blocked files before upload", () => {
    expect(uploadPreflightError({ name: "big.pdf", size: MAX_UPLOAD_BYTES + 1 })).toBe("Files must be 100 MB or smaller");
    expect(uploadPreflightError({ name: "a.pdf", size: 0 })).toBe("This file is empty.");
    expect(uploadPreflightError({ name: "setup.exe", size: 10 })).toMatch(/can't store \.exe files/);
    expect(uploadPreflightError({ name: "README", size: 10 })).toMatch(/files without an extension/);
    expect(uploadPreflightError({ name: "Deck.PPTX", size: MAX_UPLOAD_BYTES })).toBeNull();
  });

  it("maps extensions to kinds", () => {
    expect(uploadTypeFor("brief.docx")?.kind).toBe("doc");
    expect(uploadTypeFor("model.xlsx")?.kind).toBe("sheet");
    expect(uploadTypeFor("scan.pdf")?.kind).toBe("pdf");
  });
});

describe("entry inputs", () => {
  it("rejects unknown fields and empty updates", () => {
    expect(createFolderInput.safeParse({ name: "Clients", workspaceId: "x" }).success).toBe(false);
    expect(updateEntryInput.safeParse({}).success).toBe(false);
    expect(createFolderInput.parse({ name: "  Clients " })).toEqual({ name: "Clients", parentId: null });
  });
});
