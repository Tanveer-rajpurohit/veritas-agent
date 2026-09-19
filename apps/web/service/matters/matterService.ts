import { fetchClient } from "../fetch";
import type {
  BackendMatter,
  CreateMatterPayload,
  UpdateMatterPayload,
} from "../../types/matter/type";

export const matterService = {
  listMatters(): Promise<BackendMatter[]> {
    return fetchClient.get<BackendMatter[]>("/matters/");
  },

  getMatter(id: string): Promise<BackendMatter> {
    return fetchClient.get<BackendMatter>(`/matters/${id}`);
  },

  createMatter(payload: CreateMatterPayload): Promise<BackendMatter> {
    return fetchClient.post<BackendMatter>("/matters/", payload);
  },

  updateMatter(id: string, payload: UpdateMatterPayload): Promise<BackendMatter> {
    return fetchClient.patch<BackendMatter>(`/matters/${id}`, payload);
  },

  deleteMatter(id: string): Promise<void> {
    return fetchClient.delete<void>(`/matters/${id}`);
  },
};
