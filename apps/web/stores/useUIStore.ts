import { create } from "zustand";

export type ReviewFilter =
  | "all"
  | "contradicted"
  | "needs_review"
  | "supported"
  | "unresolved";

interface UIState {
  sidebarOpen: boolean;
  reviewPanelOpen: boolean;
  activeReviewFilter: ReviewFilter;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleReviewPanel: () => void;
  setReviewPanelOpen: (open: boolean) => void;
  setActiveReviewFilter: (filter: ReviewFilter) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  reviewPanelOpen: false,
  activeReviewFilter: "all",

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleReviewPanel: () =>
    set((state) => ({ reviewPanelOpen: !state.reviewPanelOpen })),
  setReviewPanelOpen: (reviewPanelOpen) => set({ reviewPanelOpen }),
  setActiveReviewFilter: (activeReviewFilter) => set({ activeReviewFilter }),
}));
