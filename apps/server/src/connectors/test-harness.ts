import { randomBytes, randomUUID } from "node:crypto";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import type { MemberRole } from "@veritas/shared";
import type { SessionUser } from "../auth/guard";
import { mailRoutes } from "../mail/routes";
import type { ConnectorDeps } from "./context";
import { sealTokens } from "./google/tokens";
import { connectorRoutes } from "./routes";
import type { AuditEntry, ConnectorKey, ConnectorRow, ConnectorStore, Kv } from "./store";
import { createVault } from "./vault";

/** Test-only doubles: Postgres, Redis and Google replaced by in-memory fakes. */

export const WEB = "http://localhost:3000";
export const GOOGLE = { clientId: "client-123.apps.googleusercontent.com", clientSecret: "test-secret" };

export function memoryKv(): Kv & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async set(key, value) {
      data.set(key, value);
    },
    async take(key) {
      const v = data.get(key) ?? null;
      data.delete(key);
      return v;
    },
    async acquire(key, token) {
      if (data.has(key)) return false;
      data.set(key, token);
      return true;
    },
    async release(key, token) {
      if (data.get(key) === token) data.delete(key);
    },
  };
}

export function memoryStore(members: Record<string, Record<string, MemberRole>>) {
  const rows: ConnectorRow[] = [];
  const audits: AuditEntry[] = [];
  const same = (r: ConnectorRow, k: ConnectorKey) => r.workspaceId === k.workspaceId && r.userId === k.userId && r.provider === k.provider;
  const store: ConnectorStore = {
    async memberRole(workspaceId, userId) {
      return members[workspaceId]?.[userId] ?? null;
    },
    async find(key) {
      const row = rows.find((r) => same(r, key));
      return row ? { ...row } : null;
    },
    async list(workspaceId, userId) {
      return rows.filter((r) => r.workspaceId === workspaceId && r.userId === userId).map((r) => ({ ...r }));
    },
    async isAccountUsedElsewhere(row) {
      return rows.some((r) => r.id !== row.id && r.userId === row.userId && r.accountEmail === row.accountEmail);
    },
    async connect(key, values, audit) {
      const existing = rows.find((r) => same(r, key));
      if (existing) Object.assign(existing, values, { status: "active" });
      else rows.push({ id: randomUUID(), ...key, ...values, status: "active", createdAt: new Date() });
      audits.push(audit);
    },
    async updateTokens(id, update) {
      Object.assign(rows.find((r) => r.id === id)!, update, { status: "active" });
    },
    async setStatus(id, status) {
      rows.find((r) => r.id === id)!.status = status;
    },
    async disconnect(id, audit) {
      rows.splice(
        rows.findIndex((r) => r.id === id),
        1,
      );
      audits.push(audit);
    },
    async audit(entry) {
      audits.push(entry);
    },
  };
  return { store, rows, audits };
}

export type FakeCall = { method: string; url: URL; body: string; headers: Headers };
export type FakeHandler = (call: FakeCall) => Response | undefined;

/** A fetch that answers from handlers in order and records every call; unknown URLs fail loudly. */
export function fakeFetch(...handlers: FakeHandler[]) {
  const calls: FakeCall[] = [];
  const impl: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const call: FakeCall = {
      method: init?.method ?? "GET",
      url,
      body: typeof init?.body === "string" ? init.body : "",
      headers: new Headers(init?.headers),
    };
    calls.push(call);
    for (const h of handlers) {
      const res = h(call);
      if (res) return res;
    }
    throw new Error(`unexpected request ${call.method} ${url.href}`);
  };
  return { impl, calls };
}

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export function idToken(claims: Record<string, unknown>) {
  const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
  return `${enc({ alg: "RS256" })}.${enc(claims)}.signature`;
}

export function setup(opts: { fetch?: typeof fetch; members?: Record<string, Record<string, MemberRole>>; now?: () => number } = {}) {
  const users = new Map<string, SessionUser>();
  const mem = memoryStore(opts.members ?? {});
  const kv = memoryKv();
  const deps: ConnectorDeps = {
    store: mem.store,
    kv,
    vault: createVault([{ version: 1, kek: randomBytes(32).toString("base64") }]),
    fetch: opts.fetch ?? fakeFetch().impl,
    // Tests pick the caller with an x-test-user header instead of a real session.
    readSession: async (request) => {
      const id = request.headers["x-test-user"];
      return typeof id === "string" ? (users.get(id) ?? null) : null;
    },
    webOrigin: WEB,
    google: GOOGLE,
    now: opts.now ?? Date.now,
  };
  const addUser = (id: string) => users.set(id, { id, name: id, email: `${id}@example.test`, emailVerified: true });

  async function build() {
    const app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(connectorRoutes(deps));
    await app.register(mailRoutes(deps));
    return app;
  }

  /** Inserts a connected Google account directly, as if the OAuth flow had run. */
  async function connect(
    key: ConnectorKey,
    opts2: { scopes: string[]; accessToken?: string; refreshToken?: string; expiresAt?: Date; accountEmail?: string },
  ) {
    await mem.store.connect(
      key,
      {
        ...sealTokens(deps, key, { accessToken: opts2.accessToken ?? "ya29.access-1", refreshToken: opts2.refreshToken ?? "1//refresh-1" }),
        scopes: opts2.scopes,
        expiresAt: opts2.expiresAt ?? new Date(deps.now() + 3600_000),
        accountEmail: opts2.accountEmail ?? "me@gmail.example",
      },
      { workspaceId: key.workspaceId, actorUserId: key.userId, action: "test.seed", target: "google" },
    );
    mem.audits.length = 0;
  }

  return { deps, kv, ...mem, addUser, build, connect };
}
