"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppSidebar } from "../../components/workspace/app-sidebar";
import { CreateMatterModal } from "../../components/workspace/create-matter-modal";
import {
  UploadDocumentModal,
  type EvidenceType,
} from "../../components/workspace/upload-document-modal";
import { SEED_MATTERS } from "../../lib/workspace-data";
import type { Matter } from "../../types/workspace/types";
import { PanelLeftIcon } from "../../components/workspace/workspace-icons";
import { AgentChatView } from "../../components/agent/agent-chat-view";

const SESSIONS_MAP = [
  { id: "chat-1", title: "IBC Sec 7 Financial Debt Claim" },
  { id: "chat-2", title: "Verify Annexure B Default Date" },
  { id: "chat-3", title: "Draft Section 9 Relief Petition" },
  { id: "chat-4", title: "Citation Scan: Innoventive Industries" },
  { id: "chat-5", title: "Fact Check: Ledger Discrepancy" },
];

function AgentClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matterIdParam = searchParams.get("matterId");
  const sessionParam = searchParams.get("c");

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [matters, setMatters] = useState<Matter[]>(SEED_MATTERS);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [uploadOpen, setUploadOpen] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  const handleCreateMatter = useCallback((newMatter: Matter) => {
    setMatters((prev) => [newMatter, ...prev]);
    setCreateOpen(false);
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
      if (nav === "home") {
        router.push("/workspace");
      }
    },
    [router],
  );

  const handleOpenMatter = useCallback(
    (id: string) => {
      router.push(`/workspace?matterId=${id}`);
    },
    [router],
  );

  const handleSelectChatSession = useCallback(
    (titleOrId: string) => {
      const match = SESSIONS_MAP.find(
        (s) => s.id === titleOrId || s.title === titleOrId,
      );
      const targetId = match ? match.id : titleOrId;
      router.push(`/agent?c=${targetId}`);
    },
    [router],
  );

  const handleNewChat = useCallback(() => {
    router.push("/agent");
  }, [router]);

  return (
    <div className="flex h-screen w-full gap-1 overflow-hidden bg-[#eaf0f6] p-1 font-sans text-stone-900 antialiased sm:gap-1.5 sm:p-1.5 select-none">
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleSidebar}
        onOpenCreateMatter={handleOpenCreate}
        onOpenUpload={handleOpenUpload}
        activeNav="agent"
        onSelectNav={handleSelectNav}
        onSelectChatSession={handleSelectChatSession}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open workspace navigation"
        className="fixed top-3 left-3 z-40 flex h-9 w-9 items-center justify-center rounded-md border border-[#cbe0f2] bg-white text-[#487aa8] shadow-sm transition-colors hover:bg-[#edf4fa] focus-visible:ring-2 focus-visible:ring-[#487aa8] focus-visible:outline-none md:hidden"
      >
        <PanelLeftIcon size={17} />
      </button>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-stone-200/90 bg-white pt-11 shadow-2xs md:pt-0">
        <AgentChatView
          key={sessionParam || "new"}
          initialMatterId={matterIdParam}
          sessionId={sessionParam}
          onOpenMatter={handleOpenMatter}
          onSelectChatSession={handleSelectChatSession}
          onNewChat={handleNewChat}
        />
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

export function AgentClientPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[#eaf0f6]">
          <div className="h-6 w-6 rounded-full border-2 border-[#487aa8] border-t-transparent animate-spin" />
        </div>
      }
    >
      <AgentClientContent />
    </Suspense>
  );
}
