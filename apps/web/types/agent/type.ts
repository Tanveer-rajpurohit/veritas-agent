export type AgentName = "main" | "writer" | "citation_reviewer" | "fact_reviewer";

export type AgentAction =
  | "answer"
  | "prepare_working_brief"
  | "revise_working_brief"
  | "review_facts"
  | "apply_safe_fact_fixes"
  | "review_citations";

export interface CreateAgentRunPayload {
  thread_id: string;
  message_id: string;
  agent: AgentName;
  requested_action: AgentAction;
  document_id?: string;
  document_version_id?: string;
  source_ids?: string[];
}

export interface AgentRunRecord {
  run_id: string;
  status: "queued" | "running" | "completed" | "failed";
  agent: AgentName;
  events_url: string;
  result: Record<string, unknown> | null;
  error_code: string | null;
  created_at: string;
}

export interface ApplyProposalResponse {
  run_id: string;
  proposal_status: "accepted";
  document_id: string;
  document_version_id: string;
}

export interface RejectProposalResponse {
  run_id: string;
  proposal_status: "rejected";
}
