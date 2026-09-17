"use client";

import { useState, useCallback } from "react";
import { AppSidebar } from "../../components/workspace/app-sidebar";
import { WorkspaceDashboard } from "../../components/workspace/workspace-dashboard";
import { MatterDetailView } from "../../components/workspace/matter-detail-view";
import { CreateMatterModal } from "../../components/workspace/create-matter-modal";
import { UploadDocumentModal, type EvidenceType } from "../../components/workspace/upload-document-modal";
import { SEED_MATTERS } from "../../lib/workspace-data";
import type { Matter } from "../../types/workspace/types";

export default function WorkspacePage() {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [selectedMatter, setSelectedMatter] = useState<Matter | null>(null);
  const [matters, setMatters] = useState<Matter[]>(SEED_MATTERS);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [uploadOpen, setUploadOpen] = useState<boolean>(false);
  const [activeNav, setActiveNav] = useState<string>("home");

  const handleCreateMatter = useCallback((newMatter: Matter) => {
    setMatters((prev) => [newMatter, ...prev]);
    setCreateOpen(false);
  }, []);

  const handleDeleteMatter = useCallback((id: string) => {
    setMatters((prev) => prev.filter((m) => m.id !== id));
    setSelectedMatter((curr: Matter | null) => (curr?.id === id ? null : curr));
  }, []);

  const handleSelectMatter = useCallback((matter: Matter) => {
    setSelectedMatter(matter);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setCreateOpen(true);
  }, []);

  const handleOpenUpload = useCallback(() => {
    setUploadOpen(true);
  }, []);

  const handleUploadDocument = useCallback((data: {
    name: string;
    type: EvidenceType;
    matterId?: string;
    file?: File | null;
  }) => {
    if (data.matterId) {
      setMatters((prev) =>
        prev.map((m) =>
          m.id === data.matterId
            ? { ...m, lastActivity: "Evidence uploaded just now", updatedAt: Date.now() }
            : m
        )
      );
    }
    setUploadOpen(false);
  }, []);

  const handleSelectNav = useCallback((nav: string) => {
    setActiveNav(nav);
    if (nav === "home") {
      setSelectedMatter(null);
    }
  }, []);

  const handleSendToAgent = useCallback(() => {
    setActiveNav("agent");
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#eaf0f6] p-1 sm:p-1.5 gap-1 sm:gap-1.5 font-sans antialiased text-stone-900 select-none">
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleSidebar}
        onOpenCreateMatter={handleOpenCreate}
        onOpenUpload={handleOpenUpload}
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-stone-200/90 bg-white shadow-2xs">
        {activeNav === "agent" ? (
          <div className="flex h-full w-full bg-white" />
        ) : selectedMatter ? (
          <MatterDetailView
            matter={selectedMatter}
            onBack={() => setSelectedMatter(null)}
            onSendToAgent={handleSendToAgent}
          />
        ) : (
          <WorkspaceDashboard
            matters={matters}
            onSelectMatter={handleSelectMatter}
            onOpenCreateMatter={handleOpenCreate}
            onOpenUpload={handleOpenUpload}
            onDeleteMatter={handleDeleteMatter}
          />
        )}
      </main>

      <CreateMatterModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateMatter}
      />

      <UploadDocumentModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUploadDocument}
        matters={matters}
      />
    </div>
  );
}
