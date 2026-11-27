import type { ReactNode } from "react";
import { parseBlocks } from "./markdown-blocks";

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]\n]+\]\((https?:\/\/[^\s)]+)\))/g;

/** Inline code, bold and http(s) links. Everything else stays plain text, so nothing from the model becomes markup. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index;
    if (index > last) nodes.push(text.slice(last, index));
    const [token] = match;
    if (match[1]) {
      nodes.push(
        <code key={index} className="rounded-sm bg-surface-muted px-1 font-mono text-[0.9em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (match[2]) {
      nodes.push(
        <strong key={index} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      const label = token.slice(1, token.indexOf("]("));
      nodes.push(
        <a key={index} href={match[4]} target="_blank" rel="noopener noreferrer" className="text-accent-text underline underline-offset-2 hover:text-ink">
          {label}
        </a>,
      );
    }
    last = index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-6 break-words text-ink">
      {parseBlocks(text).map((block, i) => {
        switch (block.kind) {
          case "code":
            return (
              <pre key={i} className="overflow-x-auto rounded-lg border border-line bg-surface-muted p-3 font-mono text-xs leading-5">
                <code>{block.text}</code>
              </pre>
            );
          case "heading": {
            const Tag = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
            return (
              <Tag key={i} className="text-sm font-semibold">
                {renderInline(block.text)}
              </Tag>
            );
          }
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag key={i} className={block.ordered ? "flex list-decimal flex-col gap-1 pl-6" : "flex list-disc flex-col gap-1 pl-6"}>
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={i} className="whitespace-pre-line">
                {renderInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
