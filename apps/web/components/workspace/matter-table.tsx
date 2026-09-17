"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import type { Matter, MatterFilters } from "../../types/workspace";
import { classifyStage, EMPTY_FILTERS } from "../../lib/workspace-data";
import {
  BuildingIcon,
  FolderKanbanIcon,
  GavelIcon,
  HandshakeIcon,
  LandmarkIcon,
  LightbulbIcon,
  ListFilterIcon,
  MoreHorizontalIcon,
  PropertyHomeIcon,
  ScaleIcon,
  SearchIcon,
  ShieldAlertIcon,
  TrashIcon,
  UsersIcon,
} from "./workspace-icons";

interface MatterTableProps {
  matters: Matter[];
  onSelectMatter: (matter: Matter) => void;
  onDeleteMatter: (id: string) => void;
}

export function MatterTable({
  matters,
  onSelectMatter,
  onDeleteMatter,
}: MatterTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<MatterFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeBucket, setActiveBucket] = useState<string>("all");
  const [actionMenuMatterId, setActionMenuMatterId] = useState<string | null>(null);

  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const counts = useMemo(() => {
    const buckets = { all: matters.length, drafting: 0, initiation: 0, progress: 0, final: 0 };
    for (const matter of matters) {
      const bucket = classifyStage(matter.stage);
      buckets[bucket] += 1;
    }
    return buckets;
  }, [matters]);

  const filteredMatters = useMemo(() => {
    return matters.filter((m) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          m.name.toLowerCase().includes(query) ||
          m.caseNumber.toLowerCase().includes(query) ||
          m.court.toLowerCase().includes(query) ||
          m.practiceArea.toLowerCase().includes(query) ||
          m.petitioner.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      if (activeBucket !== "all") {
        if (classifyStage(m.stage) !== activeBucket) return false;
      }

      if (filters.types.length && !filters.types.includes(m.matterType)) return false;
      if (filters.stages.length && !filters.stages.includes(m.stage)) return false;
      if (filters.statuses.length && !filters.statuses.includes(m.health)) return false;

      return true;
    });
  }, [matters, searchQuery, activeBucket, filters]);

  function getMatterIcon(type: string) {
    switch (type) {
      case "Arbitration":
        return <ScaleIcon size={14} className="text-stone-600" />;
      case "Intellectual Property":
        return <LightbulbIcon size={14} className="text-stone-600" />;
      case "Commercial":
        return <HandshakeIcon size={14} className="text-stone-600" />;
      case "Civil":
        return <GavelIcon size={14} className="text-stone-600" />;
      case "Family":
        return <UsersIcon size={14} className="text-stone-600" />;
      case "Criminal":
        return <ShieldAlertIcon size={14} className="text-stone-600" />;
      case "Corporate":
        return <BuildingIcon size={14} className="text-stone-600" />;
      case "Property":
        return <PropertyHomeIcon size={14} className="text-stone-600" />;
      case "Tax":
        return <LandmarkIcon size={14} className="text-stone-600" />;
      default:
        return <FolderKanbanIcon size={14} className="text-stone-600" />;
    }
  }

  function toggleFilter(category: keyof MatterFilters, value: string) {
    setFilters((prev) => {
      const list = prev[category];
      const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
      return { ...prev, [category]: next };
    });
  }

  const activeFilterCount =
    filters.types.length + filters.stages.length + filters.statuses.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="font-sans text-sm font-semibold text-stone-900 pr-2">
            {matters.length} matters
          </span>

          <button
            type="button"
            onClick={() => setActiveBucket("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              activeBucket === "all"
                ? "bg-[#487aa8] text-white font-semibold shadow-2xs"
                : "text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8]"
            }`}
          >
            All ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setActiveBucket("drafting")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              activeBucket === "drafting"
                ? "bg-[#487aa8] text-white font-semibold shadow-2xs"
                : "text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8]"
            }`}
          >
            Drafting ({counts.drafting})
          </button>

          <button
            type="button"
            onClick={() => setActiveBucket("initiation")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              activeBucket === "initiation"
                ? "bg-[#487aa8] text-white font-semibold shadow-2xs"
                : "text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8]"
            }`}
          >
            Initiation ({counts.initiation})
          </button>

          <button
            type="button"
            onClick={() => setActiveBucket("progress")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              activeBucket === "progress"
                ? "bg-[#487aa8] text-white font-semibold shadow-2xs"
                : "text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8]"
            }`}
          >
            In progress ({counts.progress})
          </button>

          <button
            type="button"
            onClick={() => setActiveBucket("final")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              activeBucket === "final"
                ? "bg-[#487aa8] text-white font-semibold shadow-2xs"
                : "text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8]"
            }`}
          >
            Final ({counts.final})
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="relative flex items-center">
            <SearchIcon size={14} className="absolute left-2.5 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search matters..."
              className="h-8 w-44 sm:w-56 rounded-md border border-stone-200 bg-white pl-8 pr-2.5 text-xs text-stone-800 placeholder-stone-400 shadow-2xs focus:border-[#487aa8] focus:outline-none"
            />
          </div>

          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen(!filterOpen)}
              className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium shadow-2xs transition-colors cursor-pointer ${
                activeFilterCount > 0
                  ? "border-[#487aa8] bg-[#edf4fa] text-[#2c5478]"
                  : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              <ListFilterIcon size={14} />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#487aa8] text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filterOpen && (
              <div className="absolute right-0 z-30 mt-1.5 w-64 rounded-lg border border-stone-200 bg-white p-3 shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <span className="text-xs font-semibold text-stone-900">Filter Matters</span>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilters(EMPTY_FILTERS)}
                      className="text-[11px] text-[#487aa8] hover:underline cursor-pointer"
                    >
                      Reset all
                    </button>
                  )}
                </div>

                <div className="py-2 flex flex-col gap-2.5 max-h-72 overflow-y-auto">
                  <div>
                    <span className="text-[10.5px] font-semibold text-stone-400 uppercase tracking-wider block pb-1">
                      STATUS
                    </span>
                    {(["Healthy", "Needs attention", "High risk"] as const).map((status) => (
                      <label
                        key={status}
                        className="flex items-center gap-2 py-1 text-xs text-stone-700 hover:text-stone-900 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.statuses.includes(status)}
                          onChange={() => toggleFilter("statuses", status)}
                          className="h-3.5 w-3.5 rounded-sm border-stone-300 text-[#487aa8] focus:ring-[#487aa8]"
                        />
                        <span>{status}</span>
                      </label>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-stone-100">
                    <span className="text-[10.5px] font-semibold text-stone-400 uppercase tracking-wider block pb-1">
                      PRACTICE AREA
                    </span>
                    {[
                      "Insolvency (IBC)",
                      "Arbitration",
                      "Commercial",
                      "Civil",
                      "Intellectual Property",
                      "Family",
                      "Corporate",
                      "Property",
                      "Criminal",
                      "Tax",
                    ].map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 py-1 text-xs text-stone-700 hover:text-stone-900 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.types.includes(type)}
                          onChange={() => toggleFilter("types", type)}
                          className="h-3.5 w-3.5 rounded-sm border-stone-300 text-[#487aa8] focus:ring-[#487aa8]"
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-[#fbfbfb] text-[11.5px] font-medium text-stone-500">
              <th className="py-2.5 px-3.5 font-medium">Name</th>
              <th className="py-2.5 px-3 font-medium">Type</th>
              <th className="py-2.5 px-3 font-medium">Stage</th>
              <th className="py-2.5 px-3 font-medium">Created</th>
              <th className="py-2.5 px-3 font-medium">Status</th>
              <th className="py-2.5 px-3 text-right font-medium w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-stone-700">
            {filteredMatters.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-stone-400">
                  No matters match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredMatters.map((matter) => (
                <tr
                  key={matter.id}
                  onClick={() => onSelectMatter(matter)}
                  className="group hover:bg-[#f7f9fa] transition-colors cursor-pointer"
                >
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0 text-stone-500 group-hover:text-[#487aa8] transition-colors">
                        {getMatterIcon(matter.matterType)}
                      </span>
                      <span className="font-medium text-stone-900 group-hover:text-[#487aa8] transition-colors truncate max-w-[280px] sm:max-w-md">
                        {matter.name}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap text-stone-600 font-normal">
                    {matter.matterType}
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap text-stone-600 font-normal">
                    {matter.stage}
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap text-stone-500 font-normal font-mono text-[11px]">
                    {matter.createdDate}
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                        matter.health === "Healthy"
                          ? "bg-[#edf8f1] text-[#1e6f3d]"
                          : matter.health === "Needs attention"
                            ? "bg-[#fef7ee] text-[#b26b18]"
                            : "bg-[#fef2f1] text-[#b9382b]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          matter.health === "Healthy"
                            ? "bg-[#2e7d46]"
                            : matter.health === "Needs attention"
                              ? "bg-[#d97706]"
                              : "bg-[#dc2626]"
                        }`}
                      />
                      <span>{matter.health}</span>
                    </span>
                  </td>

                  <td
                    className="py-3 px-3 text-right whitespace-nowrap relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActionMenuMatterId(
                          actionMenuMatterId === matter.id ? null : matter.id
                        )
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-sm text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 ml-auto cursor-pointer"
                    >
                      <MoreHorizontalIcon size={14} />
                    </button>

                    {actionMenuMatterId === matter.id && (
                      <div className="absolute right-3 top-8 z-40 w-44 rounded-md border border-stone-200 bg-white p-1 text-left shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setActionMenuMatterId(null);
                            onSelectMatter(matter);
                          }}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-stone-700 hover:bg-stone-100 cursor-pointer"
                        >
                          <FolderKanbanIcon size={13} className="text-[#487aa8]" />
                          <span>Open matter</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActionMenuMatterId(null);
                            onDeleteMatter(matter.id);
                          }}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <TrashIcon size={13} />
                          <span>Delete matter</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
