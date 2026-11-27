import { describe, expect, it } from "vitest";
import type { AgentEvent, AgentEventEnvelope } from "@veritas/shared";
import {
  describeToolStep,
  foldEnvelope,
  formatElapsed,
  formatProvenance,
  initialRunView,
  isTerminal,
  reconnectDelayMs,
  runEventsUrl,
  textOfParts,
  toolStepsOfParts,
  type RunView,
} from "./agent-state";

const RUN = "0190a3c4-5b6d-7e8f-9a0b-1c2d3e4f5a6b";
const QUESTION = "0190a3c4-5b6d-7e8f-9a0b-1c2d3e4f5a6c";
const AT = "2026-11-27T14:02:00.000Z";

const envelopes = (events: AgentEvent[], firstSeq = 1): AgentEventEnvelope[] => events.map((event, i) => ({ runId: RUN, seq: firstSeq + i, event }));
const fold = (events: AgentEventEnvelope[], start: RunView = initialRunView(RUN)) => events.reduce(foldEnvelope, start);
const status = (s: Extract<AgentEvent, { type: "run-status" }>["status"]): AgentEvent => ({
  type: "run-status",
  status: s,
  modelId: "gemini-pro",
  at: AT,
});

describe("foldEnvelope", () => {
  it("accumulates streamed text and reasoning, and records the model and start time", () => {
    const view = fold(
      envelopes([
        status("running"),
        { type: "reasoning-delta", text: "Checking " },
        { type: "reasoning-delta", text: "files" },
        { type: "text-delta", text: "Hello" },
        { type: "text-delta", text: " there" },
      ]),
    );
    expect(view).toMatchObject({
      status: "running",
      modelId: "gemini-pro",
      startedAt: AT,
      text: "Hello there",
      reasoning: "Checking files",
      lastSeq: 5,
    });
  });

  it("turns tool calls into step lines and marks them done or failed from their results", () => {
    const view = fold(
      envelopes([
        status("running"),
        {
          type: "tool-call",
          toolCallId: "c1",
          toolName: "list_workspace_files",
          input: {},
        },
        {
          type: "tool-call",
          toolCallId: "c2",
          toolName: "read_file",
          input: { name: "Q3 report.pdf" },
        },
        {
          type: "tool-result",
          toolCallId: "c1",
          toolName: "list_workspace_files",
          output: { files: [] },
          isError: false,
        },
        {
          type: "tool-result",
          toolCallId: "c2",
          toolName: "read_file",
          output: "denied",
          isError: true,
        },
      ]),
    );
    expect(view.steps.map((s) => [s.label, s.status])).toEqual([
      ["Listing workspace files", "done"],
      ["Reading Q3 report.pdf", "failed"],
    ]);
    expect(view.steps[0]!.output).toEqual({ files: [] });
  });

  it("holds an ask-user question, clears saved text on pause, and drops the question when the run resumes", () => {
    const paused = fold(
      envelopes([
        status("running"),
        { type: "text-delta", text: "Let me check." },
        {
          type: "tool-call",
          toolCallId: "q1",
          toolName: "ask_user",
          input: {},
        },
        {
          type: "ask-user",
          questionId: QUESTION,
          toolCallId: "q1",
          question: "What kind of agreement?",
          options: [{ label: "NDA", description: "Mutual" }, { label: "Lease" }],
          allowOther: true,
        },
        status("awaiting_answer"),
      ]),
    );
    expect(paused.status).toBe("awaiting_answer");
    expect(paused.question).toEqual({
      questionId: QUESTION,
      question: "What kind of agreement?",
      options: [{ label: "NDA", description: "Mutual" }, { label: "Lease" }],
      allowOther: true,
    });
    expect(paused.steps).toEqual([]);
    expect(paused.text).toBe("");

    const resumed = fold(envelopes([status("running"), { type: "text-delta", text: "Drafting an NDA." }], 6), paused);
    expect(resumed.question).toBeNull();
    expect(resumed.text).toBe("Drafting an NDA.");
    expect(resumed.startedAt).toBe(AT);
  });

  it("records errors and terminal status", () => {
    const view = fold(
      envelopes([
        status("running"),
        {
          type: "error",
          code: "rate_limited",
          message: "Slow down.",
          retryable: true,
        },
        status("failed"),
      ]),
    );
    expect(view.error).toEqual({
      code: "rate_limited",
      message: "Slow down.",
      retryable: true,
    });
    expect(view.status).toBe("failed");
    expect(isTerminal(view.status)).toBe(true);
    expect(isTerminal("awaiting_answer")).toBe(false);
  });

  it("ignores replayed and foreign events, so resuming after a reconnect never duplicates text", () => {
    const first = fold(envelopes([status("running"), { type: "text-delta", text: "Hel" }]));
    // The server replays from `after`, but a reconnect can overlap; both must fold to the same state.
    const replay = envelopes([status("running"), { type: "text-delta", text: "Hel" }, { type: "text-delta", text: "lo" }]);
    const resumed = fold(replay, first);
    expect(resumed.text).toBe("Hello");
    expect(resumed.lastSeq).toBe(3);

    const foreign: AgentEventEnvelope = {
      runId: QUESTION,
      seq: 9,
      event: { type: "text-delta", text: "x" },
    };
    expect(foldEnvelope(resumed, foreign)).toBe(resumed);
  });
});

describe("resume", () => {
  it("builds the events URL with the last applied seq", () => {
    expect(runEventsUrl("ws", RUN, 0)).toBe(`/api/v1/workspaces/ws/agent/runs/${RUN}/events`);
    const view = fold(envelopes([status("running"), { type: "text-delta", text: "a" }, { type: "text-delta", text: "b" }]));
    expect(runEventsUrl("ws", RUN, view.lastSeq)).toBe(`/api/v1/workspaces/ws/agent/runs/${RUN}/events?after=3`);
  });

  it("backs off exponentially up to a cap", () => {
    expect([0, 1, 2, 3].map(reconnectDelayMs)).toEqual([500, 1000, 2000, 4000]);
    expect(reconnectDelayMs(20)).toBe(10_000);
  });
});

describe("formatElapsed", () => {
  it.each([
    [0, "0s"],
    [12_400, "12s"],
    [65_000, "1m 05s"],
    [3_720_000, "1h 02m"],
    [-5, "0s"],
  ])("%i ms reads %s", (ms, text) => {
    expect(formatElapsed(ms)).toBe(text);
  });
});

describe("formatProvenance", () => {
  const options = {
    locale: "en-GB",
    timeZone: "UTC",
    now: new Date("2026-11-27T18:00:00Z"),
  };

  it("shows the model and time for today's messages, with the full time and duration for the tooltip", () => {
    const p = formatProvenance("Gemini 3.1 Pro", { startedAt: "2026-11-27T14:01:48Z", finishedAt: "2026-11-27T14:02:05Z" }, options);
    expect(p.short).toBe("Gemini 3.1 Pro · 14:02");
    expect(p.full).toBe("Written by Gemini 3.1 Pro on 27 Nov 2026, 14:02:05. Took 17s.");
  });

  it("adds the date for older messages and the year for last year's", () => {
    expect(
      formatProvenance(
        "Flash",
        {
          startedAt: "2026-11-25T09:30:00Z",
          finishedAt: "2026-11-25T09:30:04Z",
        },
        options,
      ).short,
    ).toBe("Flash · 25 Nov, 09:30");
    expect(
      formatProvenance(
        "Flash",
        {
          startedAt: "2025-03-02T09:30:00Z",
          finishedAt: "2025-03-02T09:30:04Z",
        },
        options,
      ).short,
    ).toBe("Flash · 2 Mar 2025, 09:30");
  });
});

describe("stored message parts", () => {
  it("reads text parts and tool-call steps, leaving out ask_user", () => {
    const parts = [
      { type: "text", text: "Here you go." },
      {
        type: "tool-call",
        toolCallId: "c1",
        toolName: "list_workspace_files",
        input: { query: "term" },
      },
      { type: "tool-call", toolCallId: "q1", toolName: "ask_user", input: {} },
      { type: "reasoning", text: "hidden" },
      "junk",
    ];
    expect(textOfParts(parts)).toEqual(["Here you go."]);
    expect(toolStepsOfParts(parts)).toEqual(['Looking for files named "term"']);
  });

  it("describes unknown tools in plain words", () => {
    expect(describeToolStep("sheets.set_range", null)).toBe("Using sheets set range");
  });
});
