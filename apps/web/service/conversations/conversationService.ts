import { fetchClient } from "../fetch";
import type {
  CreateThreadPayload,
  MessageRecord,
  SendMessagePayload,
  ThreadRecord,
} from "../../types/conversation/type";

export const conversationService = {
  listThreads(matterId: string): Promise<ThreadRecord[]> {
    return fetchClient.get<ThreadRecord[]>(`/matters/${matterId}/threads`);
  },

  createThread(
    matterId: string,
    payload: CreateThreadPayload = {}
  ): Promise<ThreadRecord> {
    return fetchClient.post<ThreadRecord>(
      `/matters/${matterId}/threads`,
      payload
    );
  },

  listMessages(threadId: string): Promise<MessageRecord[]> {
    return fetchClient.get<MessageRecord[]>(`/threads/${threadId}/messages`);
  },

  sendMessage(
    threadId: string,
    payload: SendMessagePayload
  ): Promise<MessageRecord> {
    return fetchClient.post<MessageRecord>(
      `/threads/${threadId}/messages`,
      payload
    );
  },

  listAllThreads(): Promise<ThreadRecord[]> {
    return fetchClient.get<ThreadRecord[]>("/threads");
  },

  deleteThread(threadId: string): Promise<void> {
    return fetchClient.delete<void>(`/threads/${threadId}`);
  },
};

