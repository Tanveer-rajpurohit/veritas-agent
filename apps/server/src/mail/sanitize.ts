import sanitizeHtml from "sanitize-html";

const CELL_ATTRS = ["colspan", "rowspan", "align", "valign", "width", "height", "bgcolor"];
const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i];
const LENGTH = [/^-?\d+(\.\d+)?(px|em|rem|%|pt)?(\s+-?\d+(\.\d+)?(px|em|rem|%|pt)?){0,3}$/];

/** Maps image sources to same-origin server routes; null drops the image. */
export type ImageRewrites = {
  /** An http(s) URL to the image proxy route. */
  proxy(url: string): string | null;
  /** A Content-ID (from a cid: URL) to the inline-part route. */
  inline(contentId: string): string | null;
};

const BLOCK_ALL: ImageRewrites = { proxy: () => null, inline: () => null };
const DATA_IMAGE = /^data:image\/(png|gif|jpe?g|webp);base64,/i;

function rewriteImageSource(src: string, images: ImageRewrites): string | null {
  if (DATA_IMAGE.test(src)) return src;
  const cid = /^cid:(.+)$/i.exec(src)?.[1];
  if (cid) {
    try {
      return images.inline(decodeURIComponent(cid).trim());
    } catch {
      // Malformed percent-encoding: no Content-ID can match it.
      return null;
    }
  }
  return /^https?:\/\//i.test(src) ? images.proxy(src) : null;
}

/**
 * Allowlist for email HTML. Inline styles are kept only for plain values
 * (no url(), so no remote loads). Images survive only as data: URIs or as
 * links to our own proxy and inline-part routes, so the sender never sees the
 * reader's IP or cookies.
 */
function options(images: ImageRewrites, onBlockedImage: () => void): sanitizeHtml.IOptions {
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
        const rewritten = src ? rewriteImageSource(src.trim(), images) : null;
        if (rewritten) return { tagName, attribs: { ...rest, src: rewritten } };
        if (src) onBlockedImage();
        return { tagName, attribs: rest };
      },
    },
    // An <img> whose source was removed has nothing left to show.
    exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
  };
}

export function sanitizeEmailHtml(html: string, images: ImageRewrites = BLOCK_ALL): { html: string; hasBlockedImages: boolean } {
  let hasBlockedImages = false;
  const clean = sanitizeHtml(
    html,
    options(images, () => {
      hasBlockedImages = true;
    }),
  );
  return { html: clean, hasBlockedImages };
}
