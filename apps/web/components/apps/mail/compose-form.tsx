"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { MAIL_BODY_MAX, MAIL_SUBJECT_MAX, type SendMailResult } from "@veritas/shared";
import { Button, cx } from "@veritas/ui";
import { apiFetch } from "@/lib/api-client";
import { startGoogleConnect } from "@/lib/google-connector";
import { validateCompose, type ComposeDraft, type ComposeField } from "./mail-format";

type Props = {
  workspaceId: string;
  title: string;
  initialDraft: ComposeDraft;
  /** Present when replying, so Gmail keeps the message in its conversation. */
  reply?: { inReplyToMessageId: string; threadId: string };
  /** False until the user has allowed the gmail.send permission. */
  canSend: boolean;
  onCancel: () => void;
  onSent: () => void;
};

export function ComposeForm({ workspaceId, title, initialDraft, reply, canSend, onCancel, onSent }: Props) {
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<Partial<Record<ComposeField, string>>>({});
  const [formError, setFormError] = useState("");
  const [needsPermission, setNeedsPermission] = useState(!canSend);
  const [isSending, setIsSending] = useState(false);
  const titleId = useId();

  const update = (field: ComposeField) => (value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (needsPermission || isSending) return;
    const validation = validateCompose(draft, reply);
    setFormError("");
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setIsSending(true);
    const result = await apiFetch<SendMailResult>(`/api/v1/workspaces/${workspaceId}/mail/send`, {
      method: "POST",
      body: validation.input,
    });
    setIsSending(false);
    if (result.ok) {
      onSent();
      return;
    }
    // 409 means a missing Google permission (usually gmail.send); the draft stays so nothing is lost.
    if (result.status === 409) setNeedsPermission(true);
    setFormError(result.error.error);
  };

  // Enter in a single-line field would submit the form, which here means sending. Only the Send button sends.
  const blockImplicitSubmit = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
  };

  return (
    <form
      aria-labelledby={titleId}
      onSubmit={onSubmit}
      onKeyDown={blockImplicitSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4"
    >
      <h2 id={titleId} className="text-sm font-semibold">
        {title}
      </h2>

      <div className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line-strong">
        <AddressField label="To" value={draft.to} onChange={update("to")} error={errors.to} autoFocus={!draft.to} />
        <AddressField label="Cc" value={draft.cc} onChange={update("cc")} error={errors.cc} />
        <AddressField label="Subject" value={draft.subject} onChange={update("subject")} error={errors.subject} maxLength={MAIL_SUBJECT_MAX} isPlainText />
      </div>

      <MessageField value={draft.text} onChange={update("text")} error={errors.text} autoFocus={Boolean(draft.to)} />

      {needsPermission ? (
        <div role="status" className="flex flex-col items-start gap-3 rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          <p>
            {formError ||
              "To send from Veritas, Google needs to give it permission to send mail as you. You'll leave this page to allow it, and this draft won't be kept."}
          </p>
          <Button variant="secondary" size="lg" onClick={() => startGoogleConnect(workspaceId, ["gmail", "gmail_send"])}>
            Allow sending
          </Button>
        </div>
      ) : formError ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" size="lg" onClick={onCancel} disabled={isSending}>
          Discard
        </Button>
        {needsPermission ? null : (
          <Button type="submit" size="lg" isLoading={isSending} loadingLabel="Sending…">
            Send
          </Button>
        )}
      </div>
    </form>
  );
}

const fieldInput =
  "min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-subtle focus-visible:outline-none";

function AddressField({
  label,
  value,
  onChange,
  error,
  maxLength,
  autoFocus,
  isPlainText = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength?: number;
  autoFocus?: boolean;
  isPlainText?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col">
      <div className="flex min-h-11 items-center gap-3 px-3 focus-within:ring-2 focus-within:ring-focus focus-within:ring-inset">
        <label htmlFor={id} className="w-14 shrink-0 text-sm text-ink-muted">
          {label}
        </label>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={maxLength}
          autoFocus={autoFocus}
          autoComplete={isPlainText ? "off" : "email"}
          inputMode={isPlainText ? undefined : "email"}
          spellCheck={isPlainText}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cx(fieldInput, "h-11")}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="px-3 pb-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function MessageField({
  value,
  onChange,
  error,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="sr-only">
        Message
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={MAIL_BODY_MAX}
        autoFocus={autoFocus}
        rows={8}
        placeholder="Write your message"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cx(
          "min-h-40 w-full resize-y rounded-lg border bg-surface px-3 py-3 text-sm text-ink placeholder:text-ink-subtle",
          "transition-[border-color,box-shadow] duration-150 ease-out-soft",
          "focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-focus/15 focus-visible:outline-none",
          error ? "border-danger" : "border-line-strong hover:border-ink-subtle",
        )}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
