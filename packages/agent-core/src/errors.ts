import type { AgentErrorCode } from "@veritas/shared";
import { APICallError, RetryError } from "ai";
import { PROVIDER_UNAVAILABLE_MESSAGE } from "./models";

export type AgentErrorInfo = {
  code: AgentErrorCode;
  /** Calm, user-facing copy. Never the provider's raw message, which can echo prompts. */
  message: string;
  retryable: boolean;
  /** HTTP status from the provider, for logs only. */
  statusCode?: number;
};

function statusOf(error: unknown): number | undefined {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  return APICallError.isInstance(cause) ? cause.statusCode : undefined;
}

export function toAgentError(error: unknown): AgentErrorInfo {
  const statusCode = statusOf(error);
  if (statusCode === 429) {
    return { code: "rate_limited", message: "The model is busy right now. Wait a moment and try again.", retryable: true, statusCode };
  }
  if (statusCode !== undefined && statusCode >= 500) {
    return { code: "provider_error", message: "The model provider had a problem. Try again in a moment.", retryable: true, statusCode };
  }
  if (statusCode === 401 || statusCode === 403) {
    return { code: "provider_unavailable", message: PROVIDER_UNAVAILABLE_MESSAGE, retryable: false, statusCode };
  }
  if (statusCode !== undefined) {
    return { code: "provider_error", message: "The model couldn't handle this request. Try rephrasing it.", retryable: false, statusCode };
  }
  return { code: "internal", message: "Something went wrong while running the agent. Try again.", retryable: true };
}
