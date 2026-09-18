import type { DraftPage } from "../../types/draft/types";

const A4_PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 20mm 18mm;
  }
  @media print {
    body {
      background: transparent !important;
      padding: 0 !important;
    }
    .page-sheet {
      page-break-after: always;
      break-after: page;
      box-shadow: none !important;
      border: none !important;
      padding: 0 !important;
    }
  }
  body {
    font-family: 'Newsreader', Georgia, 'Times New Roman', serif;
    color: #1a1a1a;
    background: #fff;
    line-height: 1.6;
    margin: 0;
    padding: 24px;
  }
  .page-sheet {
    max-width: 794px;
    margin: 0 auto 32px auto;
    padding: 36px 40px;
    background: #fff;
    box-sizing: border-box;
  }
  .header-meta {
    font-family: 'Figtree', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 10px;
    color: #666;
    border-bottom: 1px solid #ddd;
    padding-bottom: 8px;
    margin-bottom: 16px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    justify-content: space-between;
  }
  .sub-header {
    font-family: 'Figtree', sans-serif;
    font-size: 11px;
    font-weight: bold;
    text-align: center;
    border-bottom: 1px solid #eee;
    padding-bottom: 12px;
    margin-bottom: 20px;
    white-space: pre-line;
    line-height: 1.4;
  }
  .section-block {
    margin-bottom: 18px;
  }
  .section-title {
    font-family: 'Figtree', sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #111;
    margin: 0 0 6px 0;
  }
  .section-content {
    font-size: 13px;
    white-space: pre-line;
    color: #222;
    margin: 0 0 8px 0;
    text-align: justify;
  }
  .citation-box {
    margin: 6px 0 10px 0;
    padding: 8px 12px;
    background: #f7f9fa;
    border-left: 3px solid #487aa8;
    font-family: 'Figtree', sans-serif;
    font-size: 11px;
  }
  .citation-title {
    font-weight: 600;
    color: #2c5478;
  }
  .citation-meta {
    color: #666;
    font-size: 10px;
  }
  .footer-meta {
    border-top: 1px solid #ddd;
    padding-top: 8px;
    margin-top: 24px;
    font-family: 'Figtree', sans-serif;
    font-size: 10px;
    color: #777;
    display: flex;
    justify-content: space-between;
  }
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeFileName(title: string): string {
  return (
    title
      .replace(/[^\w\s-]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase() || "draft"
  );
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildDocumentHtml(
  title: string,
  content: DraftPage[] | string,
): string {
  let bodyContent: string;

  if (typeof content === "string") {
    bodyContent = `
    <div class="page-sheet">
      <div class="header-meta">
        <span>${escapeHtml(title.toUpperCase())}</span>
        <span>LEGAL DRAFT · WORKING BRIEF</span>
      </div>
      <div class="tiptap-content-export">
        ${content}
      </div>
      <div class="footer-meta">
        <span>CONFIDENTIAL · FOR LEGAL REVIEW ONLY</span>
        <span>VERITAS LEGAL AGENT</span>
      </div>
    </div>`;
  } else {
    bodyContent = content
      .map(
        (page) => `
      <div class="page-sheet">
        <div class="header-meta">
          <span>${escapeHtml(page.headerTitle)}</span>
          <span>Page ${page.pageNumber} of ${page.totalPdfPages}</span>
        </div>
        ${
          page.subHeader
            ? `<div class="sub-header">${escapeHtml(page.subHeader)}</div>`
            : ""
        }
        <div class="sections-wrapper">
          ${page.sections
            .map(
              (sec) => `
            <div class="section-block">
              <h3 class="section-title">${escapeHtml(sec.title)}</h3>
              <div class="section-content">${escapeHtml(sec.content)}</div>
              ${
                sec.citations && sec.citations.length > 0
                  ? sec.citations
                      .map(
                        (c) => `
                <div class="citation-box">
                  <span class="citation-title">${escapeHtml(c.title)}</span> &bull; <em>${escapeHtml(c.citation)}</em>
                  <div class="citation-meta">${escapeHtml(c.court)} [${escapeHtml(c.status)}]</div>
                </div>
              `,
                      )
                      .join("")
                  : ""
              }
            </div>
          `,
            )
            .join("")}
        </div>
        <div class="footer-meta">
          <span>CONFIDENTIAL · FOR LEGAL REVIEW ONLY</span>
          <span>Page ${page.pageNumber} of ${page.totalPdfPages}</span>
        </div>
      </div>
    `,
      )
      .join("\n");
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>${A4_PRINT_STYLES}</style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}

export function htmlToMarkdown(html: string): string {
  let md = html;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/ol>|<\/ul>/gi, "\n");
  md = md.replace(/<ol[^>]*>|<ul[^>]*>/gi, "");
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_match, p1) => {
    return (
      p1
        .split("\n")
        .map((line: string) => `> ${line.trim()}`)
        .join("\n") + "\n\n"
    );
  });
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<[^>]+>/g, "");
  md = md
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return md.trim() + "\n";
}

export function exportAsMarkdown(
  title: string,
  content: DraftPage[] | string,
): void {
  const md =
    typeof content === "string"
      ? `# ${title}\n\n${htmlToMarkdown(content)}`
      : `# ${title}\n\n` +
        content
          .map((page) => {
            let sectionText = page.subHeader ? `### ${page.subHeader}\n\n` : "";
            for (const sec of page.sections) {
              sectionText += `## ${sec.title}\n\n${sec.content}\n\n`;
              if (sec.citations && sec.citations.length > 0) {
                sectionText += `> **Citations:**\n`;
                for (const c of sec.citations) {
                  sectionText += `> - *${c.title}*, ${c.citation} (${c.court}) [${c.status}]\n`;
                }
                sectionText += "\n";
              }
            }
            return sectionText;
          })
          .join("\n");

  downloadBlob(
    new Blob([md], { type: "text/markdown;charset=utf-8" }),
    `${safeFileName(title)}.md`,
  );
}

export function exportAsDocx(
  title: string,
  content: DraftPage[] | string,
): void {
  const html = buildDocumentHtml(title, content);
  downloadBlob(
    new Blob([html], { type: "application/msword" }),
    `${safeFileName(title)}.doc`,
  );
}

export function printDocument(
  title: string,
  content: DraftPage[] | string,
): void {
  const html = buildDocumentHtml(title, content);
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanUp = () => {
    try {
      frame.remove();
    } catch {
      // Ignored
    }
  };

  frame.contentWindow?.addEventListener("afterprint", cleanUp);

  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(cleanUp, 60_000);
  }, 150);
}
