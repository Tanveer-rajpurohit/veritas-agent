import { fetchClient } from "../fetch";
import type { CreateExportPayload, ExportRecord } from "../../types/export/type";

export const exportService = {
  createExport(
    versionId: string,
    payload: CreateExportPayload,
    idempotencyKey?: string
  ): Promise<ExportRecord> {
    const key =
      idempotencyKey || `exp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return fetchClient.post<ExportRecord>(
      `/document-versions/${versionId}/exports`,
      payload,
      {
        headers: {
          "Idempotency-Key": key,
        },
      }
    );
  },

  getExport(exportId: string): Promise<ExportRecord> {
    return fetchClient.get<ExportRecord>(`/exports/${exportId}`);
  },

  downloadExport(exportId: string): Promise<Blob> {
    return fetchClient.get<Blob>(`/exports/${exportId}/download`, {
      responseType: "blob",
    });
  },
};
