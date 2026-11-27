import { and, auditLog, connectors, eq, ne, sql, type Db } from "@veritas/db";
import type { ConnectorProvider, ConnectorStatus, MemberRole } from "@veritas/shared";
import type { Redis } from "ioredis";
import { memberRoleFor } from "../workspaces/access";

export type ConnectorRow = {
  id: string;
  workspaceId: string;
  userId: string;
  provider: ConnectorProvider;
  scopes: string[];
  accountEmail: string | null;
  status: ConnectorStatus;
  tokenCiphertext: string;
  tokenIv: string;
  expiresAt: Date | null;
  createdAt: Date;
};

export type ConnectorKey = { workspaceId: string; userId: string; provider: ConnectorProvider };
export type TokenUpdate = { tokenCiphertext: string; tokenIv: string; expiresAt: Date; scopes: string[] };
/** Audit rows record what happened, never token or message content. */
export type AuditEntry = { workspaceId: string; actorUserId: string; action: string; target: string; detail?: Record<string, unknown> };

/**
 * Persistence the connector and mail routes need. Kept as a narrow object so
 * route tests can run against an in-memory copy without Postgres.
 */
export type ConnectorStore = {
  memberRole(workspaceId: string, userId: string): Promise<MemberRole | null>;
  find(key: ConnectorKey): Promise<ConnectorRow | null>;
  list(workspaceId: string, userId: string): Promise<ConnectorRow[]>;
  /**
   * Whether the same provider account is connected in another workspace.
   * Google revokes the whole grant, so revoking would break that connection too.
   */
  isAccountUsedElsewhere(row: ConnectorRow): Promise<boolean>;
  /** One connector per workspace + user + provider: reconnecting replaces it. */
  connect(key: ConnectorKey, values: TokenUpdate & { accountEmail: string | null }, audit: AuditEntry): Promise<void>;
  updateTokens(id: string, update: TokenUpdate): Promise<void>;
  setStatus(id: string, status: ConnectorStatus): Promise<void>;
  disconnect(id: string, audit: AuditEntry): Promise<void>;
  audit(entry: AuditEntry): Promise<void>;
};

const toAuditRow = (e: AuditEntry) => ({ ...e, actor: "user" as const });

export function createConnectorStore(db: Db): ConnectorStore {
  const select = {
    id: connectors.id,
    workspaceId: connectors.workspaceId,
    userId: connectors.userId,
    provider: connectors.provider,
    scopes: connectors.scopes,
    accountEmail: connectors.accountEmail,
    status: connectors.status,
    tokenCiphertext: connectors.tokenCiphertext,
    tokenIv: connectors.tokenIv,
    expiresAt: connectors.expiresAt,
    createdAt: connectors.createdAt,
  };
  // `provider` is free text in the table; only rows this server wrote exist, all of them known providers.
  const asRow = (r: Omit<ConnectorRow, "provider"> & { provider: string }) => r as ConnectorRow;

  return {
    memberRole: (workspaceId, userId) => memberRoleFor(db, workspaceId, userId),

    async find({ workspaceId, userId, provider }) {
      const [row] = await db
        .select(select)
        .from(connectors)
        .where(and(eq(connectors.workspaceId, workspaceId), eq(connectors.userId, userId), eq(connectors.provider, provider)))
        .limit(1);
      return row ? asRow(row) : null;
    },

    async list(workspaceId, userId) {
      const rows = await db
        .select(select)
        .from(connectors)
        .where(and(eq(connectors.workspaceId, workspaceId), eq(connectors.userId, userId)));
      return rows.map(asRow);
    },

    async isAccountUsedElsewhere(row) {
      if (!row.accountEmail) return false;
      const [other] = await db
        .select({ id: connectors.id })
        .from(connectors)
        .where(
          and(
            eq(connectors.userId, row.userId),
            eq(connectors.provider, row.provider),
            eq(connectors.accountEmail, row.accountEmail),
            ne(connectors.id, row.id),
          ),
        )
        .limit(1);
      return Boolean(other);
    },

    async connect(key, values, audit) {
      await db.transaction(async (tx) => {
        await tx
          .insert(connectors)
          .values({ ...key, ...values, status: "active" })
          .onConflictDoUpdate({
            target: [connectors.workspaceId, connectors.userId, connectors.provider],
            set: { ...values, status: "active", updatedAt: sql`now()` },
          });
        await tx.insert(auditLog).values(toAuditRow(audit));
      });
    },

    async updateTokens(id, update) {
      await db
        .update(connectors)
        .set({ ...update, status: "active", updatedAt: sql`now()` })
        .where(eq(connectors.id, id));
    },

    async setStatus(id, status) {
      await db.update(connectors).set({ status, updatedAt: sql`now()` }).where(eq(connectors.id, id));
    },

    async disconnect(id, audit) {
      await db.transaction(async (tx) => {
        await tx.delete(connectors).where(eq(connectors.id, id));
        await tx.insert(auditLog).values(toAuditRow(audit));
      });
    },

    async audit(entry) {
      await db.insert(auditLog).values(toAuditRow(entry));
    },
  };
}

/** The few Redis operations the OAuth state, refresh lock and avatar cache use. */
export type Kv = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** Atomic read-and-delete: the value can be used once. */
  take(key: string): Promise<string | null>;
  acquire(key: string, token: string, ttlMs: number): Promise<boolean>;
  release(key: string, token: string): Promise<void>;
};

// Delete only if we still own the lock, so a slow holder can't free someone else's.
const RELEASE_IF_OWNER = `if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) end return 0`;

export function redisKv(redis: Redis): Kv {
  return {
    get: (key) => redis.get(key),
    async set(key, value, ttlSeconds) {
      await redis.set(key, value, "EX", ttlSeconds);
    },
    take: (key) => redis.getdel(key),
    async acquire(key, token, ttlMs) {
      return (await redis.set(key, token, "PX", ttlMs, "NX")) === "OK";
    },
    async release(key, token) {
      await redis.eval(RELEASE_IF_OWNER, 1, key, token);
    },
  };
}
