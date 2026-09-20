"use client";

import { useState } from "react";
import Link from "next/link";
import { VeritasOrb } from "../brand/veritas-orb";
import { NameBlobAvatar } from "../brand/name-blob-avatar";
import { useUser } from "../../hooks/auth/useAuth";
import {
  BriefcaseIcon,
  ChevronDownIcon,
  ClockIcon,
  PanelLeftIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  BotIcon,
  FileTextIcon,
  TrashIcon,
} from "./workspace-icons";

export interface SidebarChatSession {
  id: string;
  title: string;
  time: string;
}

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCreateMatter: () => void;
  onOpenUpload: () => void;
  activeNav: string;
  onSelectNav: (nav: string) => void;
  onSelectChatSession?: (sessionId: string) => void;
  onDeleteChatSession?: (sessionId: string) => void;
  chatSessions?: SidebarChatSession[];
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AppSidebar({
  collapsed,
  onToggleCollapse,
  onOpenCreateMatter,
  onOpenUpload,
  activeNav,
  onSelectNav,
  onSelectChatSession,
  onDeleteChatSession,
  chatSessions = [],
  mobileOpen,
  onCloseMobile,
}: AppSidebarProps) {
  const { data: user } = useUser();
  const userName = user?.full_name || user?.display_name || user?.email.split("@")[0] || "Veritas user";
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);

  return (
    <>
      {newMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setNewMenuOpen(false)}
        />
      )}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close workspace navigation"
          className="fixed inset-0 z-40 bg-stone-950/30 backdrop-blur-[1px] md:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed inset-y-2 left-2 z-50 flex w-[min(17rem,calc(100vw-1rem))] shrink-0 flex-col justify-between rounded-lg border border-stone-200/90 bg-white shadow-xl transition-transform duration-200 select-none md:relative md:inset-auto md:z-30 md:h-full md:translate-x-0 md:shadow-2xs md:transition-[width] ${
          newMenuOpen ? "overflow-visible" : "overflow-hidden"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]"} ${
          collapsed ? "md:w-[56px]" : "md:w-[248px]"
        }`}
      >
        <div className="relative shrink-0 px-3 pt-3.5 pb-1">
          <div
            className={`flex items-center pb-2.5 ${
              collapsed ? "justify-center" : "justify-between"
            }`}
          >
            {collapsed ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Expand sidebar"
                className="group relative flex h-8 w-8 items-center justify-center rounded-md text-stone-700 hover:bg-[#edf4fa] hover:text-[#487aa8] transition-colors cursor-pointer"
                title="Expand sidebar"
              >
                <span className="transition-opacity duration-150 group-hover:opacity-0 group-hover:scale-90">
                  <VeritasOrb size={20} className="text-[#487aa8]" />
                </span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-hover:scale-100 text-[#487aa8]">
                  <PanelLeftIcon size={16} />
                </span>
              </button>
            ) : (
              <>
                <div className="flex items-center">
                  <Link
                    href="/"
                    className="flex items-center gap-2.5 transition-opacity hover:opacity-85 py-0.5"
                    title="Veritas Home"
                  >
                    <VeritasOrb size={20} className="text-[#487aa8]" />
                    <span className="font-display text-[17px] font-medium tracking-tight leading-none text-stone-900 translate-y-[0.5px]">
                      Veritas
                    </span>
                  </Link>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:bg-[#edf4fa] hover:text-[#487aa8] transition-colors cursor-pointer"
                    aria-label="Search workspace"
                    title="Search workspace (⌘K)"
                  >
                    <SearchIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    aria-label="Collapse sidebar"
                    className="hidden h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:bg-[#edf4fa] hover:text-[#487aa8] transition-colors cursor-pointer md:flex"
                    title="Collapse sidebar"
                  >
                    <PanelLeftIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={onCloseMobile}
                    aria-label="Close workspace navigation"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-[#edf4fa] hover:text-[#487aa8] md:hidden"
                  >
                    <PanelLeftIcon size={14} />
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="relative pb-2">
            {collapsed ? (
              <button
                type="button"
                onClick={() => setNewMenuOpen(!newMenuOpen)}
                aria-label="Create matter or upload document"
                aria-expanded={newMenuOpen}
                className="flex h-8.5 w-full items-center justify-center rounded-md border border-stone-200 bg-white shadow-2xs hover:bg-[#edf4fa] text-stone-700 hover:text-[#487aa8] cursor-pointer transition-colors"
                title="New matter or document"
              >
                <PlusIcon size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setNewMenuOpen(!newMenuOpen)}
                aria-expanded={newMenuOpen}
                aria-haspopup="menu"
                className="flex h-8.5 w-full items-center justify-between rounded-md border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-[#edf4fa] hover:text-[#487aa8] cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2">
                  <PlusIcon size={13} />
                  <span>New</span>
                </span>
                <ChevronDownIcon
                  size={12}
                  className={`transition-transform text-stone-400 ${
                    newMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}

            {newMenuOpen && (
              <div
                className={`absolute z-50 mt-1 rounded-md border border-stone-200 bg-white p-1.5 shadow-xl ${
                  collapsed ? "left-12 top-0 w-48" : "inset-x-0"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setNewMenuOpen(false);
                    onOpenCreateMatter();
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-xs font-medium text-stone-700 hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer transition-colors"
                >
                  <BriefcaseIcon size={13} className="text-[#487aa8]" />
                  <span>New legal matter</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewMenuOpen(false);
                    onOpenUpload();
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-xs font-medium text-stone-700 hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer transition-colors"
                >
                  <PlusIcon size={13} className="text-[#487aa8]" />
                  <span>Upload document</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <nav className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => onSelectNav("home")}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                activeNav === "home"
                  ? "bg-[#edf4fa] text-[#2c5478] font-semibold"
                  : "text-stone-600 hover:bg-[#edf4fa]/60 hover:text-[#2c5478]"
              } ${collapsed ? "justify-center px-0" : ""}`}
              title="Matters"
            >
              <span
                className={
                  activeNav === "home" ? "text-[#487aa8]" : "text-stone-600"
                }
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              {!collapsed && <span>Matters</span>}
            </button>

            <button
              type="button"
              onClick={() => onSelectNav("agent")}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                activeNav === "agent"
                  ? "bg-[#edf4fa] text-[#2c5478] font-semibold"
                  : "text-stone-600 hover:bg-[#edf4fa]/60 hover:text-[#2c5478]"
              } ${collapsed ? "justify-center px-0" : ""}`}
              title="Agent"
            >
              <BotIcon
                size={15}
                className={
                  activeNav === "agent" ? "text-[#487aa8]" : "text-stone-500"
                }
              />
              {!collapsed && <span>Agent</span>}
            </button>

            <Link
              href="/test-docs"
              onClick={onCloseMobile}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer text-stone-600 hover:bg-[#edf4fa]/60 hover:text-[#2c5478] ${
                collapsed ? "justify-center px-0" : ""
              }`}
              title="Test Library & Documents"
            >
              <FileTextIcon size={15} className="text-stone-500" />
              {!collapsed && <span>Test Library</span>}
            </Link>
          </nav>

          <div className="pt-4 pb-1">
            {!collapsed ? (
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[10.5px] font-semibold tracking-wider text-stone-400 uppercase font-mono">
                  Chat History
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(!historyOpen)}
                  aria-label={
                    historyOpen
                      ? "Collapse chat history"
                      : "Expand chat history"
                  }
                  aria-expanded={historyOpen}
                  className="text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <ChevronDownIcon
                    size={11}
                    className={`transition-transform ${historyOpen ? "" : "-rotate-90"}`}
                  />
                </button>
              </div>
            ) : (
              <div className="my-2 border-t border-stone-100" />
            )}

            {collapsed ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="flex h-8 w-full items-center justify-center rounded-md text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8] cursor-pointer transition-colors"
                title="Chat History"
              >
                <ClockIcon size={14} />
              </button>
            ) : (
              historyOpen && (
                <div className="flex flex-col gap-0.5 pt-1">
                  {chatSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => onSelectChatSession?.(session.id)}
                      className="group flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[#edf4fa] cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-1.5">
                        <span className="block font-medium text-stone-800 group-hover:text-[#487aa8] truncate w-full">
                          {session.title}
                        </span>
                        <span className="block text-[10px] text-stone-400 font-mono pt-0.5">
                          {session.time}
                        </span>
                      </div>
                      {onDeleteChatSession && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChatSession(session.id);
                          }}
                          aria-label={`Delete ${session.title}`}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-stone-200/70 text-stone-400 hover:text-red-600 transition-all shrink-0 cursor-pointer"
                          title="Delete consultation"
                        >
                          <TrashIcon size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {chatSessions.length === 0 && (
                    <div className="px-2.5 py-3 text-center text-[11px] text-stone-400">
                      No consultations yet
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        <div className="border-t border-stone-200/90 p-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onSelectNav("settings")}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeNav === "settings"
                ? "bg-[#edf4fa] text-[#2c5478] font-semibold"
                : "text-stone-700 hover:bg-[#edf4fa] hover:text-[#487aa8]"
            } ${collapsed ? "justify-center px-0" : ""}`}
            title="Settings"
          >
            <SettingsIcon
              size={14}
              className={
                activeNav === "settings" ? "text-[#487aa8]" : "text-stone-600"
              }
            />
            {!collapsed && <span>Settings</span>}
          </button>

          <button
            type="button"
            onClick={() => onSelectNav("profile")}
            title="View profile"
            className={`flex w-full items-center gap-2 rounded-md p-1.5 transition-colors cursor-pointer text-left ${
              activeNav === "profile"
                ? "bg-[#edf4fa] text-[#2c5478]"
                : "hover:bg-[#edf4fa]/60 text-stone-800"
            } ${collapsed ? "justify-center p-0" : ""}`}
          >
            <NameBlobAvatar name={userName} size={28} className="shrink-0" />
            {!collapsed && (
              <div className="min-w-0 flex-1 text-left">
                <p
                  className={`m-0 text-xs font-semibold truncate ${
                    activeNav === "profile"
                      ? "text-[#2c5478]"
                      : "text-stone-800"
                  }`}
                >
                  {userName}
                </p>
                <p className="m-0 text-[10px] text-stone-400 truncate">
                  {user?.email || "Signed-out account"}
                </p>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
