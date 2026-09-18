"use client";

import React from "react";

/**
 * Common shimmer block with consistent theme palette.
 */
export function Shimmer({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded bg-stone-200/80 ${className}`}
      style={style}
    />
  );
}

/**
 * Sidebar skeleton mirroring the AppSidebar component.
 */
export function SidebarSkeleton({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <aside className="hidden md:flex flex-col items-center py-4 w-16 border-r border-stone-200 bg-white shrink-0 space-y-6">
        <Shimmer className="h-8 w-8 rounded-lg bg-[#cbe0f2]" />
        <div className="space-y-4">
          <Shimmer className="h-7 w-7 rounded-lg" />
          <Shimmer className="h-7 w-7 rounded-lg" />
          <Shimmer className="h-7 w-7 rounded-lg" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-stone-200 bg-white shrink-0 p-4 justify-between h-full select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <Shimmer className="h-8 w-8 rounded-lg bg-[#cbe0f2]" />
          <div className="space-y-1.5">
            <Shimmer className="h-4 w-24 bg-stone-300" />
            <Shimmer className="h-2.5 w-32" />
          </div>
        </div>

        {/* Primary Action Button */}
        <Shimmer className="h-9 w-full rounded-md bg-[#cbe0f2]" />

        {/* Nav Items */}
        <div className="space-y-2 pt-1">
          <Shimmer className="h-8 w-full rounded-md" />
          <Shimmer className="h-8 w-full rounded-md" />
          <Shimmer className="h-8 w-full rounded-md" />
          <Shimmer className="h-8 w-full rounded-md" />
        </div>

        {/* Recents Section */}
        <div className="space-y-2.5 pt-4 border-t border-stone-100">
          <Shimmer className="h-3 w-16 bg-stone-300" />
          <Shimmer className="h-7 w-full rounded" />
          <Shimmer className="h-7 w-full rounded" />
          <Shimmer className="h-7 w-full rounded" />
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="flex items-center gap-2.5 pt-4 border-t border-stone-100">
        <Shimmer className="h-8 w-8 rounded-full bg-stone-300" />
        <div className="space-y-1">
          <Shimmer className="h-3.5 w-24" />
          <Shimmer className="h-2.5 w-32" />
        </div>
      </div>
    </aside>
  );
}

/**
 * Workspace Dashboard Skeleton loader.
 * Renders the top metrics cards, search & filter controls, and 6-card matter grid.
 */
export function WorkspaceSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#eaf0f6] p-2 md:p-3">
      {/* Left Sidebar */}
      <SidebarSkeleton />

      {/* Main Workspace Area */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-stone-200/90 bg-white p-6 space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-100">
          <div className="space-y-2">
            <Shimmer className="h-6 w-48 bg-stone-300" />
            <Shimmer className="h-3.5 w-80" />
          </div>
          <div className="flex items-center gap-2.5">
            <Shimmer className="h-9 w-28 rounded-md bg-stone-200" />
            <Shimmer className="h-9 w-32 rounded-md bg-[#cbe0f2]" />
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-stone-200/90 bg-[#fafcfd] p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <Shimmer className="h-3 w-24" />
                <Shimmer className="h-6 w-6 rounded-md bg-[#edf4fa]" />
              </div>
              <Shimmer className="h-7 w-16 bg-stone-300" />
              <Shimmer className="h-2.5 w-36" />
            </div>
          ))}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <Shimmer className="h-9 w-full sm:w-80 rounded-md" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Shimmer className="h-9 w-36 rounded-md" />
            <Shimmer className="h-9 w-28 rounded-md" />
          </div>
        </div>

        {/* Matters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-y-auto pr-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-stone-200 bg-white p-5 space-y-4 shadow-2xs"
            >
              {/* Card Top: Jurisdiction badge & Status */}
              <div className="flex items-center justify-between">
                <Shimmer className="h-5 w-24 rounded-full bg-[#edf4fa]" />
                <Shimmer className="h-4 w-16 rounded" />
              </div>

              {/* Title & Forum */}
              <div className="space-y-1.5">
                <Shimmer className="h-4 w-52 bg-stone-300" />
                <Shimmer className="h-3 w-36" />
              </div>

              {/* Facts / Evidence preview */}
              <div className="space-y-1.5 pt-2">
                <Shimmer className="h-2.5 w-full" />
                <Shimmer className="h-2.5 w-4/5" />
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                <Shimmer className="h-3 w-20" />
                <Shimmer className="h-4 w-12 rounded bg-[#cbe0f2]" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/**
 * Agent Chat View Skeleton loader.
 * Renders the sidebar + chat thread + thinking stream + composer box.
 */
export function AgentChatSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#eaf0f6] p-2 md:p-3">
      {/* Left Sidebar */}
      <SidebarSkeleton />

      {/* Chat Area */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-stone-200/90 bg-white shadow-2xs">
        {/* Top Chat Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3 bg-stone-50/50">
          <div className="flex items-center gap-3">
            <Shimmer className="h-7 w-7 rounded-full bg-[#cbe0f2]" />
            <div className="space-y-1">
              <Shimmer className="h-4 w-44 bg-stone-300" />
              <Shimmer className="h-2.5 w-28" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shimmer className="h-8 w-24 rounded-md" />
            <Shimmer className="h-8 w-8 rounded-md" />
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* User message (Right-aligned) */}
          <div className="flex justify-end">
            <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-[#2c5478]/20 p-4 space-y-2">
              <Shimmer className="h-3.5 w-72 bg-[#2c5478]/40" />
              <Shimmer className="h-3.5 w-52 bg-[#2c5478]/30" />
            </div>
          </div>

          {/* Agent response (Left-aligned) */}
          <div className="flex items-start gap-3.5 max-w-[85%]">
            <Shimmer className="h-8 w-8 rounded-full bg-[#487aa8]/30 shrink-0 mt-1" />
            <div className="flex-1 space-y-4">
              {/* Agent Title */}
              <div className="flex items-center gap-2">
                <Shimmer className="h-4 w-32 bg-stone-300" />
                <Shimmer className="h-4 w-16 rounded-full bg-[#edf4fa]" />
              </div>

              {/* Thinking Orb / Reasoning Box Skeleton */}
              <div className="rounded-xl border border-[#cbe0f2] bg-[#f7fafd] p-3.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Shimmer className="h-3.5 w-3.5 rounded-full bg-[#487aa8]" />
                  <Shimmer className="h-3 w-40 bg-stone-300" />
                </div>
                <div className="space-y-1.5 pl-5">
                  <Shimmer className="h-2.5 w-full" />
                  <Shimmer className="h-2.5 w-11/12" />
                  <Shimmer className="h-2.5 w-3/4" />
                </div>
              </div>

              {/* Legal Text Response */}
              <div className="space-y-2 pt-1">
                <Shimmer className="h-3.5 w-full" />
                <Shimmer className="h-3.5 w-[96%]" />
                <Shimmer className="h-3.5 w-[92%]" />
                <Shimmer className="h-3.5 w-[85%]" />
              </div>

              {/* Citations Chip Row */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Shimmer className="h-6 w-44 rounded-full bg-[#edf4fa]" />
                <Shimmer className="h-6 w-52 rounded-full bg-[#edf4fa]" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Composer Bar */}
        <div className="p-4 border-t border-stone-200 bg-white">
          <div className="flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-50/50 p-2.5">
            <Shimmer className="h-7 w-7 rounded-md" />
            <Shimmer className="h-5 flex-1 rounded" />
            <Shimmer className="h-8 w-8 rounded-lg bg-[#cbe0f2]" />
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Drafting Editor Skeleton loader.
 * Renders the top header, toolbar buttons, and paginated A4 sheet document preview.
 */
export function DraftingSkeleton() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#eaf0f6]">
      {/* Top Header */}
      <header className="flex h-14 w-full items-center justify-between border-b border-stone-200 bg-white px-5 shrink-0">
        <div className="flex items-center gap-3">
          <Shimmer className="h-8 w-8 rounded-md" />
          <div className="space-y-1">
            <Shimmer className="h-4 w-52 bg-stone-300" />
            <Shimmer className="h-2.5 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-8 w-24 rounded-md" />
          <Shimmer className="h-8 w-28 rounded-md bg-[#cbe0f2]" />
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex h-10 w-full items-center gap-2 border-b border-stone-200 bg-white px-5 shrink-0">
        <Shimmer className="h-6 w-16 rounded" />
        <div className="h-4 w-px bg-stone-200" />
        <Shimmer className="h-6 w-24 rounded" />
        <Shimmer className="h-6 w-12 rounded" />
        <div className="h-4 w-px bg-stone-200" />
        <div className="flex gap-1">
          <Shimmer className="h-6 w-6 rounded" />
          <Shimmer className="h-6 w-6 rounded" />
          <Shimmer className="h-6 w-6 rounded" />
        </div>
        <div className="h-4 w-px bg-stone-200" />
        <Shimmer className="h-6 w-28 rounded bg-[#edf4fa]" />
      </div>

      {/* Canvas Area with Centered A4 Sheet */}
      <div className="flex-1 overflow-y-auto py-8 pb-32 flex justify-center">
        <div className="w-[794px] min-h-[1123px] rounded bg-white p-12 shadow-xl border border-stone-200/90 space-y-7">
          {/* Running Header */}
          <div className="flex justify-between items-center border-b border-stone-200 pb-3">
            <Shimmer className="h-3 w-56" />
            <Shimmer className="h-3 w-20" />
          </div>

          {/* Forum & Cause Title */}
          <div className="space-y-2 py-4 border-b border-stone-200 flex flex-col items-center">
            <Shimmer className="h-3.5 w-72 bg-stone-300" />
            <Shimmer className="h-3 w-48" />
            <Shimmer className="h-3 w-60" />
          </div>

          {/* Section 1 */}
          <div className="space-y-3 pt-2">
            <Shimmer className="h-4 w-64 bg-[#cbe0f2]" />
            <div className="space-y-2">
              <Shimmer className="h-3 w-full" />
              <Shimmer className="h-3 w-[96%]" />
              <Shimmer className="h-3 w-[91%]" />
              <Shimmer className="h-3 w-[84%]" />
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-3 pt-4">
            <Shimmer className="h-4 w-52 bg-[#cbe0f2]" />
            <div className="space-y-2">
              <Shimmer className="h-3 w-[98%]" />
              <Shimmer className="h-3 w-[93%]" />
              <Shimmer className="h-3 w-[88%]" />
            </div>
          </div>

          {/* Precedent Citation Block */}
          <div className="p-4 bg-[#edf4fa] border-l-4 border-[#487aa8] rounded-r space-y-2">
            <Shimmer className="h-3.5 w-60 bg-[#cbe0f2]" />
            <Shimmer className="h-3 w-80" />
            <Shimmer className="h-2.5 w-48" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Matter Detail View Skeleton loader.
 */
export function MatterDetailSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
        <Shimmer className="h-8 w-8 rounded-md" />
        <div className="space-y-1.5">
          <Shimmer className="h-6 w-64 bg-stone-300" />
          <Shimmer className="h-3 w-40" />
        </div>
      </div>

      {/* Facts Card */}
      <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-5 space-y-3">
        <Shimmer className="h-4 w-32 bg-stone-300" />
        <div className="space-y-2">
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-5/6" />
        </div>
      </div>

      {/* Evidence Documents Table */}
      <div className="space-y-3 pt-2">
        <Shimmer className="h-4 w-40 bg-stone-300" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-stone-200 p-3.5"
            >
              <div className="flex items-center gap-3">
                <Shimmer className="h-8 w-8 rounded-md bg-[#edf4fa]" />
                <div className="space-y-1">
                  <Shimmer className="h-3.5 w-48" />
                  <Shimmer className="h-2.5 w-24" />
                </div>
              </div>
              <Shimmer className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
