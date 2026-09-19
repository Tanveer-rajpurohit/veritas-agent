import { useMutation } from "@tanstack/react-query";
import { exportService } from "../../service/exports/exportService";
import type { CreateExportPayload, ExportRecord } from "../../types/export/type";

export function useCreateExport() {
  return useMutation<
    ExportRecord,
    Error,
    { versionId: string; payload: CreateExportPayload; idempotencyKey?: string }
  >({
    mutationFn: ({ versionId, payload, idempotencyKey }) =>
      exportService.createExport(versionId, payload, idempotencyKey),
  });
}
