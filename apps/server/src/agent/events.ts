import { agentEvents, eq, sql } from "@veritas/db";
import type { AgentEvent, AgentEventEnvelope } from "@veritas/shared";
import type { FastifyBaseLogger } from "fastify";
import type { Redis } from "ioredis";
import type { Deps } from "../deps";

export const runChannel = (runId: string) => `run:${runId}`;

export type EmitEvent = (event: AgentEvent) => Promise<void>;

/**
 * Persists each event to agent_events with the next seq, then publishes it.
 * Postgres is the source of truth: a failed publish is logged, and clients
 * catch up from the table when they reconnect.
 */
export async function openRecorder(deps: Deps, log: FastifyBaseLogger, runId: string): Promise<EmitEvent> {
  const [row] = await deps.db
    .select({ max: sql<number | null>`max(${agentEvents.seq})` })
    .from(agentEvents)
    .where(eq(agentEvents.runId, runId));
  let seq = Number(row?.max ?? 0);

  return async (event) => {
    seq += 1;
    const envelope: AgentEventEnvelope = { runId, seq, event };
    await deps.db.insert(agentEvents).values({ runId, seq, type: event.type, payload: event });
    try {
      await deps.redis.publish(runChannel(runId), JSON.stringify(envelope));
    } catch {
      log.warn({ runId, seq }, "agent event publish failed");
    }
  };
}

type Listener = (message: string) => void;

/**
 * One shared Redis subscriber connection for every SSE client, instead of a
 * connection per open stream. Map updates happen before each await, and
 * ioredis runs commands in order, so a quick unsubscribe/resubscribe settles
 * on the right state.
 */
export function createEventHub(redis: Redis) {
  let subscriber: Redis | null = null;
  const listeners = new Map<string, Set<Listener>>();

  const connection = () => {
    if (!subscriber) {
      subscriber = redis.duplicate();
      subscriber.on("message", (channel: string, message: string) => {
        for (const listener of listeners.get(channel) ?? []) listener(message);
      });
    }
    return subscriber;
  };

  return {
    async subscribe(channel: string, listener: Listener): Promise<() => Promise<void>> {
      let set = listeners.get(channel);
      if (!set) {
        set = new Set();
        listeners.set(channel, set);
        set.add(listener);
        await connection().subscribe(channel);
      } else {
        set.add(listener);
      }
      const owned = set;
      return async () => {
        owned.delete(listener);
        if (owned.size === 0 && listeners.get(channel) === owned) {
          listeners.delete(channel);
          await subscriber?.unsubscribe(channel);
        }
      };
    },
    close() {
      subscriber?.disconnect();
      subscriber = null;
      listeners.clear();
    },
  };
}

export type EventHub = ReturnType<typeof createEventHub>;
