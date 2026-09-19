import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentRunService } from "../../service/agents/agentRunService";
import { queryKeys } from "../../service/queryKeys";
import type {
  AgentRunRecord,
  ApplyProposalResponse,
  CreateAgentRunPayload,
  RejectProposalResponse,
} from "../../types/agent/type";

export function useAgentRun(runId: string | null | undefined) {
  return useQuery<AgentRunRecord, Error>({
    queryKey: runId ? queryKeys.agents.run(runId) : ["agents", "runs", "null"],
    queryFn: () => agentRunService.getRun(runId as string),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" || status === "queued" ? 2000 : false;
    },
  });
}

export function useCreateAgentRun(matterId: string) {
  return useMutation<
    AgentRunRecord,
    Error,
    { payload: CreateAgentRunPayload; idempotencyKey?: string }
  >({
    mutationFn: ({ payload, idempotencyKey }) =>
      agentRunService.createRun(matterId, payload, idempotencyKey),
  });
}

export function useApplyProposal(documentId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    ApplyProposalResponse,
    Error,
    { runId: string; idempotencyKey?: string }
  >({
    mutationFn: ({ runId, idempotencyKey }) =>
      agentRunService.applyProposal(runId, idempotencyKey),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.run(variables.runId),
      });
      const targetDocId = documentId || data.document_id;
      if (targetDocId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.documents.detail(targetDocId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.documents.versions(targetDocId),
        });
      }
    },
  });
}

export function useRejectProposal() {
  const queryClient = useQueryClient();

  return useMutation<RejectProposalResponse, Error, string>({
    mutationFn: (runId) => agentRunService.rejectProposal(runId),
    onSuccess: (_, runId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.run(runId),
      });
    },
  });
}
