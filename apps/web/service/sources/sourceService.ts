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

  getDownloadUrl(sourceId: string): string {
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
    ).replace(/\/+$/, "");
    return `${base}/sources/${sourceId}/download`;
  },
};
