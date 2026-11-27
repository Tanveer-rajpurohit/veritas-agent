import { describe, expect, it } from "vitest";
import { filterCommands, withAskRow, type PromptCommand } from "./prompt-commands";

const commands: PromptCommand[] = [
  { id: "open-docs", label: "Open Docs", keywords: "document write" },
  { id: "beside-docs", label: "Open Docs beside", keywords: "split" },
  { id: "open-sheets", label: "Open Sheets", keywords: "spreadsheet" },
  { id: "desktop-data", label: "Switch to Data room", keywords: "desktop" },
];

describe("filterCommands", () => {
  it("returns every command in order for an empty query", () => {
    expect(filterCommands("  ", commands).map((c) => c.id)).toEqual(commands.map((c) => c.id));
  });

  it("matches labels and keywords case-insensitively, needing every word", () => {
    expect(filterCommands("SPREAD", commands).map((c) => c.id)).toEqual(["open-sheets"]);
    expect(filterCommands("docs split", commands).map((c) => c.id)).toEqual(["beside-docs"]);
    expect(filterCommands("docs nothing", commands)).toEqual([]);
  });

  it("ranks label-prefix matches before word-prefix and keyword matches", () => {
    expect(filterCommands("data", commands).map((c) => c.id)).toEqual(["desktop-data"]);
    expect(filterCommands("open", commands).map((c) => c.id)).toEqual(["open-docs", "beside-docs", "open-sheets"]);
    expect(filterCommands("desktop", commands).map((c) => c.id)).toEqual(["desktop-data"]);
  });
});

describe("withAskRow", () => {
  const ask = (text: string): PromptCommand => ({ id: "ask", label: `Ask Veritas: ${text}` });

  it("adds nothing without a query", () => {
    expect(withAskRow(" ", commands, ask)).toBe(commands);
  });

  it("is the only row when nothing matches, so Enter sends the prompt", () => {
    expect(withAskRow("make this formal", [], ask)).toEqual([ask("make this formal")]);
  });

  it("comes after matching commands", () => {
    expect(withAskRow("docs", commands.slice(0, 1), ask).map((c) => c.id)).toEqual(["open-docs", "ask"]);
  });
});
