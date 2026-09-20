import { fetchClient } from "../fetch";
import type {
  AgentRunRecord,
  ApplyProposalResponse,
  CreateAgentRunPayload,
  RejectProposalResponse,
} from "../../types/agent/type";

export const agentRunService = {
  async streamGeneralChat(
    message: string,
    onEvent: (event: { type: string; data: Record<string, unknown> }) => void,
  ): Promise<void> {
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
    ).replace(/\/+$/, "");
    const accessToken = localStorage.getItem("veritas_access_token");
    const response = await fetch(`${base}/agent/chat/stream`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ message }),
    });
    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => null) as { detail?: string } | null;
      throw new Error(payload?.detail || "Veritas could not start this conversation.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      for (const block of blocks) {
        let type = "message";
        let rawData = "{}";
        for (const line of block.split("\n")) {
          if (line.startsWith("event: ")) type = line.slice(7);
          if (line.startsWith("data: ")) rawData = line.slice(6);
        }
        const data = JSON.parse(rawData) as Record<string, unknown>;
        onEvent({ type, data });
      }
      if (done) break;
    }
  },

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
