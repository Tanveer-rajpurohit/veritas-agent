import { fetchClient } from "../fetch";
import type { PageRecord, SourceRecord } from "../../types/source/type";

export const sourceService = {
  uploadSource(
    matterId: string,
    file: File,
    isSynthetic: boolean = false
  ): Promise<SourceRecord> {
    const formData = new FormData();
    formData.append("file", file);
    return fetchClient.post<SourceRecord>(
      `/matters/${matterId}/uploads?is_synthetic=${isSynthetic}`,
      formData
    );
  },

  listSources(matterId: string): Promise<SourceRecord[]> {
    return fetchClient.get<SourceRecord[]>(`/matters/${matterId}/sources`);
  },

  getSource(sourceId: string): Promise<SourceRecord> {
    return fetchClient.get<SourceRecord>(`/sources/${sourceId}`);
  },

  getSourcePage(sourceId: string, pageNumber: number): Promise<PageRecord> {
    return fetchClient.get<PageRecord>(
      `/sources/${sourceId}/pages/${pageNumber}`
    );
  },

  downloadSource(sourceId: string): Promise<Blob> {
    return fetchClient.get<Blob>(`/sources/${sourceId}/download`, {
      responseType: "blob",
    });
  },
};
