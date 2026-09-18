import { Mark, mergeAttributes } from "@tiptap/react";

/**
 * Inline Legal Citation Mark Extension.
 * Renders as an inline text mark (`span.inline-citation`) with denormalized attributes,
 * perfectly flowing with surrounding legal typography without disruptive box padding.
 */
export const CitationExtension = Mark.create({
  name: "citation",

  addOptions() {
    return {
      HTMLAttributes: {
        class: "inline-citation",
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

  renderHTML({
    HTMLAttributes,
  }: {
    HTMLAttributes: Record<string, unknown>;
  }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
