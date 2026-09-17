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
  const [actionMenuMatterId, setActionMenuMatterId] = useState<string | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<Matter | null>(null);

  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const counts = useMemo(() => {
    const buckets = {
      all: matters.length,
      drafting: 0,
      initiation: 0,
      progress: 0,
      final: 0,
    };
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

      if (filters.types.length && !filters.types.includes(m.matterType))
        return false;
      if (filters.stages.length && !filters.stages.includes(m.stage))
        return false;
      if (filters.statuses.length && !filters.statuses.includes(m.health))
        return false;

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
      const next = list.includes(value)
        ? list.filter((x) => x !== value)
        : [...list, value];
      return { ...prev, [category]: next };
    });
  }

  const activeFilterCount =
    filters.types.length + filters.stages.length + filters.statuses.length;

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:pb-0">
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
              <SearchIcon
                size={14}
                className="absolute left-2.5 text-stone-400 pointer-events-none"
              />
              <input
                type="text"
                name="matter-search"
                aria-label="Search matters"
                autoComplete="off"
                spellCheck={false}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by matter, case number, or court…"
                className="h-8 w-52 rounded-md border border-stone-200 bg-white pr-2.5 pl-8 text-xs text-stone-800 shadow-2xs placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none sm:w-64"
              />
            </div>

            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen(!filterOpen)}
                aria-expanded={filterOpen}
                aria-haspopup="dialog"
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
                    <span className="text-xs font-semibold text-stone-900">
                      Filter matters
                    </span>
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
                      {(
                        ["Healthy", "Needs attention", "High risk"] as const
                      ).map((status) => (
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

        <div className="grid gap-2.5 md:hidden">
          {filteredMatters.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-200 px-5 py-10 text-center text-sm text-stone-500">
              No matters match the current search and filters.
            </div>
          ) : (
            filteredMatters.map((matter) => (
              <article
                key={matter.id}
                className="rounded-lg border border-stone-200 bg-white p-4 shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#dce9f4] bg-[#edf4fa] text-[#487aa8]">
                    {getMatterIcon(matter.matterType)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onSelectMatter(matter)}
                      className="block w-full truncate text-left text-sm font-semibold text-stone-950 hover:text-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/30 focus-visible:outline-none"
                    >
                      {matter.name}
                    </button>
                    <p className="m-0 truncate pt-1 font-mono text-[11px] text-stone-500">
                      {matter.caseNumber}
                    </p>
                    <p className="m-0 line-clamp-1 pt-1 text-xs text-stone-500">
                      {matter.court}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-stone-100 pt-3 text-xs">
                  <div className="min-w-0">
                    <dt className="text-[10px] text-stone-400">
                      Practice area
                    </dt>
                    <dd className="m-0 truncate pt-0.5 font-medium text-stone-700">
                      {matter.matterType}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] text-stone-400">Stage</dt>
                    <dd className="m-0 truncate pt-0.5 font-medium text-stone-700">
                      {matter.stage}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ${
                      matter.health === "Healthy"
                        ? "bg-[#edf8f1] text-[#1e6f3d]"
                        : matter.health === "Needs attention"
                          ? "bg-[#fef7ee] text-[#b26b18]"
                          : "bg-[#fef2f1] text-[#b9382b]"
                    }`}
                  >
                    {matter.health}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPendingDelete(matter)}
                      className="h-8 rounded-md px-2.5 text-xs font-medium text-stone-500 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:ring-2 focus-visible:ring-rose-600/30 focus-visible:outline-none"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectMatter(matter)}
                      className="h-8 rounded-md bg-[#487aa8] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#3d6991] focus-visible:ring-2 focus-visible:ring-[#487aa8] focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      Open Matter
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-lg border border-stone-200 bg-white md:block">
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
                    className="group transition-colors hover:bg-[#f7f9fa]"
                  >
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="shrink-0 text-stone-500 group-hover:text-[#487aa8] transition-colors">
                          {getMatterIcon(matter.matterType)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectMatter(matter)}
                          className="max-w-[280px] truncate text-left font-medium text-stone-900 transition-colors group-hover:text-[#487aa8] hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-[#487aa8]/30 focus-visible:outline-none sm:max-w-md"
                        >
                          {matter.name}
                        </button>
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
                        aria-label={`Open actions for ${matter.name}`}
                        aria-expanded={actionMenuMatterId === matter.id}
                        onClick={() =>
                          setActionMenuMatterId(
                            actionMenuMatterId === matter.id ? null : matter.id,
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
                            <FolderKanbanIcon
                              size={13}
                              className="text-[#487aa8]"
                            />
                            <span>Open matter</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActionMenuMatterId(null);
                              setPendingDelete(matter);
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

      {pendingDelete && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-xs"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setPendingDelete(null);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-matter-title"
            aria-describedby="delete-matter-description"
            className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-2xl"
          >
            <h2
              id="delete-matter-title"
              className="m-0 text-lg font-semibold text-stone-950"
            >
              Delete this matter?
            </h2>
            <p
              id="delete-matter-description"
              className="m-0 pt-2 text-sm leading-6 text-stone-600"
            >
              This removes {pendingDelete.name} from the current workspace demo.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-6">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="h-9 rounded-md border border-stone-200 px-4 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-[#487aa8]/30 focus-visible:outline-none"
              >
                Keep Matter
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteMatter(pendingDelete.id);
                  setPendingDelete(null);
                }}
                className="h-9 rounded-md bg-rose-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-rose-800 focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Delete Matter
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
