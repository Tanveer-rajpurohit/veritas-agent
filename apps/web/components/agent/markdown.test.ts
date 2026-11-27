import { describe, expect, it } from "vitest";
import { parseBlocks } from "./markdown-blocks";

describe("parseBlocks", () => {
  it("splits headings, lists, code and paragraphs", () => {
    const blocks = parseBlocks("# Summary\nTwo files.\nBoth signed.\n\n- Term sheet\n- NDA\n\n1. Read\n2. Reply\n\n```ts\nconst a = 1;\n```");
    expect(blocks).toEqual([
      { kind: "heading", level: 1, text: "Summary" },
      { kind: "paragraph", text: "Two files.\nBoth signed." },
      { kind: "list", ordered: false, items: ["Term sheet", "NDA"] },
      { kind: "list", ordered: true, items: ["Read", "Reply"] },
      { kind: "code", text: "const a = 1;" },
    ]);
  });

  it("keeps an unfinished code fence as code while it streams", () => {
    expect(parseBlocks("Here:\n```\nline one")).toEqual([
      { kind: "paragraph", text: "Here:" },
      { kind: "code", text: "line one" },
    ]);
  });

  it("leaves HTML as plain text", () => {
    expect(parseBlocks('<img src=x onerror="alert(1)">')).toEqual([{ kind: "paragraph", text: '<img src=x onerror="alert(1)">' }]);
  });
});
