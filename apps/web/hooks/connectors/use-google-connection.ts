"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConnectorList } from "@veritas/shared";
import { apiFetch } from "@/lib/api-client";
import { googleConnection, type GoogleConnection } from "@/lib/google-connector";

export type GoogleConnectionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; connection: GoogleConnection };

async function loadConnection(workspaceId: string): Promise<GoogleConnectionState> {
  const result = await apiFetch<ConnectorList>(`/api/v1/workspaces/${workspaceId}/connectors`);
  return result.ok
    ? { status: "ready", connection: googleConnection(result.data.connectors) }
    : { status: "error", message: result.error.error };
}

/** The caller's Google connection in this workspace. `reload` refetches it, e.g. after Mail is told the connection is gone. */
export function useGoogleConnection(workspaceId: string) {
  const [state, setState] = useState<GoogleConnectionState>({ status: "loading" });

  useEffect(() => {
    let isCurrent = true;
    void loadConnection(workspaceId).then((next) => {
      if (isCurrent) setState(next);
    });
    return () => {
      isCurrent = false;
    };
  }, [workspaceId]);

  const reload = useCallback(async () => {
    setState({ status: "loading" });
    setState(await loadConnection(workspaceId));
  }, [workspaceId]);

  return { state, reload };
}
