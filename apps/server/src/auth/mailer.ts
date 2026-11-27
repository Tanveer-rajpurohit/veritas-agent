import nodemailer from "nodemailer";
import type { Env } from "../env";

export type Mailer = {
  send: (message: { to: string; subject: string; text: string; html: string }) => Promise<void>;
};

export function createMailer(env: Env): Mailer {
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
  });
  return {
    send: async (message) => {
      await transport.sendMail({ from: env.MAIL_FROM, ...message });
    },
  };
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One plain, readable email layout. Text version always included. */
export function actionEmail(opts: { greetingName: string; intro: string; action: string; url: string; outro: string }) {
  const name = escapeHtml(opts.greetingName);
  const url = escapeHtml(opts.url);
  const html = `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0a0a0a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:48px 16px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;text-align:left">
<tr><td style="font-size:20px;font-weight:600;padding-bottom:24px">Veritas</td></tr>
<tr><td style="font-size:16px;line-height:24px;padding-bottom:16px">Hi ${name},</td></tr>
<tr><td style="font-size:16px;line-height:24px;padding-bottom:24px">${escapeHtml(opts.intro)}</td></tr>
<tr><td style="padding-bottom:24px"><a href="${url}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:12px 24px;border-radius:8px">${escapeHtml(opts.action)}</a></td></tr>
<tr><td style="font-size:14px;line-height:20px;color:#525252;padding-bottom:8px">${escapeHtml(opts.outro)}</td></tr>
<tr><td style="font-size:12px;line-height:16px;color:#737373;word-break:break-all">If the button doesn't work, paste this link into your browser:<br>${url}</td></tr>
</table></td></tr></table></body></html>`;
  const text = `Hi ${opts.greetingName},\n\n${opts.intro}\n\n${opts.action}: ${opts.url}\n\n${opts.outro}\n`;
  return { html, text };
}
