export interface DocumentRecord {
  id: string;
  matter_id: string;
  title: string;
  current_version_id: string;
  version_no: number;
  content: Record<string, unknown>;
}

export interface DocumentVersionRecord {
  id: string;
  document_id: string;
  version_no: number;
  parent_version_id: string | null;
  content: Record<string, unknown>;
  content_sha256: string;
}

export interface CreateDocumentPayload {
  title: string;
}

export interface UpdateDocumentPayload {
  title: string;
}

export interface SaveVersionPayload {
  base_version_id: string;
  schema_version: number;
  content: Record<string, unknown>;
  change_summary?: string;
}
