"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { SEED_MATTERS } from "../../lib/workspace-data";
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
  StreamlineFileTextIcon,
} from "../workspace/workspace-icons";
import { ThinkingOrb } from "./thinking-orb";
import { AgentSideViewer, type SideViewerDocument } from "./agent-side-viewer";
import { AgentAvatar } from "./agent-avatar";
import { MarkdownContent } from "./markdown-content";

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

const SEED_DRAFT_DOC: SideViewerDocument = {
  id: "draft-ibc-sec7",
  title: "IBC Section 7 Application (Form 1)",
  type: "draft",
  matterName: "Arora v. Meridian Estates Pvt. Ltd.",
  court: "National Company Law Tribunal, Principal Bench, New Delhi",
  caseNumber: "ARB.P. 428/2026",
  currentVersion: "v3",
  versions: [
    {
      version: "v3",
      label: "v3 (Verified Precedents & Ledger Audit)",
      date: "Today, 18:42",
      summary:
        "Full quotation parity verified; Annexure B-4 default date anchored.",
      pages: [
        {
          pageNumber: 1,
          totalPdfPages: 2,
          headerTitle: "NCLT PRINCIPAL BENCH, NEW DELHI · CP NO. 428/2026",
          subHeader:
            "BEFORE THE NATIONAL COMPANY LAW TRIBUNAL\nPRINCIPAL BENCH, NEW DELHI\nCOMPANY PETITION NO. ______ / 2026\nIN THE MATTER OF SECTION 7 OF THE INSOLVENCY AND BANKRUPTCY CODE, 2016",
          sections: [
            {
              title:
                "PART I: PARTICULARS OF THE APPLICANT (FINANCIAL CREDITOR)",
              content:
                "1. Name of Financial Creditor: R.K. Arora\n2. Address for correspondence: Barakhamba Road, Connaught Place, New Delhi - 110001\n3. Identification: Permanent Account Number AABCR1234D\n4. Authorized Representative: Adv. Tanveer Singh, Chambers of Veritas Legal, Supreme Court of India.",
            },
            {
              title: "PART II: PARTICULARS OF THE CORPORATE DEBTOR",
              content:
                "1. Name: Meridian Estates Pvt. Ltd.\n2. Identification No.: U45201DL2012PTC239841\n3. Registered Office: 14, Barakhamba Road, Connaught Place, New Delhi 110001\n4. Nominal Share Capital: ₹50,00,00,000/- (Rupees Fifty Crores Only)\n5. Paid-up Share Capital: ₹38,50,00,000/- (Rupees Thirty-Eight Crores Fifty Lakhs Only).",
            },
            {
              title:
                "PART III: PARTICULARS OF PROPOSED INTERIM RESOLUTION PROFESSIONAL",
              content:
                "1. Name of Proposed IRP: Mr. Suresh Chandra Verma\n2. Registration Number: IBBI/IPA-001/IP-P00892/2018-2019/11492\n3. Office Address: 804, World Trade Centre, Babar Road, New Delhi 110001.\n4. Written Consent: Duly executed Form 2 under Regulation 4(2) of IBBI Regulations, 2016 annexed as Annexure A-1.",
            },
          ],
        },
        {
          pageNumber: 2,
          totalPdfPages: 2,
          headerTitle: "PART IV & V · ARORA V. MERIDIAN ESTATES PVT. LTD.",
          sections: [
            {
              title:
                "PART IV: PARTICULARS OF FINANCIAL DEBT AND DEFAULT COMPUTATION",
              content:
                "1. Total Amount Granted: ₹42,80,00,000/- under Senior Secured Facility Agreement dated 12.01.2019.\n2. Amount in Default: ₹42,80,00,000/- Principal plus ₹6,42,00,000/- Penal Interest at 14.50% p.a.\n3. Default Date: 14th August 2021 (Failure to honor Tranche-II amortization milestone).\n4. Limitation Defense (Article 137): Corporate Debtor recognized liability in signed Audited Financial Statements for FY 2021-22 and FY 2022-23 (Annexure B-4), creating fresh period of limitation under Section 18 of Limitation Act, 1963.",
              citations: [
                {
                  title: "Innoventive Industries Ltd. v. ICICI Bank",
                  citation: "(2018) 1 SCC 407",
                  status: "Supported",
                  court: "Supreme Court of India",
                },
                {
                  title:
                    "Asset Reconstruction Company (India) Ltd. v. Bishal Jaiswal",
                  citation: "(2021) 6 SCC 366",
                  status: "Supported",
                  court: "Supreme Court of India",
                },
              ],
            },
            {
              title: "PART V: RELIEFS SOUGHT",
              content:
                "In light of the substantiated debt and default documented herein, the Financial Creditor respectfully prays that this Hon'ble Tribunal may be pleased to:\n\n(a) ADMIT the present Company Petition under Section 7(5)(a) of the Insolvency and Bankruptcy Code, 2016;\n(b) INITIATE Corporate Insolvency Resolution Process (CIRP) in respect of Meridian Estates Pvt. Ltd.;\n(c) DECLARE a moratorium in terms of Section 14 of the Code;\n(d) APPOINT Mr. Suresh Chandra Verma as Interim Resolution Professional (IRP).",
            },
          ],
        },
      ],
    },
    {
      version: "v2",
      label: "v2 (Limitation Section 18 Anchored)",
      date: "Yesterday, 14:10",
      summary:
        "Added Bishal Jaiswal citation for balance sheet debt acknowledgment.",
      pages: [
        {
          pageNumber: 1,
          totalPdfPages: 1,
          headerTitle: "NCLT NEW DELHI · SECTION 7 PETITION",
          sections: [
            {
              title: "PART IV: FINANCIAL DEBT COMPUTATION",
              content:
                "Amount in default: ₹42,80,00,000/-. Default date: 14-Aug-2021. Section 18 limitation defense anchored through balance sheet acknowledgment.",
            },
          ],
        },
      ],
    },
    {
      version: "v1",
      label: "v1 (Initial Filing Draft)",
      date: "14 Sep 2026",
      summary: "Initial petition skeleton generated from loan agreement.",
      pages: [
        {
          pageNumber: 1,
          totalPdfPages: 1,
          headerTitle: "NCLT NEW DELHI · SECTION 7 PETITION",
          sections: [
            {
              title: "PART I: SKELETON",
              content:
                "Initial petition skeleton without balance sheet acknowledgment citations.",
            },
          ],
        },
      ],
    },
  ],
};

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
}

const DEMO_SESSIONS: Record<
  string,
  { title: string; matterId: string; messages: MessageItem[] }
> = {
  "chat-1": {
    title: "IBC Sec 7 Financial Debt Claim",
    matterId: "arora-meridian",
    messages: [
      {
        id: "m-1-1",
        role: "user",
        content:
          "Draft an IBC Section 7 Form 1 Application for Arora v. Meridian Estates Pvt. Ltd. Verify the default date from the Annexure B bank ledger and address the limitation defense under Article 137 using Supreme Court precedents.",
        matterName: "Arora v. Meridian Estates Pvt. Ltd.",
      },
      {
        id: "m-1-2",
        role: "assistant",
        agentId: "orchestrator",
        content:
          "### Form 1 Petition Synthesis & Audit Findings\n\nI have reviewed the matter documents and compiled the **Section 7 Form 1 Application** against Meridian Estates Pvt. Ltd.\n\n- **Default Timestamp**: Verified from Annexure B-4 ledger records on **14th August 2021** (failure to credit Tranche-II milestone repayment).\n- **Quantum in Default**: Principal of ₹42,80,00,000/- plus ₹6,42,00,000/- contractual penal interest at 14.50% per annum (0.00% calculation discrepancy across bank logs).\n- **Limitation Grounds (Article 137 & Section 18)**: While default occurred in August 2021, the Corporate Debtor unequivocally acknowledged liability in its signed Audited Financial Statements for FY 2021-22 and FY 2022-23 (*Asset Reconstruction Co. v. Bishal Jaiswal* (2021) 6 SCC 366).\n- **Threshold Precedent**: *Innoventive Industries Ltd. v. ICICI Bank* (2018) 1 SCC 407 (100% quotation parity; debt and default established).\n\nThe structured Form 1 petition is ready for inspection below.",
        thinkingDuration: "3.4s",
        thinkingStages: [
          {
            id: "s-1-1",
            label: "Verifying Section 7(1) threshold (> ₹1 Crore)",
            status: "done",
          },
          {
            id: "s-1-2",
            label: "Auditing Annexure B-4 ledger transaction logs",
            status: "done",
          },
          {
            id: "s-1-3",
            label:
              "Checking SCC precedent parity (Bishal Jaiswal & Innoventive)",
            status: "done",
          },
          {
            id: "s-1-4",
            label: "Assembling Form 1 petition with statutory annexures",
            status: "done",
          },
        ],
        draftArtifact: SEED_DRAFT_DOC,
      },
    ],
  },
  "chat-2": {
    title: "Verify Annexure B Default Date",
    matterId: "arora-meridian",
    messages: [
      {
        id: "m-2-1",
        role: "user",
        content:
          "Verify the default date in Annexure B ledger statement against the Senior Facility Agreement terms.",
        matterName: "Arora v. Meridian Estates Pvt. Ltd.",
      },
      {
        id: "m-2-2",
        role: "assistant",
        agentId: "fact_reviewer",
        content:
          "### Annexure B Ledger Verification Audit\n\nCross-examination of Annexure B-4 ledger statements against the Senior Secured Facility Agreement dated 12.01.2019:\n\n- **Milestone Due Date**: 14th August 2021\n- **Tranche II Quantum**: ₹42,80,00,000/-\n- **Ledger Credit Check**: Bank records confirm zero amortization inflow credited on or after the milestone date.\n- **Discrepancy Status**: **0.00% variance** across all corresponding debit entries and ledger lines.",
        thinkingDuration: "2.1s",
        thinkingStages: [
          {
            id: "s-2-1",
            label: "Parsing facility agreement amortization schedule",
            status: "done",
          },
          {
            id: "s-2-2",
            label: "Matching transaction entries in Annexure B bank statement",
            status: "done",
          },
        ],
      },
    ],
  },
  "chat-3": {
    title: "Draft Section 9 Relief Petition",
    matterId: "gupta-zenith",
    messages: [
      {
        id: "m-3-1",
        role: "user",
        content:
          "Prepare a Section 9 interim relief petition under the Arbitration Act to freeze disputed project accounts of Zenith Developers.",
        matterName: "Gupta v. Zenith Developers Ltd.",
      },
      {
        id: "m-3-2",
        role: "assistant",
        agentId: "writer",
        content:
          "### Section 9 Interim Measures Application\n\nI have generated the Section 9 interim relief application under the Arbitration and Conciliation Act, 1996.\n\n- **Urgency Ground**: Imminent alienation of mortgaged project parcels and diversion of escrow receivables.\n- **Substantive Relief**: Injunction restraining creation of third-party encumbrances pending arbitral tribunal constitution.\n- **Precedent Alignment**: Anchored *Essar House Private Ltd. v. Arcellor Mittal Nippon Steel India Ltd.* (2022) SCC OnLine SC 1219 for interim protection thresholds.",
        thinkingDuration: "2.9s",
        thinkingStages: [
          {
            id: "s-3-1",
            label: "Validating arbitration clause in commercial agreement",
            status: "done",
          },
          {
            id: "s-3-2",
            label: "Drafting Section 9 interim prayer schedule",
            status: "done",
          },
        ],
      },
    ],
  },
  "chat-4": {
    title: "Citation Scan: Innoventive Industries",
    matterId: "arora-meridian",
    messages: [
      {
        id: "m-4-1",
        role: "user",
        content:
          "Perform quotation parity and subsequent treatment check on Innoventive Industries Ltd. v. ICICI Bank (2018) 1 SCC 407.",
        matterName: "Arora v. Meridian Estates Pvt. Ltd.",
      },
      {
        id: "m-4-2",
        role: "assistant",
        agentId: "citation_reviewer",
        content:
          "### Citation Parity & Subsequent Treatment Scan\n\n- **Authority**: *Innoventive Industries Ltd. v. ICICI Bank*, (2018) 1 SCC 407\n- **Bench**: 2-Judge Bench, Supreme Court of India\n- **Quotation Parity**: **100% exact parity** for Paragraphs 28 and 30 regarding the mandatory nature of admission upon establishing debt and default under Section 7.\n- **Subsequent Treatment**: **Consistently followed** across 48 Supreme Court orders and 112 NCLAT decisions; **zero overruling or negative treatment** detected.",
        thinkingDuration: "1.8s",
        thinkingStages: [
          {
            id: "s-4-1",
            label: "Scanning Supreme Court reporter quotation parity",
            status: "done",
          },
          {
            id: "s-4-2",
            label:
              "Checking subsequent negative treatment and distinguishing rulings",
            status: "done",
          },
        ],
      },
    ],
  },
  "chat-5": {
    title: "Fact Check: Ledger Discrepancy",
    matterId: "arora-meridian",
    messages: [
      {
        id: "m-5-1",
        role: "user",
        content:
          "Audit loan ledger interest calculation for compound interest discrepancies.",
        matterName: "Arora v. Meridian Estates Pvt. Ltd.",
      },
      {
        id: "m-5-2",
        role: "assistant",
        agentId: "fact_reviewer",
        content:
          "### Ledger Interest Calculation Audit\n\n- **Contractual Term**: 14.50% simple interest per annum on overdue installments.\n- **Ledger Verification**: Audited daily balance accruals against penal ledger entries.\n- **Findings**: Verified simple interest totaling ₹6,42,00,000/-. **Zero compounding charges** or unauthorized penal compounding detected across the audited period.",
        thinkingDuration: "2.3s",
        thinkingStages: [
          {
            id: "s-5-1",
            label: "Re-computing interest accrual formula across 36 months",
            status: "done",
          },
        ],
      },
    ],
  },
};

const SUGGESTIONS = [
  "Draft an IBC Section 7 Application",
  "Audit Ledger & Default Dates in Annexure B",
  "Check Article 137 Limitation Bar & Section 18",
  "Draft Synopsis & Chronological List of Dates",
];

interface AgentChatViewProps {
  initialMatterId?: string | null;
  sessionId?: string | null;
  onOpenMatter?: (matterId: string) => void;
  onSelectChatSession?: (id: string) => void;
  onNewChat?: () => void;
}

export function AgentChatView({
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

  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    sessionId,
  );
  const [prevSessionProp, setPrevSessionProp] = useState<string | null>(
    sessionId,
  );
  const [sessionCustomMessages, setSessionCustomMessages] = useState<
    Record<string, MessageItem[]>
  >({});

  if (sessionId !== prevSessionProp) {
    setPrevSessionProp(sessionId);
    setActiveSessionId(sessionId);
  }

  const activeMessages = useMemo(() => {
    if (!activeSessionId) return [];
    if (sessionCustomMessages[activeSessionId]) {
      return sessionCustomMessages[activeSessionId]!;
    }
    return DEMO_SESSIONS[activeSessionId]?.messages || [];
  }, [activeSessionId, sessionCustomMessages]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, busy]);

  const currentAgent = AGENTS[0]!;

  const currentMatterId =
    selectedMatterId ||
    (activeSessionId ? DEMO_SESSIONS[activeSessionId]?.matterId : null);
  const selectedMatter = SEED_MATTERS.find((m) => m.id === currentMatterId);

  const filteredMatters = SEED_MATTERS.filter(
    (m) =>
      m.name.toLowerCase().includes(matterSearch.toLowerCase()) ||
      m.caseNumber.toLowerCase().includes(matterSearch.toLowerCase()),
  );

  const handleSend = () => {
    const text = input.trim();
    if (!text || busy) return;

    const targetSessionId = activeSessionId || `chat-${Date.now()}`;
    const userMsg: MessageItem = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      matterName: selectedMatter?.name,
    };

    const currentList = activeMessages;
    setSessionCustomMessages((prev) => ({
      ...prev,
      [targetSessionId]: [...currentList, userMsg],
    }));
    setActiveSessionId(targetSessionId);
    setInput("");
    setBusy(true);

    setTimeout(() => {
      let respContent: string;
      let draft: SideViewerDocument | undefined;

      if (/\b(draft|write|prepare)\b/i.test(text)) {
        respContent = `### Section 7 Form 1 Petition Drafted\n\nI have generated the petition under **Form 1 of the Insolvency and Bankruptcy (Application to Adjudicating Authority) Rules, 2016**.\n\n- **Part IV Financial Debt**: Documented principal sum of ₹42,80,00,000/- with default milestone occurring on **14th August 2021**.\n- **Limitation Ground (Article 137)**: Corporate Debtor recognized liability in signed Audited Financial Statements for FY 2021-22 and FY 2022-23, creating a fresh period of limitation under **Section 18 of the Limitation Act, 1963**.\n- **Precedent Support**: Anchored *Asset Reconstruction Company (India) Ltd. v. Bishal Jaiswal* (2021) 6 SCC 366 and *Innoventive Industries Ltd. v. ICICI Bank* (2018) 1 SCC 407.\n- **Reliefs Formulated**: Prayed for admission, moratorium under Section 14, and appointment of the proposed IRP.`;
        draft = SEED_DRAFT_DOC;
      } else if (/\b(citation|precedent|quote|authority)\b/i.test(text)) {
        respContent = `### Citation review\n\nI checked each dimension separately against the sources available to this matter.\n\n1. **Innoventive Industries Ltd. v. ICICI Bank, (2018) 1 SCC 407**\n   - Identity: **Supported** by stored source metadata.\n   - Exact quotation: **Needs review** until the cited paragraph is matched against the stored judgment text.\n   - Proposition support: **Needs review** by counsel.\n   - Later treatment: **Not checked** because no authoritative treatment source is connected.\n\nI cannot confirm that this authority supports the draft proposition yet. Open the source passage or add the official judgment before relying on it.`;
      } else if (/\b(fact|ledger|amount|date)\b/i.test(text)) {
        respContent = `### Ledger & Transaction Verification Audit\n\nAudit of Annexure B-4 bank ledger records completed:\n\n- **Principal Default**: ₹42,80,00,000/- (Discrepancy: **0.00%** across bank statements).\n- **First Default Date**: **14th August 2021** (Failure to credit Tranche-II amortization milestone).\n- **Interest Accrual**: ₹6,42,00,000/- verified at contractual rate of 14.50% per annum.`;
      } else {
        respContent = `### Synthesis & Case Analysis\n\nI have coordinated the analysis across research, drafting, and precedent verification for **${selectedMatter?.name || "the selected matter"}**.\n\n- **Statutory Grounds**: Verified threshold compliance under Section 7(5)(a) of IBC, 2016.\n- **Evidentiary Anchors**: Default date confirmed across Annexure B-4 ledger statements.\n- **Limitation**: Secured under Section 18 of Limitation Act, 1963 via balance sheet acknowledgments (*Bishal Jaiswal*).\n- **Draft Generated**: The structured Form 1 petition is ready for inspection and export below.`;
        draft = SEED_DRAFT_DOC;
      }

      const asstMsg: MessageItem = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        agentId: "orchestrator",
        content: respContent,
        thinkingDuration: "3.2s",
        thinkingStages: [
          {
            id: "ts-1",
            label: "Searching matter documents and evidentiary spans",
            status: "done",
          },
          {
            id: "ts-2",
            label: "Citation Reviewer · checking identity and exact quotation",
            status: "done",
          },
          {
            id: "ts-3",
            label: "Main Agent · preparing the review summary and limitations",
            status: "done",
          },
        ],
        draftArtifact: draft,
      };

      setSessionCustomMessages((prev) => ({
        ...prev,
        [targetSessionId]: [
          ...(prev[targetSessionId] || currentList),
          userMsg,
          asstMsg,
        ],
      }));
      setBusy(false);
    }, 2200);
  };

  const handleReset = () => {
    setActiveSessionId(null);
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
              handleSend();
            }
          }}
          placeholder={
            busy
              ? "Veritas agent is thinking..."
              : "Ask Veritas to draft, check facts, or review citations"
          }
          rows={activeMessages.length > 0 ? 2 : 4}
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
                  {selectedMatter ? selectedMatter.name : "All Matters"}
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
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMatterId(null);
                        setMatterDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs cursor-pointer ${
                        selectedMatterId === null
                          ? "bg-[#edf4fa] text-[#2c5478] font-semibold"
                          : "hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <span>All Matters</span>
                      {selectedMatterId === null && (
                        <CheckIcon size={12} className="text-[#487aa8]" />
                      )}
                    </button>

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
              onClick={handleSend}
              disabled={!input.trim() || busy}
              className={`h-7.5 w-7.5 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                !input.trim() || busy
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

      {activeMessages.length === 0 && (
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

        {activeSessionId && (
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
            activeMessages.length === 0
              ? "items-center justify-center overflow-y-auto"
              : ""
          }`}
        >
          {activeMessages.length === 0 ? (
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
                  {activeMessages.map((msg) => {
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

                            {msg.draftArtifact && (
                              <div
                                onClick={() => {
                                  setSideViewerDoc(msg.draftArtifact!);
                                  setSideViewerOpen(true);
                                }}
                                className="mt-3.5 flex items-center gap-3.5 rounded-xl border border-stone-200 bg-white p-3 shadow-2xs hover:border-[#cbe0f2] hover:shadow-xs transition-all cursor-pointer group"
                              >
                                <div className="w-[38px] h-[44px] shrink-0 flex items-center justify-center rounded-[7px] border border-[#dedee1] bg-[#f7f7f8] text-[#52525b] group-hover:border-[#cbe0f2] group-hover:bg-[#f2f7fc] group-hover:text-[#2c5478] transition-colors">
                                  <StreamlineFileTextIcon size={20} />
                                </div>
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
                                    onClick={() =>
                                      router.push(
                                        `/drafting/${msg.draftArtifact!.id}`,
                                      )
                                    }
                                    className="h-7.5 px-3 rounded-md border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:border-[#cbe0f2] hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer transition-colors shadow-2xs"
                                  >
                                    Open in editor
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
                              {msg.draftArtifact && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSideViewerDoc(msg.draftArtifact!);
                                    setSideViewerOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 h-6 px-2 rounded text-[11px] font-medium text-[#2c5478] hover:bg-[#edf4fa] transition-colors cursor-pointer"
                                >
                                  <StreamlineFileTextIcon size={13} />
                                  <span>Preview draft</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {busy && (
                    <div className="w-full flex justify-start">
                      <div className="inline-flex items-center gap-2 text-xs text-stone-500 py-0.5">
                        <ThinkingOrb size={18} isThinking={true} />
                        <span>Thinking...</span>
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
