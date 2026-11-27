export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="h-11 rounded-lg border border-line-strong bg-surface px-4 font-semibold text-ink transition-colors duration-150 hover:bg-surface-hover"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
