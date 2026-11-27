import { z } from "zod";
import { ConnectorError } from "../context";
import { GOOGLE_TIMEOUT_MS } from "./oauth";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
export const THREADS_PAGE_SIZE = 25;
/** Parallel threads.get calls per list request: fast enough, well under Gmail's per-user quota. */
export const THREAD_FETCH_CONCURRENCY = 8;

export type GmailHeader = { name: string; value: string };
export type GmailPart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailPart[];
};

const header = z.object({ name: z.string(), value: z.string() });
const part: z.ZodType<GmailPart> = z.lazy(() =>
  z.object({
    partId: z.string().optional(),
    mimeType: z.string().optional(),
    filename: z.string().optional(),
    headers: z.array(header).optional(),
    body: z.object({ size: z.number().optional(), data: z.string().optional(), attachmentId: z.string().optional() }).optional(),
    parts: z.array(part).optional(),
  }),
);

const message = z.object({
  id: z.string(),
  threadId: z.string(),
  labelIds: z.array(z.string()).default([]),
  snippet: z.string().default(""),
  internalDate: z.string().optional(),
  payload: part.optional(),
});
export type GmailMessage = z.infer<typeof message>;

const thread = z.object({ id: z.string(), messages: z.array(message).default([]) });
export type GmailThread = z.infer<typeof thread>;

const threadList = z.object({
  threads: z.array(z.object({ id: z.string() })).default([]),
  nextPageToken: z.string().optional(),
});
const sendResponse = z.object({ id: z.string(), threadId: z.string() });

/** Short scope a call needs, so a 403 can tell the user which permission is missing. */
type NeededScope = "gmail.readonly" | "gmail.send";

/** Supplies an access token; `rejected` forces a refresh past a token Google returned 401 for. */
export type TokenSource = (rejected?: string) => Promise<string>;

/** Runs `fn` over `items` with at most `limit` in flight, keeping input order. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Google reports a missing scope on 403 as insufficientPermissions / ACCESS_TOKEN_SCOPE_INSUFFICIENT. */
function isScopeError(body: unknown): boolean {
  if (typeof body !== "object" || body === null || !("error" in body)) return false;
  return /insufficientPermissions|ACCESS_TOKEN_SCOPE_INSUFFICIENT/.test(JSON.stringify(body.error));
}

/** An unexpected response shape is Google's problem, not a server crash. */
function expectShape<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ConnectorError("unavailable");
  return parsed.data;
}

/** Typed Gmail REST client over fetch. Errors surface as ConnectorError only. */
export function createGmailClient(fetchImpl: typeof fetch, tokens: TokenSource) {
  async function call(path: string, scope: NeededScope, init: RequestInit = {}): Promise<unknown> {
    const send = async (token: string) => {
      try {
        return await fetchImpl(`${GMAIL_API}${path}`, {
          ...init,
          headers: { ...init.headers, authorization: `Bearer ${token}`, accept: "application/json" },
          signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
        });
      } catch {
        throw new ConnectorError("unavailable");
      }
    };

    const token = await tokens();
    let res = await send(token);
    // One refresh-and-retry: the token may have been revoked or expired early.
    if (res.status === 401) res = await send(await tokens(token));
    if (res.ok) return res.json();

    const body: unknown = await res.json().catch(() => null);
    if (res.status === 401) throw new ConnectorError("needs_reconnect");
    if (res.status === 404) throw new ConnectorError("not_found");
    if (res.status === 403) throw isScopeError(body) ? new ConnectorError("needs_scope", scope) : new ConnectorError("unavailable");
    throw new ConnectorError("unavailable");
  }

  return {
    async listThreads(opts: { label: string; q?: string; pageToken?: string }) {
      const params = new URLSearchParams({ maxResults: String(THREADS_PAGE_SIZE), labelIds: opts.label });
      if (opts.q) params.set("q", opts.q);
      if (opts.pageToken) params.set("pageToken", opts.pageToken);
      return expectShape(threadList, await call(`/threads?${params}`, "gmail.readonly"));
    },

    async getThreadMetadata(id: string) {
      const params = new URLSearchParams({ format: "metadata" });
      for (const name of ["From", "Subject", "Date"]) params.append("metadataHeaders", name);
      return expectShape(thread, await call(`/threads/${encodeURIComponent(id)}?${params}`, "gmail.readonly"));
    },

    async getThread(id: string) {
      return expectShape(thread, await call(`/threads/${encodeURIComponent(id)}?format=full`, "gmail.readonly"));
    },

    async getMessageHeaders(id: string) {
      const params = new URLSearchParams({ format: "metadata" });
      for (const name of ["Message-ID", "References", "Subject"]) params.append("metadataHeaders", name);
      return expectShape(message, await call(`/messages/${encodeURIComponent(id)}?${params}`, "gmail.readonly"));
    },

    async send(raw: string, threadId?: string) {
      const body = JSON.stringify(threadId ? { raw, threadId } : { raw });
      return expectShape(
        sendResponse,
        await call("/messages/send", "gmail.send", { method: "POST", body, headers: { "content-type": "application/json" } }),
      );
    },
  };
}

export type GmailClient = ReturnType<typeof createGmailClient>;
