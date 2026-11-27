import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// Postgres 18 ships uuidv7(): time-ordered IDs keep B-tree inserts append-only.
const id = () => uuid("id").primaryKey().default(sql`uuidv7()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

export const EMBEDDING_DIMENSIONS = 768;

/* ---------------- Better Auth (plural tables, text ids) ---------------- */

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("accounts_user_id_idx").on(t.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

/* ---------------- Workspaces ---------------- */

export const memberRole = pgEnum("member_role", ["owner", "editor", "viewer"]);

export const workspaces = pgTable("workspaces", {
  id: id(),
  name: text("name").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId] }), index("workspace_members_user_idx").on(t.userId)],
);

export const devices = pgTable("devices", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  name: text("name").notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceRoots = pgTable(
  "workspace_roots",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    // Raw folder paths stay on the device; the server only sees a hash.
    pathHash: text("path_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("workspace_roots_unique").on(t.workspaceId, t.deviceId, t.pathHash)],
);

/* ---------------- Files ---------------- */

export const fileKind = pgEnum("file_kind", ["doc", "sheet", "slides", "pdf", "other"]);
export const fileStorage = pgEnum("file_storage", ["local", "blob", "connector"]);
export const actorKind = pgEnum("actor_kind", ["user", "agent"]);

export const folders = pgTable(
  "folders",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("folders_workspace_idx").on(t.workspaceId, t.parentId)],
);

export const files = pgTable(
  "files",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
    kind: fileKind("kind").notNull(),
    name: text("name").notNull(),
    storage: fileStorage("storage").notNull(),
    storageRef: text("storage_ref").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
    currentVersionId: uuid("current_version_id"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("files_workspace_idx").on(t.workspaceId),
    index("files_workspace_folder_idx").on(t.workspaceId, t.folderId),
  ],
);

export const fileVersions = pgTable(
  "file_versions",
  {
    id: id(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    contentHash: text("content_hash").notNull(),
    snapshotRef: text("snapshot_ref").notNull(),
    author: actorKind("author").notNull(),
    authorUserId: text("author_user_id").references(() => users.id),
    agentRunId: uuid("agent_run_id"),
    // Provenance for AI-made versions (F060): which model, when.
    modelId: text("model_id"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("file_versions_file_version_unique").on(t.fileId, t.versionNo)],
);

export const chunks = pgTable(
  "chunks",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fileVersionId: uuid("file_version_id")
      .notNull()
      .references(() => fileVersions.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    text: text("text").notNull(),
    tsv: tsvector("tsv").generatedAlwaysAs(sql`to_tsvector('english', "text")`),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    locator: jsonb("locator").$type<Record<string, unknown>>().notNull(),
  },
  (t) => [
    index("chunks_workspace_idx").on(t.workspaceId),
    index("chunks_tsv_idx").using("gin", t.tsv),
    index("chunks_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

/* ---------------- Agent ---------------- */

export const runStatus = pgEnum("run_status", [
  "queued",
  "running",
  "awaiting_approval",
  "awaiting_answer",
  "completed",
  "failed",
  "cancelled",
]);

export const agentThreads = pgTable(
  "agent_threads",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    title: text("title").notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("agent_threads_workspace_idx").on(t.workspaceId, t.userId)],
);

export const agentMessages = pgTable(
  "agent_messages",
  {
    id: id(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => agentThreads.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: jsonb("parts").$type<unknown[]>().notNull(),
    runId: uuid("run_id"),
    modelId: text("model_id"),
    createdAt: createdAt(),
  },
  (t) => [index("agent_messages_thread_idx").on(t.threadId, t.createdAt)],
);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => agentThreads.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    modelId: text("model_id").notNull(),
    status: runStatus("status").notNull().default("queued"),
    usage: jsonb("usage").$type<Record<string, number>>(),
    errorCode: text("error_code"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("agent_runs_thread_idx").on(t.threadId), index("agent_runs_workspace_status_idx").on(t.workspaceId, t.status)],
);

export const agentEvents = pgTable(
  "agent_events",
  {
    runId: uuid("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.runId, t.seq] })],
);

export const decisionStatus = pgEnum("decision_status", ["pending", "approved", "denied", "answered"]);

export const toolApprovals = pgTable(
  "tool_approvals",
  {
    id: id(),
    runId: uuid("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    toolCallId: text("tool_call_id").notNull(),
    tool: text("tool").notNull(),
    args: jsonb("args").$type<Record<string, unknown>>().notNull(),
    status: decisionStatus("status").notNull().default("pending"),
    decidedBy: text("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("tool_approvals_run_idx").on(t.runId)],
);

export const agentQuestions = pgTable(
  "agent_questions",
  {
    id: id(),
    runId: uuid("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    toolCallId: text("tool_call_id").notNull(),
    questions: jsonb("questions").$type<unknown[]>().notNull(),
    answers: jsonb("answers").$type<Record<string, string>>(),
    status: decisionStatus("status").notNull().default("pending"),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("agent_questions_run_idx").on(t.runId)],
);

export const findingStatus = pgEnum("finding_status", [
  "supported",
  "contradicted",
  "unresolved",
  "needs_review",
  "stale",
  "resolved",
]);

export const findings = pgTable(
  "findings",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fileVersionId: uuid("file_version_id")
      .notNull()
      .references(() => fileVersions.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    claimHash: text("claim_hash").notNull(),
    claimText: text("claim_text").notNull(),
    status: findingStatus("status").notNull(),
    evidence: jsonb("evidence").$type<unknown[]>().notNull(),
    method: text("method").notNull(),
    limitations: text("limitations"),
    agentRunId: uuid("agent_run_id"),
    modelId: text("model_id"),
    createdAt: createdAt(),
  },
  (t) => [index("findings_version_idx").on(t.fileVersionId), index("findings_workspace_idx").on(t.workspaceId)],
);

/* ---------------- Connectors, settings, audit ---------------- */

export const connectorStatus = pgEnum("connector_status", ["active", "needs_reconnect"]);

export const connectors = pgTable(
  "connectors",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    scopes: text("scopes").array().notNull(),
    /** Provider account the tokens belong to; may differ from the sign-in email. */
    accountEmail: text("account_email"),
    status: connectorStatus("status").notNull().default("active"),
    /** Vault envelope (key version + AES-256-GCM ciphertext + tag) of the token JSON. */
    tokenCiphertext: text("token_ciphertext").notNull(),
    tokenIv: text("token_iv").notNull(),
    /** Access-token expiry. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("connectors_unique").on(t.workspaceId, t.userId, t.provider)],
);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  defaultModel: text("default_model"),
  defaultMode: text("default_mode").notNull().default("general"),
  theme: text("theme").notNull().default("system"),
  ui: jsonb("ui").$type<Record<string, unknown>>().notNull().default({}),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actor: actorKind("actor").notNull(),
    actorUserId: text("actor_user_id"),
    agentRunId: uuid("agent_run_id"),
    action: text("action").notNull(),
    target: text("target").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("audit_log_workspace_idx").on(t.workspaceId, t.at)],
);
