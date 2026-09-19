import { fetchClient } from "../fetch";
import type {
  AgentRunRecord,
  ApplyProposalResponse,
  CreateAgentRunPayload,
  RejectProposalResponse,
} from "../../types/agent/type";

export const agentRunService = {
  createRun(
    matterId: string,
    payload: CreateAgentRunPayload,
    idempotencyKey?: string
  ): Promise<AgentRunRecord> {
    const key =
      idempotencyKey || `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return fetchClient.post<AgentRunRecord>(
      `/matters/${matterId}/agent-runs`,
      payload,
      {
        headers: {
          "Idempotency-Key": key,
        },
      }
    );
  },

  getRun(runId: string): Promise<AgentRunRecord> {
    return fetchClient.get<AgentRunRecord>(`/agent-runs/${runId}`);
  },

  getEventsUrl(runId: string): string {
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
    ).replace(/\/+$/, "");
    return `${base}/agent-runs/${runId}/events`;
  },

  applyProposal(
    runId: string,
    idempotencyKey?: string
  ): Promise<ApplyProposalResponse> {
    const key =
      idempotencyKey || `apply-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return fetchClient.post<ApplyProposalResponse>(
      `/agent-runs/${runId}/apply`,
      undefined,
      {
        headers: {
          "Idempotency-Key": key,
        },
      }
    );
  },

  rejectProposal(runId: string): Promise<RejectProposalResponse> {
    return fetchClient.post<RejectProposalResponse>(
      `/agent-runs/${runId}/reject`
    );
  },
};
