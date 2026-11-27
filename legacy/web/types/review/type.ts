export interface FindingEvidenceItem {
  evidence_span_id: string;
  source_version_id: string;
  page_number: number;
  text: string;
  relation: string;
  source_title: string;
  source_url: string | null;
  source_url_verified: boolean;
}

export type FindingStatus =
  | "supported"
  | "needs_review"
  | "contradicted"
  | "unresolved"
  | "stale";

export interface FindingRecord {
  id: string;
  claim_id: string | null;
  document_version_id: string;
  block_index: number;
  claim_text: string;
  claim_sha256: string;
  dimension: string;
  status: FindingStatus;
  method: string;
  reason: string;
  limitations: string[];
  checked_at: string;
  stale_at: string | null;
  evidence: FindingEvidenceItem[];
  resolution: string | null;
}

export interface RunChecksPayload {
  checks?: string[];
  mode?: "review_only" | "apply_safe_fixes";
}

export interface ResolveFindingPayload {
  action: "resolve" | "dismiss" | "ignore" | "accepted" | "rejected";
  reason?: string;
}
