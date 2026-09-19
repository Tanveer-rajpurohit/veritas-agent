export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  matters: {
    all: ["matters"] as const,
    detail: (id: string) => ["matters", id] as const,
  },
  documents: {
    byMatter: (matterId: string) => ["matters", matterId, "documents"] as const,
    detail: (documentId: string) => ["documents", documentId] as const,
    versions: (documentId: string) => ["documents", documentId, "versions"] as const,
    version: (versionId: string) => ["document-versions", versionId] as const,
  },
  reviews: {
    findings: (versionId: string) => ["reviews", "findings", versionId] as const,
  },
  agents: {
    run: (runId: string) => ["agents", "runs", runId] as const,
  },
  conversations: {
    threads: (matterId: string) => ["matters", matterId, "threads"] as const,
    messages: (threadId: string) => ["threads", threadId, "messages"] as const,
  },
  sources: {
    byMatter: (matterId: string) => ["matters", matterId, "sources"] as const,
    page: (sourceId: string, pageNo: number) => ["sources", sourceId, "pages", pageNo] as const,
  },
};
