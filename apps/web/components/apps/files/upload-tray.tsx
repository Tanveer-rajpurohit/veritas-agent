"use client";

import { cx } from "@veritas/ui";
import { formatBytes } from "./files-format";
import { uploadPercent, type UploadItem } from "./upload-state";

const ERROR_TITLES: Record<NonNullable<UploadItem["error"]>["kind"], string> = {
  too_large: "Too large",
  blocked: "Not uploaded",
  network: "Upload interrupted",
  storage: "Storage unavailable",
  server: "Upload failed",
};

function statusText(item: UploadItem): string {
  switch (item.status) {
    case "queued":
      return "Waiting";
    case "uploading":
      return `${uploadPercent(item)}% of ${formatBytes(item.size)}`;
    case "done":
      return "Uploaded";
    case "failed":
      return ERROR_TITLES[item.error?.kind ?? "server"];
  }
}

export function UploadTray({
  items,
  onRetry,
  onDismiss,
  onClearFinished,
}: {
  items: UploadItem[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onClearFinished: () => void;
}) {
  if (items.length === 0) return null;
  const active = items.filter((item) => item.status === "queued" || item.status === "uploading").length;
  const hasFinished = items.length > active;

  return (
    <section aria-label="Uploads" className="shrink-0 border-t border-line bg-surface">
      <div className="flex min-h-11 items-center gap-2 px-4">
        <h2 className="text-sm font-semibold" aria-live="polite">
          {active > 0 ? `Uploading ${active} ${active === 1 ? "file" : "files"}` : "Uploads"}
        </h2>
        {hasFinished ? (
          <button
            type="button"
            onClick={onClearFinished}
            className="ml-auto h-11 rounded-lg px-3 text-sm font-semibold text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink @2xl:h-8"
          >
            Clear finished
          </button>
        ) : null}
      </div>
      <ul className="max-h-56 divide-y divide-line overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
              <span className={cx("shrink-0 text-xs tabular-nums", item.status === "failed" ? "font-semibold text-danger" : "text-ink-muted")}>
                {statusText(item)}
              </span>
            </div>
            {item.status === "uploading" || item.status === "queued" ? (
              <div
                role="progressbar"
                aria-label={`Uploading ${item.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadPercent(item)}
                className="h-1 overflow-hidden rounded-full bg-surface-selected"
              >
                <div className="h-full origin-left rounded-full bg-focus transition-transform duration-200 ease-out-soft" style={{ transform: `scaleX(${uploadPercent(item) / 100})` }} />
              </div>
            ) : null}
            {item.status === "failed" && item.error ? (
              <div role="alert" className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 text-sm text-danger">{item.error.message}</p>
                {item.error.canRetry ? (
                  <button
                    type="button"
                    onClick={() => onRetry(item.id)}
                    className="h-11 rounded-lg border border-line-strong bg-surface px-3 text-sm font-semibold transition-colors duration-150 hover:bg-surface-hover @2xl:h-8"
                  >
                    Try again
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDismiss(item.id)}
                  aria-label={`Dismiss ${item.name}`}
                  className="h-11 rounded-lg px-3 text-sm font-semibold text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink @2xl:h-8"
                >
                  Dismiss
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
