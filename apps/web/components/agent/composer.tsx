"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { AgentMode, ContextRef, ModelInfo } from "@veritas/shared";
import { Button, CloseIcon, cx } from "@veritas/ui";
import { chipKey, useAgentContext, type AgentContextChip } from "./agent-context";

export type ModelsState = { status: "loading" } | { status: "ready"; models: ModelInfo[] } | { status: "error"; message: string };

export const MODE_LABELS: Record<AgentMode, string> = {
  general: "General",
  legal: "Legal",
  analyst: "Analyst",
  presenter: "Presenter",
  researcher: "Researcher",
};

const CHIP_KINDS: { kind: ContextRef["kind"]; title: string; empty: string }[] = [
  { kind: "file", title: "Files", empty: "Open a file to list it here." },
  {
    kind: "sheet-range",
    title: "Sheet ranges",
    empty: "Select cells in a sheet to list the range here.",
  },
  { kind: "slide", title: "Slides", empty: "Open a slide to list it here." },
  { kind: "email", title: "Emails", empty: "Open an email to list it here." },
];

const SELECT_CLASS =
  "h-11 max-w-40 min-w-0 truncate rounded-lg border border-transparent bg-transparent px-2 text-sm text-ink-muted transition-colors duration-150 ease-out-soft hover:bg-surface-hover hover:text-ink focus-visible:border-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  isRunning: boolean;
  /** Why sending is blocked right now, shown under the box. Null when the user can send. */
  blockedReason: string | null;
  isSending: boolean;
  isStopping: boolean;
  onSend: (text: string) => Promise<boolean>;
  onStop: () => void;
  models: ModelsState;
  modelId: string | null;
  onModelChange: (modelId: string) => void;
  onRetryModels: () => void;
  mode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
};

export function Composer({
  isRunning,
  blockedReason,
  isSending,
  isStopping,
  onSend,
  onStop,
  models,
  modelId,
  onModelChange,
  onRetryModels,
  mode,
  onModeChange,
}: Props) {
  const id = useId();
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const atButtonRef = useRef<HTMLButtonElement>(null);
  const { chips, offers, add, remove } = useAgentContext();
  const canSend = text.trim().length > 0 && !isRunning && !isSending && blockedReason === null;

  const send = async () => {
    if (!canSend) return;
    if (await onSend(text.trim())) setText("");
  };

  const openMenu = () => {
    const menu = menuRef.current;
    const anchor = atButtonRef.current;
    if (!menu || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    // Opens upward: the composer sits at the bottom of the panel.
    menu.style.left = `${rect.left}px`;
    menu.style.bottom = `${window.innerHeight - rect.top + 4}px`;
    menu.showPopover();
    menu.querySelector<HTMLButtonElement>("button")?.focus();
  };

  const pick = (chip: AgentContextChip) => {
    add(chip);
    menuRef.current?.hidePopover();
    textareaRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
      return;
    }
    // "@" at the start of a word opens the context menu instead of typing, so emails like a@b.com still type normally.
    if (event.key === "@") {
      const el = event.currentTarget;
      const before = el.value.slice(0, el.selectionStart);
      if (before === "" || /\s$/.test(before)) {
        event.preventDefault();
        openMenu();
      }
    }
  };

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-line p-3">
      {chips.length > 0 ? (
        <ul aria-label="Attached context" className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chipKey(chip.ref)}
              className="flex h-8 max-w-full items-center rounded-full border border-line bg-surface-muted pl-3 text-xs font-medium text-ink"
            >
              <span className="truncate font-mono">{chip.label}</span>
              <button
                type="button"
                aria-label={`Remove ${chip.label}`}
                onClick={() => remove(chip.ref)}
                className="ml-1 flex size-8 shrink-0 items-center justify-center rounded-full text-ink-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
              >
                <CloseIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col rounded-xl border border-line-strong bg-surface transition-[border-color,box-shadow] duration-150 ease-out-soft focus-within:border-ink focus-within:ring-4 focus-within:ring-focus/15">
        <label htmlFor={`${id}-input`} className="sr-only">
          Message Veritas
        </label>
        <textarea
          id={`${id}-input`}
          ref={textareaRef}
          rows={2}
          value={text}
          maxLength={20_000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask Veritas"
          aria-describedby={`${id}-hint`}
          className="max-h-48 min-h-16 w-full resize-none bg-transparent px-3 pt-3 text-sm leading-6 text-ink placeholder:text-ink-subtle focus:outline-none"
        />
        <div className="flex items-center gap-1 px-1 pb-1">
          <button
            ref={atButtonRef}
            type="button"
            aria-label="Add context"
            aria-haspopup="dialog"
            onClick={openMenu}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg font-mono text-base text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
          >
            @
          </button>

          <label htmlFor={`${id}-mode`} className="sr-only">
            Mode
          </label>
          <select id={`${id}-mode`} value={mode} onChange={(e) => onModeChange(e.target.value as AgentMode)} className={SELECT_CLASS}>
            {(Object.keys(MODE_LABELS) as AgentMode[]).map((m) => (
              <option key={m} value={m}>
                {MODE_LABELS[m]}
              </option>
            ))}
          </select>

          <ModelPicker id={`${id}-model`} models={models} modelId={modelId} onChange={onModelChange} onRetry={onRetryModels} />

          <div className="ml-auto">
            {isRunning ? (
              <Button variant="secondary" className="h-11" onClick={onStop} isLoading={isStopping} loadingLabel="Stopping">
                Stop
              </Button>
            ) : (
              <Button className="h-11" onClick={() => void send()} disabled={!canSend} isLoading={isSending} loadingLabel="Sending">
                Send
              </Button>
            )}
          </div>
        </div>
      </div>
      <p id={`${id}-hint`} className={cx("text-xs", blockedReason ? "text-ink" : "sr-only")} aria-live="polite">
        {blockedReason ?? "Enter sends. Shift and Enter adds a new line. Type @ to add context."}
      </p>

      <div
        ref={menuRef}
        popover="auto"
        role="dialog"
        aria-label="Add context"
        className="fixed inset-auto m-0 max-h-80 w-72 overflow-y-auto rounded-xl border border-line bg-surface-raised p-2 text-ink shadow-overlay"
      >
        {CHIP_KINDS.map(({ kind, title, empty }) => {
          const items = offers.filter((o) => o.ref.kind === kind);
          return (
            <div key={kind} role="group" aria-label={title} className="flex flex-col py-1">
              <p className="px-2 pb-1 font-mono text-xs tracking-wide text-ink-muted uppercase">{title}</p>
              {items.length === 0 ? (
                <p className="px-2 pb-1 text-xs text-ink-subtle">{empty}</p>
              ) : (
                items.map((offer) => (
                  <button
                    key={chipKey(offer.ref)}
                    type="button"
                    onClick={() => pick(offer)}
                    className="flex min-h-11 items-center rounded-lg px-2 text-left text-sm transition-colors duration-150 hover:bg-surface-hover focus-visible:bg-surface-hover"
                  >
                    <span className="truncate font-mono">{offer.label}</span>
                  </button>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModelPicker({
  id,
  models,
  modelId,
  onChange,
  onRetry,
}: {
  id: string;
  models: ModelsState;
  modelId: string | null;
  onChange: (id: string) => void;
  onRetry: () => void;
}) {
  if (models.status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="h-11 rounded-lg px-2 text-sm text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
      >
        Models unavailable. Retry
      </button>
    );
  }
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Model
      </label>
      <select id={id} value={modelId ?? ""} disabled={models.status === "loading"} onChange={(e) => onChange(e.target.value)} className={SELECT_CLASS}>
        {models.status === "loading" ? (
          <option value="">Loading models</option>
        ) : (
          models.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName}
            </option>
          ))
        )}
      </select>
    </>
  );
}
