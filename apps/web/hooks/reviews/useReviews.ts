import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reviewService } from "../../service/reviews/reviewService";
import { queryKeys } from "../../service/queryKeys";
import type {
  FindingRecord,
  ResolveFindingPayload,
  RunChecksPayload,
} from "../../types/review/type";

export function useFindings(versionId: string | null | undefined) {
  return useQuery<FindingRecord[], Error>({
    queryKey: versionId
      ? queryKeys.reviews.findings(versionId)
      : ["reviews", "findings", "null"],
    queryFn: () => reviewService.getFindings(versionId as string),
    enabled: Boolean(versionId),
  });
}

export function useRunChecks(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation<FindingRecord[], Error, RunChecksPayload | undefined>({
    mutationFn: (payload) => reviewService.runChecks(versionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reviews.findings(versionId),
      });
    },
  });
}

export function useResolveFinding(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    FindingRecord,
    Error,
    { findingId: string; payload: ResolveFindingPayload; idempotencyKey?: string }
  >({
    mutationFn: ({ findingId, payload, idempotencyKey }) =>
      reviewService.resolveFinding(findingId, payload, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reviews.findings(versionId),
      });
    },
  });
}
