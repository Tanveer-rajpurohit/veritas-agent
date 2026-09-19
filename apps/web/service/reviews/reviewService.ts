import { fetchClient } from "../fetch";
import type {
  FindingRecord,
  ResolveFindingPayload,
  RunChecksPayload,
} from "../../types/review/type";

export const reviewService = {
  getFindings(versionId: string): Promise<FindingRecord[]> {
    return fetchClient.get<FindingRecord[]>(
      `/document-versions/${versionId}/findings`
    );
  },

  runChecks(
    versionId: string,
    payload: RunChecksPayload = {}
  ): Promise<FindingRecord[]> {
    return fetchClient.post<FindingRecord[]>(
      `/document-versions/${versionId}/checks`,
      payload
    );
  },

  resolveFinding(
    findingId: string,
    payload: ResolveFindingPayload,
    idempotencyKey?: string
  ): Promise<FindingRecord> {
    const key =
      idempotencyKey || `res-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return fetchClient.post<FindingRecord>(
      `/findings/${findingId}/resolutions`,
      payload,
      {
        headers: {
          "Idempotency-Key": key,
        },
      }
    );
  },

  runFactReview(
    matterId: string,
    payload: { document_id: string; mode?: "review_only" | "apply_safe_fixes" }
  ): Promise<Record<string, unknown>> {
    return fetchClient.post<Record<string, unknown>>(
      `/matters/${matterId}/fact-reviews`,
      payload
    );
  },
};
