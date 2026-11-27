/** A row in the prompt window. `keywords` widen matching beyond the visible label. */
export type PromptCommand = {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
};

const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Commands whose label or keywords contain every word of the query, best first:
 * label starts with the query, then a label word starts with it, then any other match.
 * An empty query returns every command in its original order.
 */
export function filterCommands<T extends PromptCommand>(query: string, commands: readonly T[]): T[] {
  const q = normalise(query);
  if (!q) return [...commands];
  const words = q.split(" ");
  const scored: { command: T; score: number; index: number }[] = [];
  commands.forEach((command, index) => {
    const label = normalise(command.label);
    const haystack = `${label} ${normalise(command.keywords ?? "")}`;
    if (!words.every((w) => haystack.includes(w))) return;
    const score = label.startsWith(q) ? 0 : label.split(" ").some((w) => w.startsWith(words[0]!)) ? 1 : 2;
    scored.push({ command, score, index });
  });
  return scored.sort((a, b) => a.score - b.score || a.index - b.index).map((s) => s.command);
}

/** The free-text row: shown whenever there is a query, first when no command matches. */
export function withAskRow<T extends PromptCommand>(query: string, matches: T[], askRow: (text: string) => T): T[] {
  const text = query.trim();
  if (!text) return matches;
  return matches.length === 0 ? [askRow(text)] : [...matches, askRow(text)];
}
