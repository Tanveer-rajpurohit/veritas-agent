import { askUserInput } from "@veritas/shared";
import { tool, type Tool, type ToolSet } from "ai";
import { z } from "zod";

/**
 * read: no side effects. write: changes workspace state inside the agent's
 * sandbox. gated: needs an explicit user approval in the UI before it runs.
 */
export type ToolClass = "read" | "write" | "gated";

/**
 * Context bound by the host for one run. Tools take the workspace from here,
 * never from model-supplied arguments, so a model can't reach another workspace.
 */
export type ToolContext = { workspaceId: string; userId: string; runId: string };

export type ToolDefinition<I = unknown, O = unknown> = {
  name: string;
  description: string;
  kind: ToolClass;
  input: z.ZodType<I>;
  /** Required when there is no execute: describes the result the host supplies. */
  output?: z.ZodType<O>;
  /** Omitted for tools the host answers out of band (ask_user). */
  execute?: (input: I, ctx: ToolContext, signal: AbortSignal | undefined) => Promise<O>;
};

/**
 * Type-checks a tool against its schema, then erases the generics so tools of
 * different shapes share one registry. Safe because the AI SDK validates every
 * call against `input` before `execute` runs.
 */
export function defineTool<I, O>(definition: ToolDefinition<I, O>): ToolDefinition {
  return definition as unknown as ToolDefinition;
}

export const ASK_USER_TOOL = "ask_user";
export const TOOL_FAILED_MESSAGE = "The tool failed. Continue without it or try again later.";

export const askUserAnswer = z.object({ answer: z.string(), source: z.enum(["option", "other"]) });
export type AskUserAnswer = z.infer<typeof askUserAnswer>;

/** F059: pauses the run until the user answers. Has no execute, so the AI SDK stops the loop on it. */
export const askUserTool = defineTool({
  name: ASK_USER_TOOL,
  description:
    "Ask the user one clarifying question when the request is ambiguous and a wrong guess would waste their time. " +
    "Offer 2 to 4 short options; set allowOther to true when a free-text answer makes sense. The run pauses until they answer.",
  kind: "read",
  input: askUserInput,
  output: askUserAnswer,
});

/**
 * Converts definitions into an AI SDK tool set with the run context closed
 * over. Gated tools are left out until the approval flow exists, so nothing
 * that needs a click can run without one.
 */
export function toToolSet(definitions: readonly ToolDefinition[], ctx: ToolContext): ToolSet {
  const set: ToolSet = {};
  for (const def of definitions) {
    if (def.kind === "gated") continue;
    const execute = def.execute;
    const entry: Tool = execute
      ? tool({
          description: def.description,
          inputSchema: def.input,
          execute: async (input: unknown, options) => {
            try {
              return await execute(input, ctx, options.abortSignal);
            } catch {
              // The message lands in model history and the event stream; keep internals out of both.
              throw new Error(TOOL_FAILED_MESSAGE);
            }
          },
        })
      : tool({ description: def.description, inputSchema: def.input, outputSchema: def.output ?? z.unknown() });
    set[def.name] = entry;
  }
  return set;
}
