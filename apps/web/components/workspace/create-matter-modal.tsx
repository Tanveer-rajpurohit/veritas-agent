"use client";

import { useEffect, useId, useState } from "react";
import type { Matter, MatterType } from "../../types/workspace";
import { CustomSelect, type SelectOption } from "./custom-select";
import { XIcon, BriefcaseIcon } from "./workspace-icons";

interface CreateMatterModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (matter: Matter) => void;
}

const MATTER_TYPE_OPTIONS: SelectOption<MatterType>[] = [
  {
    value: "Insolvency (IBC)",
    label: "Insolvency (IBC)",
    description: "CIRP, Section 7/9, liquidation proceedings",
    badge: "IBC",
  },
  {
    value: "Commercial",
    label: "Commercial Dispute",
    description: "Commercial suits, contractual breaches, claims",
    badge: "Commercial",
  },
  {
    value: "Arbitration",
    label: "Arbitration & Conciliation",
    description: "Section 9 interim relief, Section 34 enforcement",
    badge: "ADR",
  },
  {
    value: "Corporate",
    label: "Corporate Regulatory",
    description: "NCLT mergers, oppression, mismanagement",
    badge: "MCA",
  },
  {
    value: "Civil",
    label: "Civil Litigation",
    description: "Specific performance, recovery, declarations",
    badge: "Civil",
  },
  {
    value: "Property",
    label: "Property & Real Estate",
    description: "Title disputes, partition suits, RERA claims",
    badge: "Property",
  },
  {
    value: "Intellectual Property",
    label: "Intellectual Property",
    description: "Trademark infringement, patent challenges",
    badge: "IP",
  },
  {
    value: "Tax",
    label: "Tax & Customs",
    description: "Direct/indirect tax appeals, CESTAT, ITAT",
    badge: "Tax",
  },
  {
    value: "Criminal",
    label: "Criminal & White Collar",
    description: "PMLA, economic offences, quashing petitions",
    badge: "Criminal",
  },
];

export function CreateMatterModal({
  open,
  onClose,
  onCreate,
}: CreateMatterModalProps) {
  const formId = useId();
  const [name, setName] = useState("");
  const [matterType, setMatterType] = useState<MatterType>("Insolvency (IBC)");
  const [caseNumber, setCaseNumber] = useState("");
  const [court, setCourt] = useState("");
  const [petitioner, setPetitioner] = useState("");
  const [respondent, setRespondent] = useState("");

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const newMatter: Matter = {
      id: `matter-${Date.now()}`,
      name: name.trim(),
      caseNumber: caseNumber.trim() || "Not assigned",
      court: court.trim() || "Forum not selected",
      stage: "Drafting",
      practiceArea: matterType,
      lastActivity: "Created just now",
      updatedAt: Date.now(),
      petitioner: petitioner.trim() || "Client",
      respondent: respondent.trim() || "Not specified",
      matterType,
      createdDate: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      health: "Needs attention",
      discrepanciesCount: 0,
      citationsCount: 0,
    };

    onCreate(newMatter);
    setName("");
    setCaseNumber("");
    setCourt("");
    setPetitioner("");
    setRespondent("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-stone-950/40 p-4 backdrop-blur-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        aria-describedby={`${formId}-description`}
        className="relative my-auto w-full max-w-xl overflow-visible rounded-xl border border-stone-200/90 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:max-w-2xl sm:p-8"
      >
        <div className="flex items-start justify-between pb-4 border-b border-stone-100">
          <div>
            <h2
              id={`${formId}-title`}
              className="m-0 font-sans text-base font-semibold text-stone-900 sm:text-lg"
            >
              Create Matter
            </h2>
            <p
              id={`${formId}-description`}
              className="m-0 pt-1 text-xs leading-relaxed text-stone-500"
            >
              Add the basic case details. You can upload records and start a
              draft next.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create matter dialog"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer shrink-0 ml-4"
          >
            <XIcon size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4.5 pt-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${formId}-name`}
              className="text-xs font-semibold text-stone-700"
            >
              Matter title
            </label>
            <input
              required
              id={`${formId}-name`}
              name="matter-title"
              type="text"
              autoComplete="off"
              placeholder="Mehta Industries Ltd. v. Skyline Logistics Pvt. Ltd.…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border border-stone-200/90 bg-white px-3.5 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-700">
                Practice area
              </label>
              <CustomSelect<MatterType>
                value={matterType}
                onChange={setMatterType}
                options={MATTER_TYPE_OPTIONS}
                ariaLabel="Practice area"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`${formId}-case-number`}
                className="text-xs font-semibold text-stone-700"
              >
                Case or docket number
              </label>
              <input
                type="text"
                id={`${formId}-case-number`}
                name="case-number"
                autoComplete="off"
                spellCheck={false}
                placeholder="CP(IB) 840/ND/2026…"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                className="h-10 w-full rounded-lg border border-stone-200/90 bg-white px-3.5 font-mono text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${formId}-court`}
              className="text-xs font-semibold text-stone-700"
            >
              Forum or court
            </label>
            <input
              type="text"
              id={`${formId}-court`}
              name="court"
              autoComplete="off"
              placeholder="NCLT New Delhi, Bench III…"
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              className="h-10 w-full rounded-lg border border-stone-200/90 bg-white px-3.5 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`${formId}-petitioner`}
                className="text-xs font-semibold text-stone-700"
              >
                Petitioner or claimant
              </label>
              <input
                type="text"
                id={`${formId}-petitioner`}
                name="petitioner"
                autoComplete="off"
                placeholder="Mehta Industries Ltd.…"
                value={petitioner}
                onChange={(e) => setPetitioner(e.target.value)}
                className="h-10 w-full rounded-lg border border-stone-200/90 bg-white px-3.5 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`${formId}-respondent`}
                className="text-xs font-semibold text-stone-700"
              >
                Respondent or debtor
              </label>
              <input
                type="text"
                id={`${formId}-respondent`}
                name="respondent"
                autoComplete="off"
                placeholder="Skyline Logistics Pvt. Ltd.…"
                value={respondent}
                onChange={(e) => setRespondent(e.target.value)}
                className="h-10 w-full rounded-lg border border-stone-200/90 bg-white px-3.5 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="h-9.5 rounded-lg border border-stone-200 bg-white px-4 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-9.5 items-center gap-1.5 rounded-lg bg-[#487aa8] px-5 text-xs font-semibold text-white shadow-2xs transition-[background-color,box-shadow] hover:bg-[#3b668e] focus-visible:ring-2 focus-visible:ring-[#487aa8] focus-visible:ring-offset-2 focus-visible:outline-none cursor-pointer"
            >
              <BriefcaseIcon size={13} />
              <span>Create Matter</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
