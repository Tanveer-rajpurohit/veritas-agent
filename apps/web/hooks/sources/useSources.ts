import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sourceService } from "../../service/sources/sourceService";
import { queryKeys } from "../../service/queryKeys";
import type { PageRecord, SourceRecord } from "../../types/source/type";

export function useSources(matterId: string | null | undefined) {
  return useQuery<SourceRecord[], Error>({
    queryKey: matterId ? queryKeys.sources.byMatter(matterId) : ["matters", "null", "sources"],
    queryFn: () => sourceService.listSources(matterId as string),
    enabled: Boolean(matterId),
  });
}

export function useSourcePage(
  sourceId: string | null | undefined,
  pageNumber: number | null | undefined
) {
  return useQuery<PageRecord, Error>({
    queryKey:
      sourceId && pageNumber
        ? queryKeys.sources.page(sourceId, pageNumber)
        : ["sources", "null", "pages", 0],
    queryFn: () => sourceService.getSourcePage(sourceId as string, pageNumber as number),
    enabled: Boolean(sourceId && pageNumber),
  });
}

export function useUploadSource(matterId: string) {
  const queryClient = useQueryClient();

  return useMutation<SourceRecord, Error, { file: File; isSynthetic?: boolean }>({
    mutationFn: ({ file, isSynthetic }) =>
      sourceService.uploadSource(matterId, file, isSynthetic),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sources.byMatter(matterId),
      });
    },
  });
}
