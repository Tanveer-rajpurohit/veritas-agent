"use client";

import { apiError } from "@veritas/shared";

export type UploadOutcome<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

/**
 * XHR rather than fetch: fetch has no upload progress events. The body streams
 * through the same-origin API, which checks and stores it in one request.
 */
export function sendUpload<T>(url: string, file: Blob, onProgress: (loaded: number) => void): { done: Promise<UploadOutcome<T>>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const done = new Promise<UploadOutcome<T>>((resolve) => {
    xhr.open("POST", url);
    xhr.setRequestHeader("content-type", "application/octet-stream");
    xhr.responseType = "text";
    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onerror = () => resolve({ ok: false, status: 0, message: "" });
    xhr.onabort = () => resolve({ ok: false, status: 0, message: "" });
    xhr.onload = () => {
      let json: unknown;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        json = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true, data: json as T });
        return;
      }
      const parsed = apiError.safeParse(json);
      resolve({ ok: false, status: xhr.status, message: parsed.success ? parsed.data.error : "Something went wrong on our side. Please try again." });
    };
    xhr.send(file);
  });
  return { done, abort: () => xhr.abort() };
}
