import { sendMailInput, type MailAddress, type SendMailInput } from "@veritas/shared";
import { z } from "zod";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const sameYearDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const otherYearDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Short age for a list row: "Just now", "12m", "3h", "4d", then a date. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const elapsed = now.getTime() - then.getTime();
  // A clock a little ahead of ours still reads as recent rather than "in the future".
  if (elapsed < MINUTE) return "Just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < WEEK) return `${Math.floor(elapsed / DAY)}d`;
  return (then.getFullYear() === now.getFullYear() ? sameYearDate : otherYearDate).format(then);
}

const fullDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function formatFullDate(iso: string): string {
  return fullDate.format(new Date(iso));
}

export function formatAddress({ name, email }: MailAddress): string {
  return name && name !== email ? `${name} <${email}>` : email;
}

export function senderLabel({ name, email }: MailAddress): string {
  return name || email;
}

const emailSchema = z.email();
/** "Name <a@b.c>" keeps only the address inside the brackets. */
const ANGLE_ADDRESS = /<([^<>]+)>\s*$/;

export type ParsedAddresses = { emails: string[]; invalid: string[] };

/** Splits what the user typed (commas, semicolons or new lines) into addresses, keeping the ones that aren't valid. */
export function parseAddressList(input: string): ParsedAddresses {
  const emails: string[] = [];
  const invalid: string[] = [];
  for (const part of input.split(/[,;\n]/)) {
    const token = part.trim();
    if (!token) continue;
    const email = (ANGLE_ADDRESS.exec(token)?.[1] ?? token).trim();
    if (emailSchema.safeParse(email).success) {
      if (!emails.some((e) => e.toLowerCase() === email.toLowerCase())) emails.push(email);
    } else {
      invalid.push(token);
    }
  }
  return { emails, invalid };
}

export function replySubject(subject: string): string {
  return /^re:/i.test(subject.trim()) ? subject.trim() : `Re: ${subject.trim()}`;
}

export type ComposeDraft = { to: string; cc: string; subject: string; text: string };
export type ComposeField = keyof ComposeDraft;
export type ComposeValidation =
  | { ok: true; input: SendMailInput }
  | { ok: false; errors: Partial<Record<ComposeField, string>> };

function invalidMessage(invalid: string[]): string {
  return invalid.length === 1 ? `"${invalid[0]}" isn't a valid email address.` : `These aren't valid email addresses: ${invalid.join(", ")}.`;
}

/** Checks a draft the way the API will, with messages that point at the field to fix. */
export function validateCompose(
  draft: ComposeDraft,
  reply?: { inReplyToMessageId: string; threadId: string },
): ComposeValidation {
  const to = parseAddressList(draft.to);
  const cc = parseAddressList(draft.cc);
  const errors: Partial<Record<ComposeField, string>> = {};

  if (to.invalid.length > 0) errors.to = invalidMessage(to.invalid);
  else if (to.emails.length === 0) errors.to = "Add at least one recipient.";
  if (cc.invalid.length > 0) errors.cc = invalidMessage(cc.invalid);
  if (!draft.subject.trim() && !draft.text.trim()) errors.text = "Write a subject or a message before sending.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const parsed = sendMailInput.safeParse({ to: to.emails, cc: cc.emails, subject: draft.subject, text: draft.text, ...reply });
  if (parsed.success) return { ok: true, input: parsed.data };

  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (field === "to" || field === "cc") errors[field] ??= issue.code === "too_big" ? "That's too many recipients for one message." : issue.message;
    else if (field === "subject") errors.subject ??= "That subject is too long.";
    else errors.text ??= "That message is too long to send.";
  }
  return { ok: false, errors };
}

/**
 * Wraps server-sanitized mail HTML for a sandboxed iframe's srcdoc. The CSP is
 * a second fence behind the sanitizer: nothing may load from the network, so a
 * missed tracking pixel or CSS url() still can't call home.
 */
export function mailDocument(html: string): string {
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: cid:; style-src 'unsafe-inline'; font-src data:">`,
    "<style>html{color-scheme:light}body{margin:0;padding:16px;font:14px/1.5 system-ui,sans-serif;color:#0a0a0a;background:#fff;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}</style>",
    "</head><body>",
    html,
    "</body></html>",
  ].join("");
}
