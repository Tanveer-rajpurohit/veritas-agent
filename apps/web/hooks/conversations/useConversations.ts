import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { conversationService } from "../../service/conversations/conversationService";
import { queryKeys } from "../../service/queryKeys";
import type {
  CreateThreadPayload,
  MessageRecord,
  SendMessagePayload,
  ThreadRecord,
} from "../../types/conversation/type";

export function useThreads(matterId?: string | null) {
  return useQuery<ThreadRecord[], Error>({
    queryKey: matterId
      ? queryKeys.conversations.threads(matterId)
      : ["threads", "all"],
    queryFn: () =>
      matterId
        ? conversationService.listThreads(matterId)
        : conversationService.listAllThreads(),
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { threadId: string; matterId?: string }>({
    mutationFn: ({ threadId }) => conversationService.deleteThread(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.some((k) => typeof k === "string" && k.includes("thread")),
      });
    },
  });
}

export function useCreateThread(matterId: string) {
  const queryClient = useQueryClient();

  return useMutation<ThreadRecord, Error, CreateThreadPayload | undefined>({
    mutationFn: (payload) => conversationService.createThread(matterId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.threads(matterId),
      });
    },
  });
}

export function useMessages(threadId: string | null | undefined) {
  return useQuery<MessageRecord[], Error>({
    queryKey: threadId
      ? queryKeys.conversations.messages(threadId)
      : ["threads", "null", "messages"],
    queryFn: () => conversationService.listMessages(threadId as string),
    enabled: Boolean(threadId),
  });
}

export function useSendMessage(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation<MessageRecord, Error, SendMessagePayload>({
    mutationFn: (payload) => conversationService.sendMessage(threadId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.messages(threadId),
      });
    },
  });
}
