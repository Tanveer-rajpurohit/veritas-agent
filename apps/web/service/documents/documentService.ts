import { fetchClient } from "../fetch";
import type {
  CreateDocumentPayload,
  DocumentRecord,
  DocumentVersionRecord,
  SaveVersionPayload,
  UpdateDocumentPayload,
} from "../../types/document/type";

export const documentService = {
  listDocuments(matterId: string): Promise<DocumentRecord[]> {
    return fetchClient.get<DocumentRecord[]>(`/matters/${matterId}/documents`);
  },

  getDocument(documentId: string): Promise<DocumentRecord> {
    return fetchClient.get<DocumentRecord>(`/documents/${documentId}`);
  },

  createDocument(
    matterId: string,
    payload: CreateDocumentPayload
  ): Promise<DocumentRecord> {
    return fetchClient.post<DocumentRecord>(
      `/matters/${matterId}/documents`,
      payload
    );
  },

  updateDocument(
    documentId: string,
    payload: UpdateDocumentPayload
  ): Promise<DocumentRecord> {
    return fetchClient.patch<DocumentRecord>(
      `/documents/${documentId}`,
      payload
    );
  },

  deleteDocument(documentId: string): Promise<void> {
    return fetchClient.delete<void>(`/documents/${documentId}`);
  },

  listVersions(documentId: string): Promise<DocumentVersionRecord[]> {
    return fetchClient.get<DocumentVersionRecord[]>(
      `/documents/${documentId}/versions`
    );
  },

  getVersion(versionId: string): Promise<DocumentVersionRecord> {
    return fetchClient.get<DocumentVersionRecord>(
      `/document-versions/${versionId}`
    );
  },

  saveVersion(
    documentId: string,
    payload: SaveVersionPayload,
    idempotencyKey?: string
  ): Promise<DocumentVersionRecord> {
    const key =
      idempotencyKey || `save-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return fetchClient.post<DocumentVersionRecord>(
      `/documents/${documentId}/versions`,
      payload,
      {
        headers: {
          "Idempotency-Key": key,
        },
      }
    );
  },
};
