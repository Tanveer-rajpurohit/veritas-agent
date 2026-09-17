"use client";

import { useState } from "react";
import type { Matter, MatterType } from "../../types/workspace";
import { CustomSelect, type SelectOption } from "./custom-select";
import { XIcon, BriefcaseIcon } from "./workspace-icons";

interface CreateMatterModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (matter: Matter) => void;
}

const MATTER_TYPE_OPTIONS: SelectOption<MatterType>[] = [
  { value: "Insolvency (IBC)", label: "Insolvency (IBC)", description: "CIRP, Section 7/9, liquidation proceedings", badge: "IBC" },
  { value: "Commercial", label: "Commercial Dispute", description: "Commercial suits, contractual breaches, claims", badge: "Commercial" },
  { value: "Arbitration", label: "Arbitration & Conciliation", description: "Section 9 interim relief, Section 34 enforcement", badge: "ADR" },
  { value: "Corporate", label: "Corporate Regulatory", description: "NCLT mergers, oppression, mismanagement", badge: "MCA" },
  { value: "Civil", label: "Civil Litigation", description: "Specific performance, recovery, declarations", badge: "Civil" },
  { value: "Property", label: "Property & Real Estate", description: "Title disputes, partition suits, RERA claims", badge: "Property" },
  { value: "Intellectual Property", label: "Intellectual Property", description: "Trademark infringement, patent challenges", badge: "IP" },
  { value: "Tax", label: "Tax & Customs", description: "Direct/indirect tax appeals, CESTAT, ITAT", badge: "Tax" },
  { value: "Criminal", label: "Criminal & White Collar", description: "PMLA, economic offences, quashing petitions", badge: "Criminal" },
];

export function CreateMatterModal({ open, onClose, onCreate }: CreateMatterModalProps) {
  const [name, setName] = useState("");
  const [matterType, setMatterType] = useState<MatterType>("Insolvency (IBC)");
  const [caseNumber, setCaseNumber] = useState("");
  const [court, setCourt] = useState("");
  const [petitioner, setPetitioner] = useState("");
  const [respondent, setRespondent] = useState("");

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const newMatter: Matter = {
      id: `matter-${Date.now()}`,
      name: name.trim(),
      caseNumber: caseNumber.trim() || "DRAFT/2026/01",
      court: court.trim() || "Delhi High Court",
      stage: "Drafting",
      practiceArea: matterType,
      lastActivity: "Created just now",
      updatedAt: Date.now(),
      petitioner: petitioner.trim() || "Client",
      respondent: respondent.trim() || "Opposing Party",
      matterType,
      createdDate: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      health: "Healthy",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-xs select-none overflow-y-auto">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl sm:max-w-2xl rounded-xl border border-stone-200/90 bg-white p-7 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-visible my-auto"
      >
        <div className="flex items-start justify-between pb-4 border-b border-stone-100">
          <div>
            <h2 className="font-sans text-base sm:text-lg font-semibold text-stone-900 m-0">
              Create New Legal Matter
            </h2>
            <p className="text-xs text-stone-500 m-0 pt-1 leading-relaxed">
              Initialize an evidentiary workspace with proposition linking and citation currency checks.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer shrink-0 ml-4"
          >
            <XIcon size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4.5 pt-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-stone-700">
              Matter Title
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Mehta Industries Ltd. v. Skyline Logistics Pvt. Ltd."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border border-stone-200/90 bg-white px-3.5 text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs outline-none transition-all focus:border-[#487aa8] focus:ring-3 focus:ring-[#487aa8]/10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-700">
                Practice Area
              </label>
              <CustomSelect<MatterType>
                value={matterType}
                onChange={setMatterType}
                options={MATTER_TYPE_OPTIONS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-700">
                Case / Docket Number
              </label>
              <input
                type="text"
                placeholder="e.g. CP(IB) 840/ND/2026"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                className="h-10 w-full rounded-lg border border-stone-200/90 bg-white px-3.5 text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs outline-none transition-all focus:border-[#487aa8] focus:ring-3 focus:ring-[#487aa8]/10 font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-stone-700">
              Presiding Forum / Court
            </label>
            <input
              type="text"
              placeholder="e.g. NCLT New Delhi (Bench-III) or High Court of Delhi"
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              className="h-10 w-full rounded-lg border border-stone-200/90 bg-white px-3.5 text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs outline-none transition-all focus:border-[#487aa8] focus:ring-3 focus:ring-[#487aa8]/10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-700">
                Petitioner / Claimant
              </label>
              <input
                type="text"
                placeholder="e.g. Mehta Industries Ltd."
                value={petitioner}
                onChange={(e) => setPetitioner(e.target.value)}
                className="h-10 w-full rounded-lg border border-stone-200/90 bg-white px-3.5 text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs outline-none transition-all focus:border-[#487aa8] focus:ring-3 focus:ring-[#487aa8]/10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-700">
                Respondent / Debtor
              </label>
              <input
                type="text"
                placeholder="e.g. Skyline Logistics Pvt. Ltd."
                value={respondent}
                onChange={(e) => setRespondent(e.target.value)}
                className="h-10 w-full rounded-lg border border-stone-200/90 bg-white px-3.5 text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs outline-none transition-all focus:border-[#487aa8] focus:ring-3 focus:ring-[#487aa8]/10"
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
              className="inline-flex h-9.5 items-center gap-1.5 rounded-lg bg-[#487aa8] px-5 text-xs font-semibold text-white shadow-2xs hover:bg-[#3b668e] transition-all cursor-pointer"
            >
              <BriefcaseIcon size={13} />
              <span>Create Legal Matter</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
