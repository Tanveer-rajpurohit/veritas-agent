export interface ThreadRecord {
  id: string;
  matter_id: string;
  title: string;
  created_at: string;
}

export interface MessageRecord {
  id: string;
  thread_id: string;
  sender: string;
  content: string;
  created_at: string;
}

export interface CreateThreadPayload {
  title?: string;
}

export interface SendMessagePayload {
  content: string;
}
