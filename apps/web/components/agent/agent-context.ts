"use client";

import { useSyncExternalStore } from "react";
import { CONTEXT_REFS_MAX, type ContextRef } from "@veritas/shared";

/** A context chip: what is sent with the message, and the pill text shown for it. */
export type AgentContextChip = { ref: ContextRef; label: string };

type ContextState = {
  /** Chips attached to the next message. */
  chips: readonly AgentContextChip[];
  /** Chips other apps offer in the @ menu, such as the open sheet's selected range. */
  offers: readonly AgentContextChip[];
};

export function chipKey(ref: ContextRef): string {
  switch (ref.kind) {
    case "file":
      return `file:${ref.fileId}`;
    case "sheet-range":
      return `sheet-range:${ref.fileId}:${ref.range}`;
    case "slide":
      return `slide:${ref.fileId}:${ref.slideIndex}`;
    case "email":
      return `email:${ref.messageId}`;
  }
}

const EMPTY: ContextState = { chips: [], offers: [] };
let state: ContextState = EMPTY;
const listeners = new Set<() => void>();

function update(next: ContextState) {
  state = next;
  for (const listener of listeners) listener();
}

const withoutKey = (list: readonly AgentContextChip[], key: string) => list.filter((c) => chipKey(c.ref) !== key);

/** Attaches a chip to the next message. Returns false when the message already has the maximum. */
export function addAgentContextChip(chip: AgentContextChip): boolean {
  const key = chipKey(chip.ref);
  if (state.chips.some((c) => chipKey(c.ref) === key)) return true;
  if (state.chips.length >= CONTEXT_REFS_MAX) return false;
  update({ ...state, chips: [...state.chips, chip] });
  return true;
}

export function removeAgentContextChip(ref: ContextRef) {
  update({ ...state, chips: withoutKey(state.chips, chipKey(ref)) });
}

export function clearAgentContextChips() {
  if (state.chips.length > 0) update({ ...state, chips: [] });
}

/** Lists a chip in the @ menu, replacing an earlier offer for the same thing. */
export function offerAgentContext(chip: AgentContextChip) {
  update({
    ...state,
    offers: [...withoutKey(state.offers, chipKey(chip.ref)), chip],
  });
}

export function withdrawAgentContext(ref: ContextRef) {
  update({ ...state, offers: withoutKey(state.offers, chipKey(ref)) });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Shared agent context for any app. A sheet can call `offer` with its selected
 * range, or `add` to attach it directly; the agent panel reads `chips` when it sends.
 */
export function useAgentContext() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  );
  return {
    chips: snapshot.chips,
    offers: snapshot.offers,
    add: addAgentContextChip,
    remove: removeAgentContextChip,
    clear: clearAgentContextChips,
    offer: offerAgentContext,
    withdraw: withdrawAgentContext,
  };
}
