import { describe, expect, it } from "vitest";
import { sanitizeEmailHtml } from "./sanitize";

const clean = (html: string) => sanitizeEmailHtml(html).html;

describe("sanitizeEmailHtml", () => {
  it("removes scripts, styles and their content", () => {
    expect(clean("<p>Hi</p><script>alert(1)</script><style>p{color:red}</style>")).toBe("<p>Hi</p>");
  });

  it("removes event handlers", () => {
    expect(clean('<p onclick="steal()" onmouseover="x()">Hi</p>')).toBe("<p>Hi</p>");
  });

  it("removes javascript: and data: links", () => {
    expect(clean('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript");
    expect(clean('<a href="data:text/html,<script>alert(1)</script>">x</a>')).not.toContain("data:");
  });

  it("forces links to open safely in a new tab", () => {
    expect(clean('<a href="https://example.test" target="_self" rel="opener">x</a>')).toBe(
      '<a href="https://example.test" target="_blank" rel="noopener noreferrer">x</a>',
    );
  });

  it("blocks remote images and reports it", () => {
    const result = sanitizeEmailHtml('<p>Hi</p><img src="https://tracker.example/pixel.gif" width="1">');
    expect(result.html).toBe("<p>Hi</p>");
    expect(result.hasBlockedImages).toBe(true);
  });

  it("keeps inline data images", () => {
    const result = sanitizeEmailHtml('<img src="data:image/png;base64,iVBORw0KGgo=" alt="logo">');
    expect(result.html).toContain('src="data:image/png;base64,iVBORw0KGgo="');
    expect(result.hasBlockedImages).toBe(false);
  });

  it("drops iframes, forms, objects and svg", () => {
    const html = clean('<iframe src="https://x"></iframe><form action="https://x"><input name="p"></form><object data="x"></object><svg onload="x()"></svg>ok');
    expect(html).toBe("ok");
  });

  it("keeps safe inline styles but strips url() and expressions", () => {
    expect(clean('<p style="color: #333; text-align: center">x</p>')).toBe('<p style="color:#333;text-align:center">x</p>');
    expect(clean('<p style="background-color: url(https://tracker.example/x)">x</p>')).toBe("<p>x</p>");
    expect(clean('<p style="width: expression(alert(1))">x</p>')).toBe("<p>x</p>");
  });

  it("keeps table layout used by most email templates", () => {
    expect(clean('<table width="600"><tr><td colspan="2" align="left">x</td></tr></table>')).toBe(
      '<table width="600"><tr><td colspan="2" align="left">x</td></tr></table>',
    );
  });
});
