import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cx } from "./cx";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  /** Helper text shown under the field when there is no error. */
  hint?: ReactNode;
  error?: string;
  /** Element on the right of the label row, such as a "Forgot password?" link. */
  labelAside?: ReactNode;
};

export function TextField({ label, hint, error, labelAside, className, ...input }: TextFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {labelAside}
      </div>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          "h-12 w-full rounded-lg border bg-surface px-4 text-base text-ink placeholder:text-ink-subtle",
          "transition-[border-color,box-shadow] duration-150 ease-out-soft",
          "focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-focus/15 focus-visible:outline-none",
          error ? "border-danger" : "border-line-strong hover:border-ink-subtle",
        )}
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-2 text-sm text-danger">
          <svg aria-hidden viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0" fill="currentColor">
            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.25 4.5h1.5v4.5h-1.5V4.5Zm0 6h1.5V12h-1.5v-1.5Z" />
          </svg>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
