"use client";

import { SettingsIcon } from "@veritas/ui";
import { useDesktop } from "@/components/desktop/desktop-provider";
import { ConnectedAccounts } from "./connected-accounts";

export function SettingsApp() {
  const { workspaceId } = useDesktop();
  return (
    <div className="flex h-full min-h-64 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-4">
        <SettingsIcon className="size-4 text-ink-muted" />
        <h1 className="text-sm font-semibold">Settings</h1>
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6">
        <ConnectedAccounts workspaceId={workspaceId} />
      </div>
    </div>
  );
}
