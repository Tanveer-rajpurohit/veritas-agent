import type { MailAddress, MailAttachment, MailMessage, MailThread, MailThreadSummary } from "@veritas/shared";
import type { GmailHeader, GmailMessage, GmailPart, GmailThread } from "../connectors/google/gmail";
import { sanitizeEmailHtml } from "./sanitize";

export function headerOf(headers: GmailHeader[] | undefined, name: string): string | undefined {
  const lower = name.toLowerCase();
  return headers?.find((h) => h.name.toLowerCase() === lower)?.value;
}

/** `"Jane Doe" <jane@x.com>`, `Jane <jane@x.com>` or a bare `jane@x.com`. */
export function parseAddress(raw: string): MailAddress {
  const match = /^\s*(.*?)\s*<([^<>]+)>\s*$/.exec(raw);
  if (!match) return { name: "", email: raw.trim() };
  return { name: match[1]!.replace(/^"(.*)"$/, "$1").trim(), email: match[2]!.trim() };
}

/** Splits on commas outside quotes and angle brackets. */
export function parseAddressList(raw: string | undefined): MailAddress[] {
  if (!raw) return [];
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  let inAngle = false;
  for (const ch of raw) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "<" && !inQuotes) inAngle = true;
    else if (ch === ">" && !inQuotes) inAngle = false;
    if (ch === "," && !inQuotes && !inAngle) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  parts.push(current);
  return parts.filter((p) => p.trim()).map(parseAddress);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Gmail snippets arrive HTML-escaped (&#39;, &amp;); the API returns them as plain text. */
export function decodeSnippet(snippet: string): string {
  return snippet.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

function sentAt(message: GmailMessage): Date {
  const internal = Number(message.internalDate);
  if (Number.isFinite(internal) && internal > 0) return new Date(internal);
  const parsed = Date.parse(headerOf(message.payload?.headers, "Date") ?? "");
  return new Date(Number.isFinite(parsed) ? parsed : 0);
}

function* walk(part: GmailPart | undefined): Generator<GmailPart> {
  if (!part) return;
  yield part;
  for (const child of part.parts ?? []) yield* walk(child);
}

const isAttachment = (part: GmailPart) => Boolean(part.filename) && Boolean(part.body?.attachmentId || part.body?.size);

function decodeBody(part: GmailPart): string {
  const bytes = Buffer.from(part.body?.data ?? "", "base64url");
  const charset = /charset="?([^";\s]+)"?/i.exec(headerOf(part.headers, "Content-Type") ?? "")?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    // Unknown charset label: UTF-8 is the best guess and never throws.
    return new TextDecoder("utf-8").decode(bytes);
  }
}

export function summarizeThread(thread: GmailThread): MailThreadSummary | null {
  const first = thread.messages[0];
  const last = thread.messages.at(-1);
  if (!first || !last) return null;
  return {
    id: thread.id,
    from: parseAddress(headerOf(last.payload?.headers, "From") ?? ""),
    subject: headerOf(first.payload?.headers, "Subject") ?? "",
    snippet: decodeSnippet(last.snippet),
    lastMessageAt: sentAt(last).toISOString(),
    isUnread: thread.messages.some((m) => m.labelIds.includes("UNREAD")),
    // The metadata view has no parts, so a multipart/mixed top level is the signal.
    hasAttachments: thread.messages.some(
      (m) => m.payload?.mimeType === "multipart/mixed" || [...walk(m.payload)].some(isAttachment),
    ),
    messageCount: thread.messages.length,
  };
}

export function toMailMessage(message: GmailMessage): MailMessage {
  const headers = message.payload?.headers;
  let text: string | null = null;
  let rawHtml: string | null = null;
  const attachments: MailAttachment[] = [];

  for (const part of walk(message.payload)) {
    if (isAttachment(part)) {
      attachments.push({
        id: part.body?.attachmentId ?? part.partId ?? "",
        filename: part.filename!,
        mimeType: part.mimeType ?? "application/octet-stream",
        size: part.body?.size ?? 0,
      });
    } else if (part.body?.data && part.mimeType === "text/plain" && text === null) {
      text = decodeBody(part);
    } else if (part.body?.data && part.mimeType === "text/html" && rawHtml === null) {
      rawHtml = decodeBody(part);
    }
  }

  const sanitized = rawHtml === null ? null : sanitizeEmailHtml(rawHtml);
  return {
    id: message.id,
    from: parseAddress(headerOf(headers, "From") ?? ""),
    to: parseAddressList(headerOf(headers, "To")),
    cc: parseAddressList(headerOf(headers, "Cc")),
    subject: headerOf(headers, "Subject") ?? "",
    sentAt: sentAt(message).toISOString(),
    isUnread: message.labelIds.includes("UNREAD"),
    messageIdHeader: headerOf(headers, "Message-ID") ?? null,
    text,
    html: sanitized?.html ?? null,
    hasBlockedImages: sanitized?.hasBlockedImages ?? false,
    attachments,
  };
}

export function toMailThread(thread: GmailThread): MailThread {
  const messages = thread.messages.map(toMailMessage);
  return { id: thread.id, subject: messages[0]?.subject ?? "", messages };
}
