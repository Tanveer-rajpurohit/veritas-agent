"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { agentEventEnvelope, type RunStatus } from "@veritas/shared";
import { foldEnvelope, initialRunView, isTerminal, reconnectDelayMs, runEventsUrl, type RunError, type RunView } from "./agent-state";

/** After this many failed reconnects in a row the panel offers a manual retry. */
const MAX_RECONNECT_ATTEMPTS = 6;

function parseEnvelope(data: unknown) {
  if (typeof data !== "string") return null;
  try {
    const parsed = agentEventEnvelope.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Follows one run's event stream and folds it into a RunView. On a dropped
 * connection it reopens the stream with `after=<last seq>`, so nothing is
 * shown twice or skipped. The stream is closed on a terminal run status.
 * `onStatus` hears every run-status event with the latest error seen so far.
 */
export function useRunView(workspaceId: string, runId: string | null, onStatus: (status: RunStatus, error: RunError | null) => void) {
  const [state, setState] = useState<RunView | null>(null);
  const [lostRunId, setLostRunId] = useState<string | null>(null);
  const [connectNonce, setConnectNonce] = useState(0);
  const notifyStatus = useEffectEvent(onStatus);

  useEffect(() => {
    if (!runId) return;
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastSeq = 0;
    let attempt = 0;
    let isDone = false;
    let lastError: RunError | null = null;

    const open = () => {
      source = new EventSource(runEventsUrl(workspaceId, runId, lastSeq));
      source.onopen = () => {
        attempt = 0;
        setLostRunId(null);
      };
      source.onmessage = (message) => {
        const envelope = parseEnvelope(message.data);
        if (!envelope || envelope.runId !== runId) return;
        lastSeq = Math.max(lastSeq, envelope.seq);
        setState((prev) => foldEnvelope(prev?.runId === runId ? prev : initialRunView(runId), envelope));
        const { event } = envelope;
        if (event.type === "error")
          lastError = {
            code: event.code,
            message: event.message,
            retryable: event.retryable,
          };
        if (event.type !== "run-status") return;
        if (event.status === "running") lastError = null;
        if (isTerminal(event.status)) {
          isDone = true;
          source?.close();
        }
        notifyStatus(event.status, lastError);
      };
      source.onerror = () => {
        // The browser's own retry would resend Last-Event-ID too, but it also
        // retries after the server ends a finished stream, so reconnects are ours.
        source?.close();
        if (isDone) return;
        if (attempt >= MAX_RECONNECT_ATTEMPTS) {
          setLostRunId(runId);
          return;
        }
        timer = setTimeout(open, reconnectDelayMs(attempt++));
      };
    };

    open();
    return () => {
      isDone = true;
      clearTimeout(timer);
      source?.close();
    };
  }, [workspaceId, runId, connectNonce]);

  const view = runId ? (state?.runId === runId ? state : initialRunView(runId)) : null;
  return {
    view,
    isDisconnected: runId !== null && lostRunId === runId,
    reconnect: () => {
      setLostRunId(null);
      setConnectNonce((n) => n + 1);
    },
  };
}
