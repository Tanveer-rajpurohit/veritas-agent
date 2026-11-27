import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentService } from "../../service/documents/documentService";
import { queryKeys } from "../../service/queryKeys";
import type {
  CreateDocumentPayload,
  DocumentRecord,
  DocumentVersionRecord,
  SaveVersionPayload,
  UpdateDocumentPayload,
} from "../../types/document/type";

export function useDocuments(matterId: string | null | undefined) {
  return useQuery<DocumentRecord[], Error>({
    queryKey: matterId
      ? queryKeys.documents.byMatter(matterId)
      : ["matters", "null", "documents"],
    queryFn: () => documentService.listDocuments(matterId as string),
    enabled: Boolean(matterId),
  });
}

export function useDocument(documentId: string | null | undefined) {
  return useQuery<DocumentRecord, Error>({
    queryKey: documentId
      ? queryKeys.documents.detail(documentId)
      : ["documents", "null"],
    queryFn: () => documentService.getDocument(documentId as string),
    enabled: Boolean(documentId),
  });
}

export function useDocumentVersions(documentId: string | null | undefined) {
  return useQuery<DocumentVersionRecord[], Error>({
    queryKey: documentId
      ? queryKeys.documents.versions(documentId)
      : ["documents", "null", "versions"],
    queryFn: () => documentService.listVersions(documentId as string),
    enabled: Boolean(documentId),
  });
}

export function useDocumentVersion(versionId: string | null | undefined) {
  return useQuery<DocumentVersionRecord, Error>({
    queryKey: versionId
      ? queryKeys.documents.version(versionId)
      : ["document-versions", "null"],
    queryFn: () => documentService.getVersion(versionId as string),
    enabled: Boolean(versionId),
  });
}

export function useCreateDocument(matterId: string) {
  const queryClient = useQueryClient();

  return useMutation<DocumentRecord, Error, CreateDocumentPayload>({
    mutationFn: (payload) => documentService.createDocument(matterId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byMatter(matterId),
      });
    },
  });
}

export function useUpdateDocument(documentId: string, matterId?: string) {
  const queryClient = useQueryClient();

  return useMutation<DocumentRecord, Error, UpdateDocumentPayload>({
    mutationFn: (payload) => documentService.updateDocument(documentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.detail(documentId),
      });
      if (matterId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.documents.byMatter(matterId),
        });
      }
    },
  });
}

export function useDeleteDocument(matterId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (documentId) => documentService.deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byMatter(matterId),
      });
    },
  });
}

export function useSaveVersion(documentId: string, matterId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    DocumentVersionRecord,
    Error,
    { payload: SaveVersionPayload; idempotencyKey?: string }
  >({
    mutationFn: ({ payload, idempotencyKey }) =>
      documentService.saveVersion(documentId, payload, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.detail(documentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.versions(documentId),
      });
      if (matterId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.documents.byMatter(matterId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["reviews", "findings"],
      });
    },
  });
}
