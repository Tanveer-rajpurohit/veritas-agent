import sanitizeHtml from "sanitize-html";

const CELL_ATTRS = ["colspan", "rowspan", "align", "valign", "width", "height", "bgcolor"];
const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i];
const LENGTH = [/^-?\d+(\.\d+)?(px|em|rem|%|pt)?(\s+-?\d+(\.\d+)?(px|em|rem|%|pt)?){0,3}$/];

/**
 * Allowlist for email HTML. Inline styles are kept only for plain values
 * (no url(), so no remote loads); images are kept only as data: URIs, since
 * remote images are tracking pixels until we proxy them.
 */
function options(onBlockedImage: () => void): sanitizeHtml.IOptions {
  return {
    allowedTags: [
      "a", "b", "blockquote", "br", "caption", "center", "code", "col", "colgroup", "dd", "div", "dl", "dt", "em",
      "font", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre", "s", "small", "span",
      "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul",
    ],
    allowedAttributes: {
      a: ["href", "title", "rel", "target"],
      img: ["src", "alt", "width", "height"],
      font: ["color"],
      table: ["width", "border", "cellpadding", "cellspacing", "align", "bgcolor"],
      td: CELL_ATTRS,
      th: CELL_ATTRS,
      "*": ["style", "dir", "lang", "title"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["data"] },
    allowProtocolRelative: false,
    allowedStyles: {
      "*": {
        color: COLOR,
        "background-color": COLOR,
        "text-align": [/^(left|right|center|justify)$/],
        "font-weight": [/^(normal|bold|[1-9]00)$/],
        "font-style": [/^(normal|italic)$/],
        "font-size": LENGTH,
        "text-decoration": [/^[a-z\s-]+$/],
        padding: LENGTH,
        margin: LENGTH,
        width: LENGTH,
      },
    },
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "title", "head"],
    transformTags: {
      a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: "noopener noreferrer", target: "_blank" } }),
      img: (tagName, attribs) => {
        const { src, ...rest } = attribs;
        if (src && /^data:image\/(png|gif|jpe?g|webp);base64,/i.test(src)) return { tagName, attribs: { ...rest, src } };
        if (src) onBlockedImage();
        return { tagName, attribs: rest };
      },
    },
    // An <img> whose source was removed has nothing left to show.
    exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
  };
}

export function sanitizeEmailHtml(html: string): { html: string; hasBlockedImages: boolean } {
  let hasBlockedImages = false;
  const clean = sanitizeHtml(
    html,
    options(() => {
      hasBlockedImages = true;
    }),
  );
  return { html: clean, hasBlockedImages };
}
