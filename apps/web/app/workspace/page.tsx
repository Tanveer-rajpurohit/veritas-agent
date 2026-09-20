"use client";

import { useState, useCallback, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppSidebar } from "../../components/workspace/app-sidebar";
import { WorkspaceDashboard } from "../../components/workspace/workspace-dashboard";
import { MatterDetailView } from "../../components/workspace/matter-detail-view";
import { ProfileView } from "../../components/workspace/profile-view";
import { SettingsView } from "../../components/workspace/settings-view";
import { CreateMatterModal } from "../../components/workspace/create-matter-modal";
import {
  UploadDocumentModal,
  type EvidenceType,
} from "../../components/workspace/upload-document-modal";
import type { Matter } from "../../types/workspace/types";
import { PanelLeftIcon } from "../../components/workspace/workspace-icons";
import { useMatters, useCreateMatter, useDeleteMatter } from "../../hooks/matters/useMatters";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useUploadSource } from "../../hooks/sources/useSources";
import { useThreads, useDeleteThread } from "../../hooks/conversations/useConversations";

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matterIdParam = searchParams.get("matterId");

  const { data: backendMatters } = useMatters();
  const createMatterMutation = useCreateMatter();
  const deleteMatterMutation = useDeleteMatter();
  const uploadSourceMutation = useUploadSource();
  const setActiveMatterId = useWorkspaceStore((s) => s.setActiveMatterId);
  const { data: threads } = useThreads(null);
  const deleteThreadMutation = useDeleteThread();
  const chatSessions = (threads ?? []).map((t) => {
    const linkedMatter = backendMatters?.find((m) => m.id === t.matter_id);
    return {
      id: t.id,
      title: t.title || "Untitled consultation",
      time: new Date(t.created_at).toLocaleDateString("en-IN"),
      matterId: t.matter_id,
      matterName: linkedMatter?.title,
    };
  });

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [updatedActivities, setUpdatedActivities] = useState<
    Record<string, { lastActivity: string; updatedAt: number }>
  >({});

  const matters = useMemo<Matter[]>(() => {
    const backendItems: Matter[] = (backendMatters || []).map((bm) => ({
      id: bm.id,
      name: bm.title,
      caseNumber: bm.case_number || `MATTER-${bm.id.slice(0, 6).toUpperCase()}`,
      court: bm.court || "National Company Law Tribunal",
      stage: (bm.stage as Matter["stage"]) || "Drafting",
      practiceArea: bm.matter_type || "Insolvency (IBC)",
      lastActivity: `Updated ${new Date(bm.updated_at).toLocaleDateString()}`,
      updatedAt: new Date(bm.updated_at).getTime(),
      petitioner: "Petitioner Corp",
      respondent: "Corporate Debtor",
      matterType: (bm.matter_type as Matter["matterType"]) || "Insolvency (IBC)",
      createdDate: new Date(bm.created_at).toLocaleDateString(),
      health: "Healthy",
    }));

    const combined = backendItems;
    const deletedSet = new Set(deletedIds);
    const seen = new Set<string>();
    return combined
      .filter((m) => {
        if (deletedSet.has(m.id)) return false;
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      })
      .map((m) => {
        const override = updatedActivities[m.id];
        return override
          ? { ...m, lastActivity: override.lastActivity, updatedAt: override.updatedAt }
          : m;
      });
  }, [backendMatters, deletedIds, updatedActivities]);

  const [selectedMatter, setSelectedMatter] = useState<Matter | null>(() => {
    return null;
  });
  const currentMatter =
    selectedMatter ??
    (matterIdParam
      ? matters.find((matter) => matter.id === matterIdParam) ?? null
      : null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [uploadOpen, setUploadOpen] = useState<boolean>(false);
  const navParam = searchParams.get("nav");
  const [activeNav, setActiveNav] = useState<string>(
    navParam === "profile" || navParam === "settings" ? navParam : "home",
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleCreateMatter = useCallback(
    async (newMatter: Matter) => {
      await createMatterMutation.mutateAsync({
        title: newMatter.name,
        case_number: newMatter.caseNumber,
        court: newMatter.court,
        matter_type: newMatter.matterType,
        stage: newMatter.stage,
      });
    },
    [createMatterMutation],
  );

  const handleDeleteMatter = useCallback(
    (id: string) => {
      setDeletedIds((prev) => [...prev, id]);
      setSelectedMatter((curr: Matter | null) => (curr?.id === id ? null : curr));
      deleteMatterMutation.mutate(id);
    },
    [deleteMatterMutation],
  );

  const handleSelectMatter = useCallback(
    (matter: Matter) => {
      setSelectedMatter(matter);
      setActiveMatterId(matter.id);
      setMobileNavOpen(false);
    },
    [setActiveMatterId],
  );

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
    async (data: {
      name: string;
      type: EvidenceType;
      matterId?: string;
      file?: File | null;
    }) => {
      if (!data.matterId || !data.file) {
        throw new Error("Select a matter and source file before uploading");
      }
      await uploadSourceMutation.mutateAsync({
        matterId: data.matterId,
        file: data.file,
      });
      if (data.matterId) {
        const now = Date.now();
        setUpdatedActivities((prev) => ({
          ...prev,
          [data.matterId!]: {
            lastActivity: "Evidence uploaded just now",
            updatedAt: now,
          },
        }));
      }
    },
    [uploadSourceMutation],
  );

  const handleSelectNav = useCallback(
    (nav: string) => {
      setMobileNavOpen(false);
      if (nav === "agent") {
        router.push("/agent");
        return;
      }

      setActiveNav(nav);
      if (nav === "home" || nav === "profile" || nav === "settings") {
        setSelectedMatter(null);
        setActiveMatterId(null);
      }
    },
    [router, setActiveMatterId],
  );

  const handleSendToAgent = useCallback(
    (item?: { title: string; type: "document" | "draft" }) => {
      if (currentMatter) {
        const query = item
          ? `?matterId=${currentMatter.id}&refTitle=${encodeURIComponent(item.title)}&refType=${item.type}`
          : `?matterId=${currentMatter.id}`;
        router.push(`/agent${query}`);
      } else {
        router.push("/agent");
      }
    },
    [currentMatter, router],
  );

  const handleSelectChatSession = useCallback(
    (threadId: string) => {
      router.push(`/agent?c=${threadId}`);
    },
    [router],
  );

  const handleDeleteChatSession = useCallback(
    async (threadId: string) => {
      try {
        await deleteThreadMutation.mutateAsync({ threadId });
      } catch {
        void 0;
      }
    },
    [deleteThreadMutation],
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
        chatSessions={chatSessions}
        onSelectChatSession={handleSelectChatSession}
        onDeleteChatSession={handleDeleteChatSession}
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
        {currentMatter ? (
          <MatterDetailView
            matter={currentMatter}
            onBack={() => {
              setSelectedMatter(null);
              setActiveMatterId(null);
            }}
            onSendToAgent={handleSendToAgent}
          />
        ) : activeNav === "profile" ? (
          <ProfileView />
        ) : activeNav === "settings" ? (
          <SettingsView />
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

import { WorkspaceSkeleton } from "../../components/ui/skeleton-loaders";

export default function WorkspacePage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <WorkspaceContent />
    </Suspense>
  );
}
