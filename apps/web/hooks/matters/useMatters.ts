import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matterService } from "../../service/matters/matterService";
import { queryKeys } from "../../service/queryKeys";
import type {
  BackendMatter,
  CreateMatterPayload,
  UpdateMatterPayload,
} from "../../types/matter/type";

export function useMatters() {
  return useQuery<BackendMatter[], Error>({
    queryKey: queryKeys.matters.all,
    queryFn: () => matterService.listMatters(),
  });
}

export function useMatter(matterId: string | null | undefined) {
  return useQuery<BackendMatter, Error>({
    queryKey: matterId ? queryKeys.matters.detail(matterId) : ["matters", "null"],
    queryFn: () => matterService.getMatter(matterId as string),
    enabled: Boolean(matterId),
  });
}

export function useCreateMatter() {
  const queryClient = useQueryClient();

  return useMutation<BackendMatter, Error, CreateMatterPayload>({
    mutationFn: (payload) => matterService.createMatter(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matters.all });
    },
  });
}

export function useUpdateMatter(matterId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    BackendMatter,
    Error,
    { id: string; payload: UpdateMatterPayload }
  >({
    mutationFn: ({ id, payload }) => matterService.updateMatter(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matters.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.matters.detail(variables.id || matterId || ""),
      });
    },
  });
}

export function useDeleteMatter() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => matterService.deleteMatter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matters.all });
    },
  });
}
