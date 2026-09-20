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
import type { AgentRunRecord } from "../../types/agent/type";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  FolderKanbanIcon,
  PaperclipIcon,
  SearchIcon,
  PlusIcon,
  ColoredFileIcon,
  AlertCircleIcon,
} from "../workspace/workspace-icons";
import { ThinkingOrb } from "./thinking-orb";
import { AgentSideViewer, type SideViewerDocument } from "./agent-side-viewer";
import { AgentAvatar } from "./agent-avatar";
import { MarkdownContent } from "./markdown-content";
import { useCreateThread, useMessages } from "../../hooks/conversations/useConversations";
import { useCreateAgentRun, useAgentRun, useApplyProposal, useRejectProposal } from "../../hooks/agents/useAgentRuns";
import { conversationService } from "../../service/conversations/conversationService";
import { agentRunService } from "../../service/agents/agentRunService";

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
    color: "#7c5ce5",
    glow: "#eee9ff",
  },
  {
    id: "writer",
    name: "Writer Agent",
    description: "Drafts pleadings and legal documents",
    color: "#2f82bd",
    glow: "#e5f3fc",
  },
  {
    id: "citation_reviewer",
    name: "Citation Reviewer",
    description: "Checks authorities and quotations",
    color: "#5c6fd8",
    glow: "#e9ecff",
  },
  {
    id: "fact_reviewer",
    name: "Fact Reviewer",
    description: "Checks dates, amounts, and records",
    color: "#26a875",
    glow: "#e2f7ee",
  },
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

interface AgentChatViewProps {
  matters: Matter[];
  initialMatterId?: string | null;
  sessionId?: string | null;
  onOpenMatter?: (matterId: string) => void;
  onSelectChatSession?: (id: string) => void;
  onNewChat?: () => void;
}

export function AgentChatView({
  matters,
  initialMatterId = null,
  sessionId = null,
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
  const [sideViewerDoc, setSideViewerDoc] = useState<SideViewerDocument | null>(
    null,
  );
  const [sideViewerOpen, setSideViewerOpen] = useState(false);
  const [sideViewerWidth, setSideViewerWidth] = useState(560);
  const [expandedThinkingMessageId, setExpandedThinkingMessageId] = useState<
    string | null
  >(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<MessageItem[]>([]);
  const [sseStages, setSseStages] = useState<SSEEvent[]>([]);
  const [runError, setRunError] = useState<string | null>(null);

  const { data: threadMessages } = useMessages(activeThreadId);
  const { data: runData } = useAgentRun(activeRunId);
  const applyProposal = useApplyProposal();
  const rejectProposal = useRejectProposal();

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

  useEffect(() => {
    if (!threadMessages || threadMessages.length === 0) return;

    const mapped: MessageItem[] = threadMessages.map((msg: MessageRecord) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      content: msg.content,
      agentId: msg.role === "assistant" ? ("orchestrator" as AgentRoleType) : undefined,
      matterName: selectedMatter?.name,
    }));
    setLocalMessages(mapped);
  }, [threadMessages, selectedMatter?.name]);

  useEffect(() => {
    if (!activeRunId) return;

    const eventsUrl = agentRunService.getEventsUrl(activeRunId);
    let lastEventId = "";

    const poll = () => {
      const headers: Record<string, string> = {};
      if (lastEventId) {
        headers["Last-Event-ID"] = lastEventId;
      }

      fetch(eventsUrl, { credentials: "include", headers })
        .then((res) => {
          if (!res.ok) return;
          return res.text();
        })
        .then((text) => {
          if (!text) return;
          const blocks = text.split("\n\n").filter(Boolean);
          const newStages: SSEEvent[] = [];
          for (const block of blocks) {
            const lines = block.split("\n");
            let eventType = "";
            let eventId = "";
            let data = "";
            for (const line of lines) {
              if (line.startsWith("event: ")) eventType = line.slice(7);
              if (line.startsWith("id: ")) eventId = line.slice(4);
              if (line.startsWith("data: ")) data = line.slice(6);
            }
            if (eventId) lastEventId = eventId;

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

            let label = labelMap[eventType] ?? eventType;
            try {
              const parsed = JSON.parse(data) as Record<string, unknown>;
              if (eventType === "tool.started" && typeof parsed.tool_name === "string") {
                label = `Running: ${parsed.tool_name}`;
              }
              if (eventType === "task.failed" && typeof parsed.message === "string") {
                setRunError(parsed.message);
              }
            } catch {
              void 0;
            }

            newStages.push({
              id: eventId || `sse-${Date.now()}-${Math.random()}`,
              event_type: eventType,
              label,
              status: eventType.includes("completed") || eventType.includes("created") || eventType.includes("ready")
                ? "done"
                : eventType.includes("failed")
                  ? "done"
                  : "active",
              timestamp: Date.now(),
            });
          }
          if (newStages.length > 0) {
            setSseStages((prev) => {
              const existingIds = new Set(prev.map((s) => s.id));
              const unique = newStages.filter((s) => !existingIds.has(s.id));
              return [...prev, ...unique];
            });
          }
        })
        .catch(() => void 0);
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [activeRunId]);

  useEffect(() => {
    if (!runData) return;
    if (runData.status === "completed" || runData.status === "failed") {
      setBusy(false);

      if (runData.status === "failed") {
        setRunError(runData.error_code ?? "The agent could not complete this run.");
        setActiveRunId(null);
        return;
      }

      const result = runData.result as Record<string, unknown> | null;
      const messageText = typeof result?.message === "string" ? result.message : null;
      const proposalStatus = typeof result?.proposal_status === "string" ? result.proposal_status : null;
      const documentId = typeof result?.document_id === "string" ? result.document_id : null;

      if (messageText) {
        const assistantMsg: MessageItem = {
          id: `run-${runData.run_id}`,
          role: "assistant",
          content: messageText,
          agentId: mapAgentToRole(runData.agent),
          runId: runData.run_id,
          proposalStatus: proposalStatus ?? undefined,
          thinkingStages: sseStages.map((s) => ({
            id: s.id,
            label: s.label,
            status: "done" as const,
          })),
          thinkingDuration: `${((sseStages[sseStages.length - 1]?.timestamp ?? Date.now()) - (sseStages[0]?.timestamp ?? Date.now())) / 1000}s`,
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
    }
  }, [runData, sseStages]);

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

  const currentAgent = AGENTS[0]!;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (!currentMatterId) return;

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
      let threadId = activeThreadId;
      if (!threadId) {
        const thread = await conversationService.createThread(currentMatterId, {
          title: text.slice(0, 80),
        });
        threadId = thread.id;
        setActiveThreadId(threadId);
      }

      const message = await conversationService.sendMessage(threadId, {
        content: text,
      });

      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === userMsg.id ? { ...m, id: message.id } : m,
        ),
      );

      const run = await agentRunService.createRun(currentMatterId, {
        thread_id: threadId,
        message_id: message.id,
        agent: "main",
        requested_action: "answer",
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
    setSideViewerOpen(false);
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

  const handleDownloadDraft = () => {
    if (!sideViewerDoc) return;
    const activeVer =
      sideViewerDoc.versions.find(
        (v) => v.version === sideViewerDoc.currentVersion,
      ) || sideViewerDoc.versions[0];
    if (!activeVer) return;

    const content = activeVer.pages
      .map((p) => {
        const secTexts = p.sections
          .map((s) => `${s.title}\n\n${s.content}`)
          .join("\n\n");
        return `[PAGE ${p.pageNumber} OF ${p.totalPdfPages}]\n${p.headerTitle}\n\n${secTexts}`;
      })
      .join("\n\n------------------------------------\n\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sideViewerDoc.title.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
                ? "Select a matter before asking Veritas"
                : "Ask Veritas to draft, check facts, or review citations"
          }
          rows={localMessages.length > 0 ? 2 : 4}
          aria-label="Agent prompt"
          className="w-full bg-transparent border-0 px-4 pt-3.5 pb-2 text-[15px] leading-relaxed text-[#16161a] placeholder:text-[#8a8a93] resize-none outline-none min-h-[96px] font-sans"
        />

        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setInput((prev) =>
                    prev
                      ? `${prev} (Attached: ${e.target.files![0]?.name})`
                      : `Review attached ${e.target.files![0]?.name}`,
                  );
                }
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-7 items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-600 transition-colors hover:border-[#cbe0f2] hover:bg-[#f7fbfe] hover:text-[#2c5478]"
            >
              <PaperclipIcon size={12} className="text-stone-500" />
              <span>Attach</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMatterDropdownOpen(!matterDropdownOpen)}
                className={`flex h-7 max-w-[240px] items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${
                  selectedMatter
                    ? "bg-[#edf4fa] border-[#cbe0f2] text-[#2c5478]"
                    : "border-stone-200 bg-white text-stone-600 hover:border-[#cbe0f2] hover:bg-[#f7fbfe]"
                }`}
              >
                <FolderKanbanIcon
                  size={12}
                  className={
                    selectedMatter ? "text-[#487aa8]" : "text-stone-500"
                  }
                />
                <span className="truncate">
                  {selectedMatter ? selectedMatter.name : "Select Matter"}
                </span>
                <ChevronDownIcon
                  size={11}
                  className="text-stone-400 shrink-0"
                />
              </button>

              {matterDropdownOpen && (
                <div className="absolute bottom-full left-0 z-50 mb-1.5 w-72 rounded-lg border border-[#cbe0f2] bg-white p-1.5 shadow-[0_14px_36px_rgba(44,84,120,0.16)]">
                  <div className="flex items-center gap-1.5 border-b border-stone-100 px-2 py-1.5">
                    <SearchIcon size={12} className="text-stone-400" />
                    <input
                      type="text"
                      value={matterSearch}
                      onChange={(e) => setMatterSearch(e.target.value)}
                      placeholder="Search matters..."
                      className="w-full text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none"
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto py-1">
                    {filteredMatters.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMatterId(m.id);
                          setMatterDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs cursor-pointer ${
                          selectedMatterId === m.id
                            ? "bg-[#edf4fa] text-[#2c5478] font-semibold"
                            : "hover:bg-stone-50 text-stone-700"
                        }`}
                      >
                        <span className="truncate pr-2">{m.name}</span>
                        {selectedMatterId === m.id && (
                          <CheckIcon
                            size={12}
                            className="text-[#487aa8] shrink-0"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || busy || !currentMatterId}
              className={`h-7.5 w-7.5 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                !input.trim() || busy || !currentMatterId
                  ? "bg-[#d8d5cf] text-white cursor-not-allowed"
                  : "bg-[#487aa8] hover:bg-[#38648c] text-white"
              }`}
              aria-label="Send message"
            >
              {busy ? (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <ArrowUpIcon size={13} />
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
      <div className="absolute top-3 left-4 z-30 flex items-center gap-2">
        <div className="inline-flex h-9 items-center gap-2 rounded-full border border-[#cbe0f2] bg-[#f4f8fc] px-3 text-xs font-semibold text-[#244b6d] shadow-2xs">
          <AgentMark agentId={currentAgent.id} compact interactive />
          <span>Veritas</span>
          <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#6383a0]">
            Main Agent
          </span>
        </div>

        {localMessages.length > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 text-[11px] font-semibold text-stone-600 transition-colors hover:border-[#cbe0f2] hover:bg-[#f7fbfe] hover:text-[#2c5478]"
            title="Start new consultation"
          >
            <PlusIcon size={11} />
            <span>New</span>
          </button>
        )}
      </div>

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
