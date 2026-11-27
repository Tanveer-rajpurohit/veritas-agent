const CRLF = "\r\n";
const BASE64_LINE = 76;

export class MimeError extends Error {
  constructor(
    readonly field: string,
    problem: "has a line break" | "isn't a plain email address",
  ) {
    super(`${field[0]!.toUpperCase()}${field.slice(1)} ${problem}.`);
    this.name = "MimeError";
  }
}

export type OutgoingMail = {
  from?: string;
  to: string[];
  cc: string[];
  subject: string;
  text: string;
  /** RFC 5322 Message-ID of the message being replied to. */
  inReplyTo?: string;
  references?: string;
  date?: Date;
};

/** A CR or LF in a header value would let the caller inject headers (Bcc:, a second body). */
function headerValue(field: string, value: string): string {
  if (/[\r\n]/.test(value)) throw new MimeError(field, "has a line break");
  return value;
}

/** Simple addr-spec only; display names are not accepted from callers. */
function address(field: string, value: string): string {
  headerValue(field, value);
  if (!/^[^\s<>(),;:"@]+@[^\s<>(),;:"@]+$/.test(value)) throw new MimeError(field, "isn't a plain email address");
  return value;
}

/** RFC 2047 encoded-word for non-ASCII subjects. */
function encodeSubject(subject: string): string {
  return /^[\x20-\x7e]*$/.test(subject) ? subject : `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

const wrap = (b64: string) => b64.match(new RegExp(`.{1,${BASE64_LINE}}`, "g"))?.join(CRLF) ?? "";

/** Builds an RFC 2822 text/plain message with CRLF line endings, body base64 encoded. */
export function buildMimeMessage(mail: OutgoingMail): string {
  const headers: string[] = [];
  if (mail.from) headers.push(`From: ${address("from", mail.from)}`);
  headers.push(`To: ${mail.to.map((a) => address("to", a)).join(", ")}`);
  if (mail.cc.length > 0) headers.push(`Cc: ${mail.cc.map((a) => address("cc", a)).join(", ")}`);
  headers.push(`Subject: ${encodeSubject(headerValue("subject", mail.subject))}`);
  headers.push(`Date: ${(mail.date ?? new Date()).toUTCString()}`);
  if (mail.inReplyTo) headers.push(`In-Reply-To: ${headerValue("inReplyTo", mail.inReplyTo)}`);
  if (mail.references) headers.push(`References: ${headerValue("references", mail.references)}`);
  headers.push("MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64");

  const body = mail.text.replace(/\r?\n/g, CRLF);
  return headers.join(CRLF) + CRLF + CRLF + wrap(Buffer.from(body, "utf8").toString("base64")) + CRLF;
}

/** Gmail's messages.send wants the whole message as base64url. */
export const toGmailRaw = (mime: string) => Buffer.from(mime, "utf8").toString("base64url");
