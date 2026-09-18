import { Mark, mergeAttributes } from "@tiptap/react";

export const CitationExtension = Mark.create({
  name: "citation",

  addOptions() {
    return {
      HTMLAttributes: {
        class:
          "inline-citation font-serif font-medium text-[#2c5478] bg-[#edf4fa] hover:bg-[#cbe0f2] px-1.5 py-0.5 rounded border border-[#cbe0f2] cursor-pointer transition-colors text-[12px] inline-flex items-center gap-1",
      },
    };
  },

  addAttributes() {
    const dataAttributes: Array<[name: string, attribute: string]> = [
      ["referenceId", "data-reference-id"],
      ["citationNumber", "data-citation-number"],
      ["citationTitle", "data-citation-title"],
      ["citation", "data-citation"],
      ["court", "data-court"],
      ["status", "data-status"],
      ["citationLink", "data-citation-link"],
    ];

    return Object.fromEntries(
      dataAttributes.map(([name, attribute]) => [
        name,
        {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute(attribute),
          renderHTML: (attributes: Record<string, unknown>) =>
            attributes[name] ? { [attribute]: attributes[name] } : {},
        },
      ]),
    );
  },

  parseHTML() {
    return [{ tag: "span.inline-citation" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
