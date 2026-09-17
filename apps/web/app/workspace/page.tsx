"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "../../components/workspace/app-sidebar";
import { WorkspaceDashboard } from "../../components/workspace/workspace-dashboard";
import { MatterDetailView } from "../../components/workspace/matter-detail-view";
import { CreateMatterModal } from "../../components/workspace/create-matter-modal";
import {
  UploadDocumentModal,
  type EvidenceType,
} from "../../components/workspace/upload-document-modal";
import { SEED_MATTERS } from "../../lib/workspace-data";
import type { Matter } from "../../types/workspace/types";
import { PanelLeftIcon } from "../../components/workspace/workspace-icons";

export default function WorkspacePage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [selectedMatter, setSelectedMatter] = useState<Matter | null>(null);
  const [matters, setMatters] = useState<Matter[]>(SEED_MATTERS);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [uploadOpen, setUploadOpen] = useState<boolean>(false);
  const [activeNav, setActiveNav] = useState<string>("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
    setMobileNavOpen(false);
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

  const handleUploadDocument = useCallback(
    (data: {
      name: string;
      type: EvidenceType;
      matterId?: string;
      file?: File | null;
    }) => {
      if (data.matterId) {
        setMatters((prev) =>
          prev.map((m) =>
            m.id === data.matterId
              ? {
                  ...m,
                  lastActivity: "Evidence uploaded just now",
                  updatedAt: Date.now(),
                }
              : m,
          ),
        );
      }
      setUploadOpen(false);
    },
    [],
  );

  const handleSelectNav = useCallback(
    (nav: string) => {
      setMobileNavOpen(false);
      if (nav === "agent") {
        router.push("/agent");
        return;
      }

      setActiveNav(nav);
      if (nav === "home") {
        setSelectedMatter(null);
      }
    },
    [router],
  );

  const handleSendToAgent = useCallback(() => {
    router.push("/agent");
  }, [router]);

  const handleOpenMobileNav = useCallback(() => {
    if (collapsed) setCollapsed(false);
    setMobileNavOpen(true);
  }, [collapsed]);

  return (
    <div className="flex h-screen w-full gap-1 overflow-hidden bg-[#eaf0f6] p-1 font-sans text-stone-900 antialiased sm:gap-1.5 sm:p-1.5">
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleSidebar}
        onOpenCreateMatter={handleOpenCreate}
        onOpenUpload={handleOpenUpload}
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <button
        type="button"
        onClick={handleOpenMobileNav}
        aria-label="Open workspace navigation"
        className="fixed top-3 left-3 z-40 flex h-9 w-9 items-center justify-center rounded-md border border-[#cbe0f2] bg-white text-[#487aa8] shadow-sm transition-colors hover:bg-[#edf4fa] focus-visible:ring-2 focus-visible:ring-[#487aa8] focus-visible:outline-none md:hidden"
      >
        <PanelLeftIcon size={17} />
      </button>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-stone-200/90 bg-white pt-11 shadow-2xs md:pt-0">
        {selectedMatter ? (
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
