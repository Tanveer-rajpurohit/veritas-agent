"use client";

import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {visible ? (
        <path
          d="M17.94 17.94A10.6 10.6 0 0 1 12 19c-5 0-9.27-3.11-11-7.5a17.6 17.6 0 0 1 4.06-4.94M9.9 4.24A9.5 9.5 0 0 1 12 5c5 0 9.27 3.11 11 7.5a17.7 17.7 0 0 1-2.16 3.19M14.12 14.12A3 3 0 1 1 9.88 9.88M2 2l20 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function authInputClassName(
  invalid: boolean,
  withToggle = false,
): string {
  return [
    "auth-input h-11 w-full flex-1 rounded-md border bg-stone-50/50 px-3.5",
    "text-[14px] text-stone-900 outline-none transition-all duration-150",
    "placeholder:text-stone-400 hover:border-stone-300 focus:border-[#487aa8] focus:bg-white focus:ring-2 focus:ring-[#487aa8]/15",
    invalid ? "border-rose-500" : "border-stone-200",
    withToggle ? "pr-11" : "",
  ].join(" ");
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  action?: ReactNode;
}

export function AuthField({
  label,
  error,
  hint,
  action,
  id,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <label
          className="text-xs font-semibold text-stone-700"
          htmlFor={fieldId}
        >
          {label}
        </label>
        {action}
      </div>
      <div className="relative flex">
        <input
          {...props}
          id={fieldId}
          className={authInputClassName(Boolean(error))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
        />
      </div>
      {error ? (
        <p className="m-0 text-xs text-rose-600" id={errorId}>
          {error}
        </p>
      ) : hint ? (
        <p className="m-0 text-xs text-stone-500" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AuthPasswordField({
  label,
  error,
  hint,
  action,
  id,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <label
          className="text-xs font-semibold text-stone-700"
          htmlFor={fieldId}
        >
          {label}
        </label>
        {action}
      </div>
      <div className="relative flex items-center">
        <input
          {...props}
          id={fieldId}
          type={showPassword ? "text" : "password"}
          className={authInputClassName(Boolean(error), true)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 text-stone-400 hover:text-stone-700 focus:outline-none"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          <EyeIcon visible={showPassword} />
        </button>
      </div>
      {error ? (
        <p className="m-0 text-xs text-rose-600" id={errorId}>
          {error}
        </p>
      ) : hint ? (
        <p className="m-0 text-xs text-stone-500" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface SubmitProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pending: boolean;
  pendingLabel: string;
}

export function AuthSubmit({
  pending,
  pendingLabel,
  children,
  ...props
}: SubmitProps) {
  return (
    <button
      {...props}
      type={props.type ?? "submit"}
      className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-md border-0 bg-[#487aa8] hover:bg-[#3d6991] px-6 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      disabled={props.disabled || pending}
    >
      {pending ? (
        <span>{pendingLabel}</span>
      ) : (
        <>
          {children}
          <ArrowIcon />
        </>
      )}
    </button>
  );
}
