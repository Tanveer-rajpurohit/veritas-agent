"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppSidebar } from "../../components/workspace/app-sidebar";
import { WorkspaceDashboard } from "../../components/workspace/workspace-dashboard";
import { MatterDetailView } from "../../components/workspace/matter-detail-view";
import { ProfileView } from "../../components/workspace/profile-view";
import { CreateMatterModal } from "../../components/workspace/create-matter-modal";
import {
  UploadDocumentModal,
  type EvidenceType,
} from "../../components/workspace/upload-document-modal";
import { SEED_MATTERS } from "../../lib/workspace-data";
import type { Matter } from "../../types/workspace/types";
import { PanelLeftIcon } from "../../components/workspace/workspace-icons";

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matterIdParam = searchParams.get("matterId");

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [matters, setMatters] = useState<Matter[]>(SEED_MATTERS);
  const [selectedMatter, setSelectedMatter] = useState<Matter | null>(() => {
    if (matterIdParam) {
      return SEED_MATTERS.find((m) => m.id === matterIdParam) || null;
    }
    return null;
  });
  const [prevParam, setPrevParam] = useState<string | null>(matterIdParam);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [uploadOpen, setUploadOpen] = useState<boolean>(false);
  const [activeNav, setActiveNav] = useState<string>("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (matterIdParam !== prevParam) {
    setPrevParam(matterIdParam);
    if (matterIdParam) {
      const match = matters.find((m) => m.id === matterIdParam);
      if (match) {
        setSelectedMatter(match);
      }
    }
  }

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
      if (nav === "home" || nav === "profile") {
        setSelectedMatter(null);
      }
    },
    [router],
  );

  const handleSendToAgent = useCallback(
    (item?: { title: string; type: "document" | "draft" }) => {
      if (selectedMatter) {
        const query = item
          ? `?matterId=${selectedMatter.id}&refTitle=${encodeURIComponent(item.title)}&refType=${item.type}`
          : `?matterId=${selectedMatter.id}`;
        router.push(`/agent${query}`);
      } else {
        router.push("/agent");
      }
    },
    [router, selectedMatter],
  );

  const handleOpenMobileNav = useCallback(() => {
    if (collapsed) setCollapsed(false);
    setMobileNavOpen(true);
  }, [collapsed]);

  return (
    <div className="flex h-screen w-full gap-1 overflow-hidden bg-[#eaf0f6] p-1 font-sans text-stone-900 antialiased sm:gap-1.5 sm:p-1.5 select-none">
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
        ) : activeNav === "profile" ? (
          <ProfileView />
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

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[#eaf0f6]">
          <div className="h-6 w-6 rounded-full border-2 border-[#487aa8] border-t-transparent animate-spin" />
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
