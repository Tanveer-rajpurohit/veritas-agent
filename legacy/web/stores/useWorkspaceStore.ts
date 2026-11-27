import { create } from "zustand";

interface WorkspaceState {
  activeMatterId: string | null;
  activeDocumentId: string | null;
  activeVersionId: string | null;
  activeThreadId: string | null;
  setActiveMatterId: (id: string | null) => void;
  setActiveDocumentId: (id: string | null) => void;
  setActiveVersionId: (id: string | null) => void;
  setActiveThreadId: (id: string | null) => void;
  resetWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeMatterId: null,
  activeDocumentId: null,
  activeVersionId: null,
  activeThreadId: null,

  setActiveMatterId: (activeMatterId) =>
    set({
      activeMatterId,
      activeDocumentId: null,
      activeVersionId: null,
      activeThreadId: null,
    }),

  setActiveDocumentId: (activeDocumentId) =>
    set({ activeDocumentId, activeVersionId: null }),

  setActiveVersionId: (activeVersionId) => set({ activeVersionId }),

  setActiveThreadId: (activeThreadId) => set({ activeThreadId }),

  resetWorkspace: () =>
    set({
      activeMatterId: null,
      activeDocumentId: null,
      activeVersionId: null,
      activeThreadId: null,
    }),
}));
