import { z } from "zod";

export const MAIL_SUBJECT_MAX = 998;
export const MAIL_BODY_MAX = 200_000;
export const MAIL_RECIPIENTS_MAX = 50;

/** Gmail system and user label IDs: INBOX, SENT, Label_123... */
const labelId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "Unknown label");
/** Gmail opaque IDs and page tokens are URL-safe tokens. */
const gmailToken = z.string().regex(/^[A-Za-z0-9_-]{1,256}$/, "Invalid ID");

export const mailThreadsQuery = z.object({
  label: labelId.default("INBOX"),
  pageToken: gmailToken.optional(),
  q: z.string().trim().max(500).optional(),
});
export type MailThreadsQuery = z.infer<typeof mailThreadsQuery>;

export const mailThreadParams = z.object({ workspaceId: z.uuid(), threadId: gmailToken });

export const mailAddress = z.object({ name: z.string(), email: z.string() });
export type MailAddress = z.infer<typeof mailAddress>;

export const mailThreadSummary = z.object({
  id: z.string(),
  from: mailAddress,
  subject: z.string(),
  snippet: z.string(),
  lastMessageAt: z.iso.datetime(),
  isUnread: z.boolean(),
  /** Best effort: Gmail's metadata view only exposes the top-level MIME type. */
  hasAttachments: z.boolean(),
  messageCount: z.number().int().nonnegative(),
});
export type MailThreadSummary = z.infer<typeof mailThreadSummary>;

export const mailThreadList = z.object({
  threads: z.array(mailThreadSummary),
  nextPageToken: z.string().nullable(),
});
export type MailThreadList = z.infer<typeof mailThreadList>;

export const mailAttachment = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
});
export type MailAttachment = z.infer<typeof mailAttachment>;

export const mailMessage = z.object({
  id: z.string(),
  from: mailAddress,
  to: z.array(mailAddress),
  cc: z.array(mailAddress),
  subject: z.string(),
  sentAt: z.iso.datetime(),
  isUnread: z.boolean(),
  /** RFC 5322 Message-ID, used for replies. */
  messageIdHeader: z.string().nullable(),
  text: z.string().nullable(),
  /** Sanitized on the server: no scripts, handlers or remote images. */
  html: z.string().nullable(),
  /** True when remote images were removed from `html`. */
  hasBlockedImages: z.boolean(),
  attachments: z.array(mailAttachment),
});
export type MailMessage = z.infer<typeof mailMessage>;

export const mailThread = z.object({
  id: z.string(),
  subject: z.string(),
  messages: z.array(mailMessage),
});
export type MailThread = z.infer<typeof mailThread>;

export const sendMailInput = z.object({
  to: z.array(z.email("Enter a valid email address")).min(1, "Add at least one recipient").max(MAIL_RECIPIENTS_MAX),
  cc: z.array(z.email("Enter a valid email address")).max(MAIL_RECIPIENTS_MAX).default([]),
  subject: z.string().trim().max(MAIL_SUBJECT_MAX),
  text: z.string().max(MAIL_BODY_MAX),
  inReplyToMessageId: gmailToken.optional(),
  threadId: gmailToken.optional(),
});
export type SendMailInput = z.infer<typeof sendMailInput>;

export const sendMailResult = z.object({ id: z.string(), threadId: z.string() });
export type SendMailResult = z.infer<typeof sendMailResult>;
