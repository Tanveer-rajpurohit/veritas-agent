"use client";

import { useId, useState, type FormEvent } from "react";
import type { AnswerQuestionInput } from "@veritas/shared";
import { Button, cx } from "@veritas/ui";
import type { PendingQuestion } from "./agent-state";

/** Sent as a free-text answer when the user skips a question that accepts one. */
export const SKIP_ANSWER = "No preference. Use your best judgement and say what you assumed.";

type Choice = { kind: "option"; label: string } | { kind: "other" };

type Props = {
  question: PendingQuestion;
  isSubmitting: boolean;
  error: string | null;
  onAnswer: (answer: AnswerQuestionInput) => void;
  /** Questions without a free-text answer can only be skipped by ending the run. */
  onSkip: () => void;
};

/** F059: the agent's clarifying question, as radio options with an optional free-text answer. */
export function QuestionCard({ question, isSubmitting, error, onAnswer, onSkip }: Props) {
  const id = useId();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [otherText, setOtherText] = useState("");
  const isOther = choice?.kind === "other";
  const canSubmit = choice !== null && (!isOther || otherText.trim().length > 0);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting || choice === null) return;
    onAnswer(choice.kind === "other" ? { otherText: otherText.trim() } : { optionLabel: choice.label });
  };

  const skip = () => (question.allowOther ? onAnswer({ otherText: SKIP_ANSWER }) : onSkip());

  return (
    <form onSubmit={submit} aria-labelledby={`${id}-q`} className="flex flex-col gap-4 rounded-xl border border-line-strong bg-surface p-4 shadow-raised">
      <fieldset className="flex flex-col gap-3" disabled={isSubmitting}>
        <legend id={`${id}-q`} className="mb-1 text-sm font-semibold text-ink">
          {question.question}
        </legend>
        {question.options.map((option, i) => (
          <ChoiceRow
            key={option.label}
            id={`${id}-o${i}`}
            name={`${id}-choice`}
            label={option.label}
            description={option.description}
            isChecked={choice?.kind === "option" && choice.label === option.label}
            onSelect={() => setChoice({ kind: "option", label: option.label })}
          />
        ))}
        {question.allowOther ? (
          <>
            <ChoiceRow id={`${id}-other`} name={`${id}-choice`} label="Other" isChecked={isOther} onSelect={() => setChoice({ kind: "other" })} />
            {isOther ? (
              <div className="flex flex-col gap-2 pl-8">
                <label htmlFor={`${id}-other-text`} className="sr-only">
                  Your answer
                </label>
                <textarea
                  id={`${id}-other-text`}
                  autoFocus
                  rows={2}
                  maxLength={2000}
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="Type your answer"
                  className="min-h-11 w-full resize-y rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle hover:border-ink-subtle focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-focus/15 focus-visible:outline-none"
                />
              </div>
            ) : null}
          </>
        ) : null}
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        {question.allowOther ? null : <p className="mr-auto text-xs text-ink-muted">Skipping stops this run.</p>}
        <Button variant="ghost" className="h-11" onClick={skip} disabled={isSubmitting}>
          Skip
        </Button>
        <Button type="submit" className="h-11" disabled={!canSubmit} isLoading={isSubmitting} loadingLabel="Sending">
          Submit
        </Button>
      </div>
    </form>
  );
}

type ChoiceRowProps = {
  id: string;
  name: string;
  label: string;
  description?: string;
  isChecked: boolean;
  onSelect: () => void;
};

function ChoiceRow({ id, name, label, description, isChecked, onSelect }: ChoiceRowProps) {
  return (
    <label
      htmlFor={id}
      className={cx(
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors duration-150 ease-out-soft",
        "has-focus-visible:ring-2 has-focus-visible:ring-focus",
        isChecked ? "border-ink bg-surface-selected" : "border-line hover:bg-surface-hover",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        checked={isChecked}
        onChange={onSelect}
        aria-describedby={description ? `${id}-d` : undefined}
        className="mt-1 size-4 shrink-0 accent-current focus-visible:outline-none"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-ink">{label}</span>
        {description ? (
          <span id={`${id}-d`} className="text-xs text-ink-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
