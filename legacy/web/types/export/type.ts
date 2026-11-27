export interface CreateExportPayload {
  format: "pdf" | "json";
  mode?: "draft";
}

export interface ExportRecord {
  id: string;
  document_version_id: string;
  format: "pdf" | "json";
  mode: "draft";
  sha256: string;
  download_url: string;
  created_at: string;
}
