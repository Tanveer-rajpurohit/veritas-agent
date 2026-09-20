"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { Matter } from "../../types/workspace/types";
import type { MessageRecord } from "../../types/conversation/type";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  FolderIcon,
  SearchIcon,
  PlusIcon,
  ColoredFileIcon,
  AlertCircleIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ScaleIcon,
  StreamlineFolderUploadIcon,
  StreamlineFileEditIcon,
} from "../workspace/workspace-icons";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../service/queryKeys";
import { ThinkingOrb } from "./thinking-orb";
import { AgentSideViewer, type SideViewerDocument } from "./agent-side-viewer";
import { AgentAvatar } from "./agent-avatar";
import { MarkdownContent } from "./markdown-content";
import { useMessages } from "../../hooks/conversations/useConversations";
import { useAgentRun, useApplyProposal, useRejectProposal } from "../../hooks/agents/useAgentRuns";
import { conversationService } from "../../service/conversations/conversationService";
import { agentRunService } from "../../service/agents/agentRunService";
import { useUploadSource } from "../../hooks/sources/useSources";
import type { AgentAction, AgentName } from "../../types/agent/type";

export type AgentRoleType =
  "orchestrator" | "writer" | "citation_reviewer" | "fact_reviewer";

interface AgentConfig {
  id: AgentRoleType;
  name: string;
  description: string;
  color: string;
  glow: string;
}

const AGENTS: AgentConfig[] = [
  {
    id: "orchestrator",
    name: "Veritas Orchestrator",
    description: "Coordinates research, drafting, and review",
    color: "#487aa8",
    glow: "#dce9f4",
  },
  {
    id: "writer",
    name: "Writer Agent",
    description: "Drafts pleadings and legal documents",
    color: "#487aa8",
    glow: "#dce9f4",
  },
  {
    id: "citation_reviewer",
    name: "Citation Reviewer",
    description: "Checks authorities and quotations",
    color: "#487aa8",
    glow: "#dce9f4",
  },
  {
    id: "fact_reviewer",
    name: "Fact Reviewer",
    description: "Checks dates, amounts, and records",
    color: "#487aa8",
    glow: "#dce9f4",
  },
];

export interface AgentOption {
  id: AgentName;
  role: AgentRoleType;
  name: string;
  label: string;
  badge: string;
  description: string;
  icon: ({ size, className }: { size?: number; className?: string }) => React.JSX.Element;
}

export const SPECIALIZED_AGENTS: AgentOption[] = [
  {
    id: "writer",
    role: "writer",
    name: "Writer Agent",
    label: "Writer Agent",
    badge: "Writer Agent",
    description: "Drafts applications, petitions & legal notices",
    icon: StreamlineFileEditIcon,
  },
  {
    id: "fact_reviewer",
    role: "fact_reviewer",
    name: "Fact Reviewer",
    label: "Fact Reviewer",
    badge: "Fact Reviewer",
    description: "Audits dates, ledger figures & claims against records",
    icon: ShieldCheckIcon,
  },
  {
    id: "citation_reviewer",
    role: "citation_reviewer",
    name: "Citation Reviewer",
    label: "Citation Reviewer",
    badge: "Citation Reviewer",
    description: "Verifies Indian statutes, NCLAT & SC case authorities",
    icon: ScaleIcon,
  },
];

export const AGENT_OPTIONS: AgentOption[] = [
  {
    id: "main",
    role: "orchestrator",
    name: "Veritas Orchestrator",
    label: "Orchestrator",
    badge: "Orchestrator",
    description: "Coordinates research, drafting, and multi-agent review",
    icon: SparklesIcon,
  },
  ...SPECIALIZED_AGENTS,
];

function AgentMark({
  agentId,
  compact = false,
  interactive = false,
}: {
  agentId: AgentRoleType;
  compact?: boolean;
  interactive?: boolean;
}) {
  const agent = AGENTS.find((item) => item.id === agentId) ?? AGENTS[0]!;
  const animationDelay = `${AGENTS.findIndex((item) => item.id === agentId) * -0.7}s`;

  return (
    <AgentAvatar
      color={agent.color}
      glow={agent.glow}
      size={compact ? 19 : 30}
      interactive={interactive}
      animationDelay={animationDelay}
    />
  );
}

interface StepItem {
  id: string;
  label: string;
  status: "done" | "active" | "pending";
}

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentId?: AgentRoleType;
  matterName?: string;
  thinkingStages?: StepItem[];
  thinkingDuration?: string;
  draftArtifact?: SideViewerDocument;
  runId?: string;
  proposalStatus?: string;
}

function mapAgentToRole(agent: string): AgentRoleType {
  const mapping: Record<string, AgentRoleType> = {
    main: "orchestrator",
    writer: "writer",
    citation_reviewer: "citation_reviewer",
    fact_reviewer: "fact_reviewer",
  };
  return mapping[agent] ?? "orchestrator";
}

interface SSEEvent {
  id: string;
  event_type: string;
  label: string;
  status: "done" | "active" | "pending";
  timestamp: number;
}

const SUGGESTIONS = [
  "Draft an IBC Section 7 Application",
  "Audit Ledger & Default Dates in Annexure B",
  "Check Article 137 Limitation Bar & Section 18",
  "Draft Synopsis & Chronological List of Dates",
];

function inferRequestedAction(text: string, agent: AgentName): AgentAction {
  const t = text.toLowerCase();
  if (agent === "main") {
    if (/(draft|prepare|write|create).*(brief|application|petition|synopsis|draft)/.test(t)) {
      return "draft_and_review";
    }
    if (/(review|check|audit|verify|scan).*(citation|authority|case law|quotation|quote)/.test(t)) {
      return "review_citations";
    }
    if (/(fact.check|verify.*(fact|amount|date|ledger|default)|audit.*(ledger|annexure)|discrepancy)/.test(t)) {
      return "review_facts";
    }
    return "answer";
  }
  if (agent === "writer") {
    if (/(revise|amend|update|change|fix|modify|edit)/.test(t)) {
      return "revise_working_brief";
    }
    return "prepare_working_brief";
  }
  if (agent === "fact_reviewer") {
    if (/(apply|fix|auto.fix|correct)/.test(t)) {
      return "apply_safe_fact_fixes";
    }
    return "review_facts";
  }
  if (agent === "citation_reviewer") {
    return "review_citations";
  }
  return "answer";
}

interface AgentChatViewProps {
  matters: Matter[];
  initialMatterId?: string | null;
  initialThreadId?: string | null;
  onOpenMatter?: (matterId: string) => void;
  onSelectChatSession?: (id: string) => void;
  onNewChat?: () => void;
}

export function AgentChatView({
  matters,
  initialMatterId = null,
  initialThreadId = null,
  onOpenMatter,
  onNewChat,
}: AgentChatViewProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(
    initialMatterId,
  );
  const [matterDropdownOpen, setMatterDropdownOpen] = useState(false);
  const [matterSearch, setMatterSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AgentName>("main");

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [sideViewerDoc, setSideViewerDoc] = useState<SideViewerDocument | null>(
    null,
  );
  const [sideViewerOpen, setSideViewerOpen] = useState(false);
  const [sideViewerWidth, setSideViewerWidth] = useState(560);
  const [expandedThinkingMessageId, setExpandedThinkingMessageId] = useState<
    string | null
  >(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId ?? null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<MessageItem[]>([]);
  const [sseStages, setSseStages] = useState<SSEEvent[]>([]);
  const [runError, setRunError] = useState<string | null>(null);

  const { data: threadMessages } = useMessages(activeThreadId);
  const { data: runData } = useAgentRun(activeRunId);
  const applyProposal = useApplyProposal();
  const rejectProposal = useRejectProposal();
  const uploadSource = useUploadSource();
  const queryClient = useQueryClient();

  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const currentMatterId = selectedMatterId;
  const selectedMatter = matters.find((m) => m.id === currentMatterId);

  const filteredMatters = matters.filter(
    (m) =>
      m.name.toLowerCase().includes(matterSearch.toLowerCase()) ||
      m.caseNumber.toLowerCase().includes(matterSearch.toLowerCase()),
  );

  const [lastSyncedThreadKey, setLastSyncedThreadKey] = useState("");
  const latestThreadKey = threadMessages ? threadMessages.map((m) => m.id).join(",") : "";

  useEffect(() => {
    if (!latestThreadKey || latestThreadKey === lastSyncedThreadKey) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deduplication guard to prevent reprocessing
    setLastSyncedThreadKey(latestThreadKey);
    const mapped: MessageItem[] = threadMessages!.map((msg: MessageRecord) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      content: msg.content,
      agentId: msg.role === "assistant" ? ("orchestrator" as AgentRoleType) : undefined,
      matterName: selectedMatter?.name,
    }));
    const pendingIds = new Set(mapped.map((m) => m.id));
    setLocalMessages((prev) => {
      const extras = prev.filter((m) => !pendingIds.has(m.id) && m.id.startsWith("run-"));
      return [...mapped, ...extras];
    });
  }, [latestThreadKey, lastSyncedThreadKey, threadMessages, selectedMatter?.name]);

  useEffect(() => {
    if (!activeRunId) return;
    const eventsUrl = agentRunService.getEventsUrl(activeRunId);
    let lastEventId = "";
    const labelMap: Record<string, string> = {
      "task.queued": "Queuing agent task",
      "task.started": "Agent is working",
      "tool.started": "Running tool",
      "tool.completed": "Tool finished",
      "message.created": "Preparing response",
      "artifact.ready": "Document ready",
      "task.completed": "Completed",
      "task.failed": "Agent failed",
    };
    const handleEvent = (eventType: string, eventId: string, data: string) => {
      if (eventId) {
        lastEventId = eventId;
        try { localStorage.setItem(`veritas-sse:${activeRunId}`, eventId); } catch { void 0; }
      }
      let label = labelMap[eventType] ?? eventType;
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        const toolName = parsed.tool_name ?? parsed.tool;
        if (eventType === "tool.started" && typeof toolName === "string") label = `Running: ${toolName}`;
        if (eventType === "tool.completed" && typeof toolName === "string") label = `Checked: ${toolName}`;
        if (eventType === "task.failed" && typeof parsed.message === "string") setRunError(parsed.message);
      } catch { void 0; }
      setSseStages((prev) => {
        if (eventId && prev.some((s) => s.id === eventId)) return prev;
        return [...prev, { id: eventId || `sse-${Date.now()}-${Math.random()}`, event_type: eventType, label, status: "done" as const, timestamp: Date.now() }];
      });
    };
    const poll = setInterval(() => {
      const accessToken = localStorage.getItem("veritas_access_token");
      fetch(eventsUrl, {
        credentials: "include",
        headers: {
          ...(lastEventId ? { "Last-Event-ID": lastEventId } : {}),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      })
        .then((res) => (res.ok ? res.text() : ""))
        .then((text) => {
          if (!text) return;
          for (const block of text.split("\n\n").filter(Boolean)) {
            let et = "", eid = "", d = "";
            for (const line of block.split("\n")) {
              if (line.startsWith("event: ")) et = line.slice(7);
              if (line.startsWith("id: ")) eid = line.slice(4);
              if (line.startsWith("data: ")) d = line.slice(6);
            }
            if (et) handleEvent(et, eid, d);
          }
        })
        .catch(() => void 0);
    }, 1200);
    return () => clearInterval(poll);
  }, [activeRunId]);

  const [handledRunId, setHandledRunId] = useState<string | null>(null);

  useEffect(() => {
    if (!runData) return;
    if (runData.status !== "completed" && runData.status !== "failed") return;
    if (handledRunId === runData.run_id) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- deduplication guard to prevent reprocessing
    setHandledRunId(runData.run_id);
    setBusy(false);

    if (runData.status === "failed") {
      const resultMsg = (runData.result as { message?: unknown } | null)?.message;
      const raw = runData.error_code ?? (typeof resultMsg === "string" ? resultMsg : null) ?? "The agent could not complete this run.";
      const friendly = /document is required/i.test(String(raw))
        ? "This check needs an open draft. Create or open a draft first, then ask me to review it — or ask me anything general and I'll answer directly."
        : String(raw);
      setRunError(friendly);
      setActiveRunId(null);
      return;
    }

    const result = runData.result as Record<string, unknown> | null;
    const messageText = typeof result?.message === "string" ? result.message : null;
    const proposalStatus = typeof result?.proposal_status === "string" ? result.proposal_status : null;
    const documentId = typeof result?.document_id === "string" ? result.document_id : null;
    const now = Date.now();

    if (messageText) {
      const assistantMsg: MessageItem = {
        id: `run-${runData.run_id}`,
        role: "assistant",
        content: documentId
          ? `${messageText}\n\n[Open the working draft](/drafting/${documentId})`
          : messageText,
        agentId: mapAgentToRole(runData.agent),
        runId: runData.run_id,
        proposalStatus: proposalStatus ?? undefined,
        thinkingStages: sseStages.map((s) => ({
          id: s.id,
          label: s.label,
          status: "done" as const,
        })),
        thinkingDuration: `${((sseStages[sseStages.length - 1]?.timestamp ?? now) - (sseStages[0]?.timestamp ?? now)) / 1000}s`,
      };

      setLocalMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== `run-${runData.run_id}`);
        return [...filtered, assistantMsg];
      });
    } else if (proposalStatus === "pending" && documentId) {
      const proposalMsg: MessageItem = {
        id: `run-${runData.run_id}`,
        role: "assistant",
        content: "I have prepared a document proposal. Review the changes below and accept or reject them.",
        agentId: mapAgentToRole(runData.agent),
        runId: runData.run_id,
        proposalStatus: "pending",
        thinkingStages: sseStages.map((s) => ({
          id: s.id,
          label: s.label,
          status: "done" as const,
        })),
      };
      setLocalMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== `run-${runData.run_id}`);
        return [...filtered, proposalMsg];
      });
    }

    setSseStages([]);
    setActiveRunId(null);
  }, [runData, handledRunId, sseStages]);

  const handleApplyProposal = useCallback(async (runId: string) => {
    try {
      await applyProposal.mutateAsync({ runId });
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.runId === runId ? { ...m, proposalStatus: "accepted" } : m,
        ),
      );
    } catch {
      void 0;
    }
  }, [applyProposal]);

  const handleRejectProposal = useCallback(async (runId: string) => {
    try {
      await rejectProposal.mutateAsync(runId);
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.runId === runId ? { ...m, proposalStatus: "rejected" } : m,
        ),
      );
    } catch {
      void 0;
    }
  }, [rejectProposal]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, busy]);

  const activeAgentConfig =
    AGENT_OPTIONS.find((a) => a.id === selectedAgent) ?? AGENT_OPTIONS[0]!;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy) return;

    setBusy(true);
    setInput("");
    setRunError(null);
    setSseStages([]);

    const userMsg: MessageItem = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      matterName: selectedMatter?.name,
    };
    setLocalMessages((prev) => [...prev, userMsg]);

    try {
      if (!currentMatterId) {
        throw new Error("Select a Matter before starting an evidence-based task.");
      }

      let threadId = activeThreadId;
      if (!threadId) {
        const thread = await conversationService.createThread(currentMatterId, {
          title: text.slice(0, 80),
        });
        threadId = thread.id;
        setActiveThreadId(threadId);
        queryClient.invalidateQueries({ queryKey: ["threads"] });
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.threads(currentMatterId) });
      }

      const message = await conversationService.sendMessage(threadId, {
        content: text,
      });

      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === userMsg.id ? { ...m, id: message.id } : m,
        ),
      );

      const requestedAction = inferRequestedAction(text, selectedAgent);
      const run = await agentRunService.createRun(currentMatterId, {
        thread_id: threadId,
        message_id: message.id,
        agent: selectedAgent,
        requested_action: requestedAction,
        source_ids: selectedSourceIds,
      });

      setActiveRunId(run.run_id);
    } catch (err: unknown) {
      setBusy(false);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message. Check that the backend is running.";
      setRunError(errorMessage);
    }
  };

  const handleReset = () => {
    setActiveThreadId(null);
    setActiveRunId(null);
    setLocalMessages([]);
    setSseStages([]);
    setRunError(null);
    setSelectedSourceIds([]);
    setSideViewerOpen(false);
    setSelectedAgent("main");
    setAddMenuOpen(false);
    setMatterDropdownOpen(false);
    onNewChat?.();
  };

  const handleViewerResizeStart = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (window.innerWidth < 768) return;

    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sideViewerWidth;
    const maximumWidth = Math.min(820, Math.floor(window.innerWidth * 0.68));

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = startWidth + startX - moveEvent.clientX;
      setSideViewerWidth(Math.min(maximumWidth, Math.max(380, nextWidth)));
    };

    const handlePointerUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const [downloading, setDownloading] = useState(false);
  const handleDownloadDraft = async () => {
    if (!sideViewerDoc || downloading) return;
    // Server-generated draft export only — no client-only files.
    const versionId = (sideViewerDoc as unknown as { versionId?: string }).versionId;
    if (!versionId) {
      setRunError("No server version linked to this preview yet. Accept a Writer proposal first.");
      return;
    }
    try {
      setDownloading(true);
      const { exportService } = await import("../../service/exports/exportService");
      const rec = await exportService.createExport(versionId, { format: "pdf", mode: "draft" });
      const blob = await exportService.downloadExport(rec.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sideViewerDoc.title.toLowerCase().replace(/\s+/g, "-")}-draft.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Draft export failed.");
    } finally {
      setDownloading(false);
    }
  };

  const composerElement = (
    <div className="w-full">
      <div className="w-full rounded-xl border border-[#cbe0f2] bg-white shadow-[0_8px_28px_rgba(44,84,120,0.08)] transition-all focus-within:border-[#7fa9cc] focus-within:ring-2 focus-within:ring-[#487aa8]/10">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder={
            busy
              ? "Veritas agent is thinking..."
              : !currentMatterId
                ? "Attach a Matter to start evidence drafting or review..."
                : selectedAgent === "writer"
                  ? "Ask Writer Agent to draft an IBC application, petition, or notice..."
                  : selectedAgent === "fact_reviewer"
                    ? "Ask Fact Reviewer to audit dates, amounts, and ledger claims against evidence..."
                    : selectedAgent === "citation_reviewer"
                      ? "Ask Citation Reviewer to verify statutes, citations, and legal precedents..."
                      : "Ask Veritas to orchestrate research, draft pleadings, or verify evidence..."
          }
          rows={localMessages.length > 0 ? 2 : 4}
          aria-label="Agent prompt"
          className="w-full bg-transparent border-0 px-4 pt-3.5 pb-2 text-[15px] leading-relaxed text-[#16161a] placeholder:text-[#8a8a93] resize-none outline-none min-h-[96px] font-sans"
        />

        <div className="flex items-center justify-between px-3 pb-2.5 pt-1 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !currentMatterId) return;
                try {
                  const source = await uploadSource.mutateAsync({ matterId: currentMatterId, file });
                  setSelectedSourceIds((current) => [...new Set([...current, source.id])]);
                  setInput((prev) => prev || `Review ${file.name}`);
                } catch (error) {
                  setRunError(error instanceof Error ? error.message : "Upload failed.");
                } finally {
                  e.target.value = "";
                }
              }}
            />

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAddMenuOpen((prev) => !prev);
                  setMatterDropdownOpen(false);
                }}
                aria-expanded={addMenuOpen}
                aria-label="Add document or select agent"
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all cursor-pointer shadow-2xs ${
                  addMenuOpen
                    ? "border-[#2c5478] bg-[#edf4fa] text-[#2c5478]"
                    : "border-stone-200 bg-white text-stone-700 hover:bg-[#edf4fa] hover:text-[#2c5478] hover:border-[#cbe0f2]"
                }`}
              >
                <PlusIcon
                  size={15}
                  className={`transition-transform duration-150 ${addMenuOpen ? "rotate-45" : ""}`}
                />
              </button>

              {addMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAddMenuOpen(false)}
                  />
                  <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-stone-200/90 bg-white p-2 shadow-[0_16px_40px_rgba(0,0,0,0.14)] animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
                    <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-stone-400">
                      Add
                    </div>
                    <button
                      type="button"
                      disabled={uploadSource.isPending}
                      onClick={() => {
                        setAddMenuOpen(false);
                        if (!currentMatterId) {
                          setMatterDropdownOpen(true);
                          return;
                        }
                        fileInputRef.current?.click();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[#edf4fa] transition-colors cursor-pointer group"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#edf4fa] text-[#2c5478] group-hover:bg-[#dce9f4]">
                        <StreamlineFolderUploadIcon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-stone-800">
                          Upload document
                        </span>
                        <span className="block text-[10px] text-stone-500 truncate">
                          {currentMatterId
                            ? "Add PDF, filing or evidence to this Matter"
                            : "Select Matter first to upload"}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAddMenuOpen(false);
                        setMatterDropdownOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[#edf4fa] transition-colors cursor-pointer group"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#edf4fa] text-[#2c5478] group-hover:bg-[#dce9f4]">
                        <FolderIcon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-stone-800">
                          Attach Matter
                        </span>
                        <span className="block text-[10px] text-stone-500 truncate">
                          {selectedMatter
                            ? selectedMatter.name
                            : "Select legal matter for evidence"}
                        </span>
                      </div>
                    </button>

                    <div className="my-1.5 border-t border-stone-100" />

                    <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-stone-400">
                      Specialized Agents
                    </div>

                    {SPECIALIZED_AGENTS.map((agent) => {
                      const Icon = agent.icon;
                      const isSelected = selectedAgent === agent.id;
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => {
                            setSelectedAgent((prev) => (prev === agent.id ? "main" : agent.id));
                            setAddMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer ${
                            isSelected ? "bg-[#edf4fa]" : "hover:bg-stone-50"
                          }`}
                        >
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                              isSelected
                                ? "bg-[#2c5478] text-white"
                                : "bg-stone-100 text-stone-600"
                            }`}
                          >
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-xs font-semibold ${
                                  isSelected
                                    ? "text-[#2c5478]"
                                    : "text-stone-800"
                                }`}
                              >
                                {agent.name}
                              </span>
                              {isSelected && (
                                <CheckIcon
                                  size={12}
                                  className="text-[#2c5478] shrink-0"
                                />
                              )}
                            </div>
                            <span className="block text-[10px] text-stone-500 truncate">
                              {agent.description}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMatterDropdownOpen((prev) => !prev);
                  setAddMenuOpen(false);
                }}
                aria-expanded={matterDropdownOpen}
                aria-label="Select Matter"
                className={`flex h-8 max-w-[280px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all cursor-pointer select-none shadow-2xs ${
                  selectedMatter
                    ? "border-[#cbe0f2] bg-[#edf4fa] text-[#2c5478] hover:bg-[#e2edf6]"
                    : "border-stone-200 bg-white text-stone-600 hover:border-[#cbe0f2] hover:bg-[#f7fbfe] hover:text-[#2c5478]"
                }`}
              >
                <FolderIcon
                  size={13}
                  className={selectedMatter ? "text-[#487aa8]" : "text-stone-500"}
                />
                <span className="truncate font-semibold">
                  {selectedMatter ? selectedMatter.name : "Attach Matter"}
                </span>
                {selectedSourceIds.length > 0 && (
                  <span className="rounded-full bg-white px-1.5 py-0.2 text-[10px] font-mono text-[#2c5478]">
                    {selectedSourceIds.length} doc
                  </span>
                )}
                <ChevronDownIcon
                  size={11}
                  className={`shrink-0 text-stone-400 transition-transform duration-150 ${
                    matterDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {matterDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMatterDropdownOpen(false)}
                  />
                  <div className="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-xl border border-stone-200/90 bg-white p-2 shadow-[0_16px_40px_rgba(0,0,0,0.14)] animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
                    <div className="flex items-center gap-2 border-b border-stone-100 px-2 pb-2 pt-1">
                      <SearchIcon size={13} className="text-stone-400 shrink-0" />
                      <input
                        value={matterSearch}
                        onChange={(e) => setMatterSearch(e.target.value)}
                        placeholder="Search matters by name or number..."
                        className="w-full text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none bg-transparent"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMatterId(null);
                          setActiveThreadId(null);
                          setSelectedSourceIds([]);
                          setMatterDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                          selectedMatterId === null
                            ? "bg-[#edf4fa] font-semibold text-[#2c5478]"
                            : "text-stone-700 hover:bg-stone-50"
                        }`}
                      >
                        <div>
                          <span className="block font-medium">General consultation</span>
                          <span className="block text-[10px] text-stone-400">
                            No matter attached
                          </span>
                        </div>
                        {selectedMatterId === null && (
                          <CheckIcon size={12} className="shrink-0 text-[#2c5478]" />
                        )}
                      </button>

                      {filteredMatters.map((matter) => (
                        <button
                          key={matter.id}
                          type="button"
                          onClick={() => {
                            setSelectedMatterId(matter.id);
                            setActiveThreadId(null);
                            setSelectedSourceIds([]);
                            setMatterDropdownOpen(false);
                            setMatterSearch("");
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                            selectedMatterId === matter.id
                              ? "bg-[#edf4fa] font-semibold text-[#2c5478]"
                              : "text-stone-700 hover:bg-stone-50"
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="block truncate font-medium">
                              {matter.name}
                            </span>
                          </div>
                          {selectedMatterId === matter.id && (
                            <CheckIcon size={12} className="shrink-0 text-[#2c5478]" />
                          )}
                        </button>
                      ))}
                      {filteredMatters.length === 0 && (
                        <p className="px-2 py-3 text-center text-xs text-stone-400">
                          No matters found
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedAgent !== "main" && (
              <div className="flex items-center gap-1.5 rounded-full border border-[#cbe0f2] bg-[#edf4fa] px-2.5 py-1 text-xs font-semibold text-[#2c5478] shadow-2xs animate-in fade-in duration-150">
                <activeAgentConfig.icon size={13} className="text-[#2c5478]" />
                <span>{activeAgentConfig.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedAgent("main")}
                  className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-stone-400 hover:bg-[#dce9f4] hover:text-[#2c5478] cursor-pointer transition-colors"
                  aria-label="Remove agent filter"
                  title="Switch back to full orchestration"
                >
                  ✕
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || busy}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer shadow-2xs ${
                !input.trim() || busy
                  ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                  : "bg-[#487aa8] hover:bg-[#38648c] active:bg-[#2c5478] text-white"
              }`}
              aria-label="Send message"
            >
              {busy ? (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <ArrowUpIcon size={14} />
              )}
            </button>
          </div>
        </div>
      </div>

      {localMessages.length === 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-4 text-left">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setInput(suggestion)}
              className="h-8 rounded-md border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition-colors hover:border-[#cbe0f2] hover:bg-[#f7fbfe] hover:text-[#2c5478]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden relative">
      {localMessages.length > 0 && (
        <div className="absolute top-3 left-4 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-stone-200/90 bg-white/95 backdrop-blur-xs px-3 text-xs font-semibold text-stone-600 transition-colors hover:border-[#cbe0f2] hover:bg-[#f7fbfe] hover:text-[#2c5478] shadow-2xs cursor-pointer"
            title="Start new consultation"
          >
            <PlusIcon size={12} />
            <span>New Chat</span>
          </button>
        </div>
      )}

      <div
        className={`flex-1 min-h-0 grid overflow-hidden ${
          sideViewerOpen && sideViewerDoc
            ? "md:grid-cols-[minmax(0,1fr)_var(--viewer-width)]"
            : "grid-cols-[minmax(0,1fr)]"
        }`}
        style={
          sideViewerOpen && sideViewerDoc
            ? ({ "--viewer-width": `${sideViewerWidth}px` } as CSSProperties)
            : undefined
        }
      >
        <section
          className={`flex flex-col h-full min-h-0 overflow-hidden relative ${
            localMessages.length === 0
              ? "items-center justify-center overflow-y-auto"
              : ""
          }`}
        >
          {localMessages.length === 0 ? (
            <div className="w-full max-w-[760px] px-6 py-8">
              <div className="w-full mb-6 text-left">
                <h1 className="m-0 font-serif text-[38px] font-normal tracking-[-0.02em] text-stone-950 md:text-[40px]">
                  Ask Veritas
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500">
                  Draft from your matter documents, verify a citation, or check
                  a fact against the record.
                </p>
              </div>

              <div className="w-full">
                {composerElement}
                <div className="text-left text-[11.5px] text-[#858585] mt-3.5 leading-normal">
                  Veritas cites every claim to an authoritative source you can
                  open. Check important information.
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-14 pb-4">
                <div className="max-w-[760px] mx-auto space-y-6">
                  {localMessages.map((msg) => {
                    const isUser = msg.role === "user";
                    const isExpanded = expandedThinkingMessageId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        className={`w-full flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        {isUser ? (
                          <div className="max-w-[82%] rounded-[12px_12px_4px_12px] border border-[#dce9f4] bg-[#edf4fa] px-4 py-3 text-[13.5px] leading-6 text-stone-800">
                            {msg.content}
                            {msg.matterName && (
                              <div className="mt-1 text-[10.5px] text-stone-500 font-mono">
                                Matter: {msg.matterName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full text-[#2c2c33]">
                            <div className="flex items-center gap-2 mb-2 select-none">
                              <AgentMark
                                agentId={msg.agentId ?? "orchestrator"}
                              />
                              <span className="text-[13px] font-semibold text-stone-900">
                                {AGENTS.find(
                                  (agent) => agent.id === msg.agentId,
                                )?.name ?? "Veritas Orchestrator"}
                              </span>
                            </div>

                            {msg.thinkingStages &&
                              msg.thinkingStages.length > 0 && (
                                <div className="mb-2.5 select-none">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedThinkingMessageId(
                                        isExpanded ? null : msg.id,
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 transition-colors py-0.5 cursor-pointer w-fit"
                                  >
                                    <span>
                                      {msg.thinkingDuration
                                        ? `Activity · ${msg.thinkingDuration}`
                                        : "Working..."}
                                    </span>
                                    <span className="text-stone-400">
                                      {isExpanded ? (
                                        <ChevronDownIcon size={11} />
                                      ) : (
                                        <ChevronRightIcon size={11} />
                                      )}
                                    </span>
                                  </button>

                                  {isExpanded && (
                                    <div className="mt-2 pl-3 ml-1 border-l border-stone-200 space-y-1.5 animate-in fade-in duration-150">
                                      {msg.thinkingStages.map((st) => (
                                        <div
                                          key={st.id}
                                          className="flex items-center gap-2 text-[12px] text-stone-600"
                                        >
                                          {st.status === "done" ? (
                                            <CheckIcon
                                              size={11}
                                              className="text-emerald-600 shrink-0"
                                            />
                                          ) : (
                                            <div className="h-2.5 w-2.5 rounded-full border-2 border-[#487aa8] border-t-transparent animate-spin shrink-0" />
                                          )}
                                          <span>{st.label}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                            <div className="text-[14px] leading-[1.75] text-[#2c2c33]">
                              <MarkdownContent content={msg.content} />
                            </div>

                            {msg.proposalStatus === "pending" && msg.runId && (
                              <div className="mt-3.5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <span className="text-xs font-medium text-amber-800 flex-1">
                                  Writer proposal ready for review
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void handleApplyProposal(msg.runId!)}
                                  disabled={applyProposal.isPending}
                                  className="h-7 px-3 rounded-md bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleRejectProposal(msg.runId!)}
                                  disabled={rejectProposal.isPending}
                                  className="h-7 px-3 rounded-md border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            )}

                            {msg.proposalStatus === "accepted" && (
                              <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                                <CheckIcon size={12} />
                                <span>Proposal accepted — new version created</span>
                              </div>
                            )}

                            {msg.proposalStatus === "rejected" && (
                              <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-500 font-medium">
                                <span>Proposal rejected</span>
                              </div>
                            )}

                            {msg.draftArtifact && (
                              <div
                                onClick={() => {
                                  setSideViewerDoc(msg.draftArtifact!);
                                  setSideViewerOpen(true);
                                }}
                                className="mt-3.5 flex items-center gap-3.5 rounded-xl border border-stone-200 bg-white p-3 shadow-2xs hover:border-[#cbe0f2] hover:shadow-xs transition-all cursor-pointer group"
                              >
                                <ColoredFileIcon
                                  filename={msg.draftArtifact.title}
                                  category="Draft"
                                  size="md"
                                />
                                <div className="min-w-0 flex-1">
                                  <strong className="text-[13px] font-semibold text-stone-900 block truncate group-hover:text-[#2c5478] transition-colors">
                                    {msg.draftArtifact.title}
                                  </strong>
                                  <span className="mt-0.5 block text-[11px] text-stone-500 font-mono">
                                    Document · PDF / DOCX
                                  </span>
                                </div>
                                <div
                                  className="flex items-center gap-1.5 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSideViewerDoc(msg.draftArtifact!);
                                      setSideViewerOpen(true);
                                    }}
                                    className="h-7.5 px-3 rounded-md border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:border-[#cbe0f2] hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer transition-colors shadow-2xs"
                                  >
                                    Open
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleDownloadDraft}
                                    className="h-7.5 w-7.5 flex items-center justify-center rounded-md border border-transparent text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer transition-colors"
                                    aria-label="Download document"
                                    title="Download document"
                                  >
                                    <DownloadIcon size={14} />
                                  </button>
                                </div>
                              </div>
                            )}

                            {msg.content.trim() && (
                              <div className="mt-2.5 flex items-center gap-1.5 select-none">
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyMessage(msg.content, msg.id)
                                }
                                className="inline-flex items-center gap-1.5 h-6 px-2 rounded text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                                aria-label="Copy response"
                              >
                                {copiedMessageId === msg.id ? (
                                  <>
                                    <CheckIcon
                                      size={12}
                                      className="text-emerald-600"
                                    />
                                    <span className="text-[11px] font-medium text-emerald-700">
                                      Copied
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <CopyIcon size={12} />
                                    <span className="text-[11px]">Copy</span>
                                  </>
                                )}
                              </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {busy && (
                    <div className="w-full flex justify-start">
                      <div className="w-full text-[#2c2c33]">
                        <div className="flex items-center gap-2 mb-2">
                          <ThinkingOrb size={18} isThinking={true} />
                          <span className="text-xs text-stone-500">Thinking...</span>
                        </div>
                        {sseStages.length > 0 && (
                          <div className="pl-3 ml-1 border-l border-stone-200 space-y-1.5">
                            {sseStages.map((stage) => (
                              <div
                                key={stage.id}
                                className="flex items-center gap-2 text-[12px] text-stone-600"
                              >
                                {stage.status === "done" ? (
                                  <CheckIcon
                                    size={11}
                                    className="text-emerald-600 shrink-0"
                                  />
                                ) : (
                                  <div className="h-2.5 w-2.5 rounded-full border-2 border-[#487aa8] border-t-transparent animate-spin shrink-0" />
                                )}
                                <span>{stage.label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {runError && !busy && (
                    <div className="w-full flex justify-start">
                      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
                        <AlertCircleIcon size={14} className="text-red-500 shrink-0" />
                        <span>{runError}</span>
                      </div>
                    </div>
                  )}

                  <div ref={conversationEndRef} />
                </div>
              </div>

              <div className="px-6 pb-4 pt-2 bg-gradient-to-b from-transparent to-white shrink-0">
                <div className="max-w-[760px] mx-auto">
                  {composerElement}
                  <div className="text-center text-[11px] text-[#858585] mt-2">
                    Veritas cites every claim to an authoritative source you can
                    open. Check important information.
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {sideViewerOpen && sideViewerDoc && (
          <AgentSideViewer
            document={sideViewerDoc}
            isOpen={sideViewerOpen}
            onClose={() => setSideViewerOpen(false)}
            onResizeStart={handleViewerResizeStart}
            onOpenInEditor={() => {
              if (sideViewerDoc?.id) {
                router.push(`/drafting/${encodeURIComponent(sideViewerDoc.id)}`);
              } else if (onOpenMatter && currentMatterId) {
                onOpenMatter(currentMatterId);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
