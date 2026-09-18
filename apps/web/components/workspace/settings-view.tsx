"use client";

import { useState } from "react";
import {
  SlidersIcon,
  SparklesIcon,
  BellIcon,
  UsersIcon,
} from "./workspace-icons";

type SettingsSection = "workspace" | "ai" | "notifications" | "account";

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: "workspace", label: "Workspace", icon: SlidersIcon },
  { id: "ai", label: "AI Assistance", icon: SparklesIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon },
  { id: "account", label: "Account", icon: UsersIcon },
];

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}

function ToggleSwitch({ id, checked, onChange, ariaLabel }: ToggleSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c07830]/30 ${
        checked ? "bg-[#c07830]" : "bg-stone-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function SettingsView() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("workspace");

  // Workspace settings local state (both default to ON)
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(true);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5 sm:p-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* Settings Page Header */}
      <header className="flex flex-col gap-1 pb-6">
        <h1 className="m-0 font-display text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
          Settings
        </h1>
        <p className="m-0 max-w-2xl pt-0.5 text-xs text-stone-500">
          Fine-tune your workspace, AI assistance and notifications.
        </p>
      </header>

      {/* Main Settings Layout: Left navigation + Right content card */}
      <div className="grid grid-cols-1 gap-6 pb-12 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr] items-start">
        {/* Left Preferences Navigation */}
        <nav
          aria-label="Settings preferences"
          className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left shrink-0 md:shrink border-l-2 ${
                  isActive
                    ? "bg-[#fef6ee] text-[#b45309] font-semibold border-[#b45309]"
                    : "border-transparent text-stone-600 hover:bg-[#edf4fa]/60 hover:text-stone-900"
                }`}
              >
                <Icon
                  size={14}
                  className={isActive ? "text-[#b45309]" : "text-stone-500"}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Content Panel */}
        <div className="min-w-0">
          {activeSection === "workspace" && (
            <section className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-2xs sm:p-6">
              <div className="border-b border-stone-100 pb-4">
                <h2 className="m-0 font-sans text-sm font-semibold text-stone-900 sm:text-base">
                  Workspace
                </h2>
                <p className="m-0 pt-1 text-xs text-stone-500">
                  How the drafting surfaces behave while you work.
                </p>
              </div>

              <div className="pt-2 divide-y divide-stone-100">
                {/* Setting 1: Auto-save drafts */}
                <div className="flex items-center justify-between py-4 gap-4">
                  <div className="flex flex-col gap-0.5 pr-2">
                    <label
                      htmlFor="setting-auto-save"
                      className="text-xs font-semibold text-stone-900 cursor-pointer"
                    >
                      Auto-save drafts
                    </label>
                    <p className="m-0 text-xs text-stone-500">
                      Keep saving your work in the background as you type.
                    </p>
                  </div>
                  <ToggleSwitch
                    id="setting-auto-save"
                    checked={autoSave}
                    onChange={setAutoSave}
                    ariaLabel="Auto-save drafts"
                  />
                </div>

                {/* Setting 2: Confirm before deleting */}
                <div className="flex items-center justify-between py-4 gap-4">
                  <div className="flex flex-col gap-0.5 pr-2">
                    <label
                      htmlFor="setting-confirm-delete"
                      className="text-xs font-semibold text-stone-900 cursor-pointer"
                    >
                      Confirm before deleting
                    </label>
                    <p className="m-0 text-xs text-stone-500">
                      Ask for confirmation before removing a draft, note or document.
                    </p>
                  </div>
                  <ToggleSwitch
                    id="setting-confirm-delete"
                    checked={confirmDelete}
                    onChange={setConfirmDelete}
                    ariaLabel="Confirm before deleting"
                  />
                </div>
              </div>
            </section>
          )}

          {activeSection === "ai" && (
            <section className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-2xs sm:p-6">
              <div className="border-b border-stone-100 pb-4">
                <h2 className="m-0 font-sans text-sm font-semibold text-stone-900 sm:text-base">
                  AI Assistance
                </h2>
                <p className="m-0 pt-1 text-xs text-stone-500">
                  Preferences for drafting suggestions, verification agents and citations.
                </p>
              </div>
              <div className="pt-8 pb-4 text-center">
                <p className="m-0 text-xs text-stone-400">
                  AI assistance configuration will be available here.
                </p>
              </div>
            </section>
          )}

          {activeSection === "notifications" && (
            <section className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-2xs sm:p-6">
              <div className="border-b border-stone-100 pb-4">
                <h2 className="m-0 font-sans text-sm font-semibold text-stone-900 sm:text-base">
                  Notifications
                </h2>
                <p className="m-0 pt-1 text-xs text-stone-500">
                  Manage alerts for review findings, exports and matter activity.
                </p>
              </div>
              <div className="pt-8 pb-4 text-center">
                <p className="m-0 text-xs text-stone-400">
                  Notification preference controls will be available here.
                </p>
              </div>
            </section>
          )}

          {activeSection === "account" && (
            <section className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-2xs sm:p-6">
              <div className="border-b border-stone-100 pb-4">
                <h2 className="m-0 font-sans text-sm font-semibold text-stone-900 sm:text-base">
                  Account
                </h2>
                <p className="m-0 pt-1 text-xs text-stone-500">
                  Security, credentials, and sign-in preferences.
                </p>
              </div>
              <div className="pt-8 pb-4 text-center">
                <p className="m-0 text-xs text-stone-400">
                  Account security and credential settings will be available here.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
