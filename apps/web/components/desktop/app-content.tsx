import type { AppId } from "@veritas/shared";
import { FilesApp } from "@/components/apps/files/files-app";
import { MailApp } from "@/components/apps/mail/mail-app";
import { SettingsApp } from "@/components/apps/settings/settings-app";
import { AgentPanel } from "@/components/agent/agent-panel";
import { getApp } from "@/lib/apps";
import { useDesktop } from "./desktop-provider";

function HomeContent() {
  const { workspaceName } = useDesktop();
  return (
    <div className="flex flex-col gap-2 px-6 py-8 sm:px-8">
      <p className="font-mono text-xs tracking-wide text-ink-muted uppercase">Home</p>
      <h1 className="text-3xl font-semibold tracking-tight">{workspaceName}</h1>
    </div>
  );
}

/** An app's window body until its real editor lands. */
function PlaceholderContent({ app }: { app: AppId }) {
  const { label, icon: Icon, emptyTitle, emptyBody } = getApp(app);
  return (
    <div className="flex h-full min-h-64 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 px-6">
        <Icon className="size-4 text-ink-muted" />
        <h1 className="text-sm font-semibold">{label}</h1>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 pb-12">
        <div className="flex max-w-sm flex-col items-center gap-2 text-center">
          <p className="text-lg font-semibold">{emptyTitle}</p>
          <p className="text-sm text-ink-muted">{emptyBody}</p>
        </div>
      </div>
    </div>
  );
}

function AgentContent() {
  const { workspaceId } = useDesktop();
  // The tab names the window; the panel's visible heading is the thread title.
  return (
    <div className="flex h-full flex-col">
      <h1 className="sr-only">Agent</h1>
      <AgentPanel workspaceId={workspaceId} />
    </div>
  );
}

export function AppContent({ app }: { app: AppId }) {
  switch (app) {
    case "home":
      return <HomeContent />;
    case "mail":
      return <MailApp />;
    case "files":
      return <FilesApp />;
    case "settings":
      return <SettingsApp />;
    case "agent":
      return <AgentContent />;
    default:
      return <PlaceholderContent app={app} />;
  }
}
