"use client";

import { Fragment, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { SPLIT_MAX, SPLIT_MIN } from "@veritas/shared";
import { useDesktop } from "./desktop-provider";
import { WindowFrame } from "./window-frame";

/** Each window keeps at least this much width when two share the stage. */
const MIN_PANE_PX = 320;
const KEYBOARD_STEP = 0.02;

export function Stage() {
  const { layout, dispatch } = useDesktop();
  const stageRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  const clampForWidth = (split: number) => {
    const width = stageRef.current?.getBoundingClientRect().width ?? 0;
    const minFraction = width > 0 ? Math.min(0.5, MIN_PANE_PX / width) : SPLIT_MIN;
    return Math.min(Math.min(SPLIT_MAX, 1 - minFraction), Math.max(Math.max(SPLIT_MIN, minFraction), split));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const split = clampForWidth((event.clientX - rect.left) / rect.width);
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => dispatch({ type: "setSplit", split }));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = event.key === "ArrowLeft" ? -KEYBOARD_STEP : event.key === "ArrowRight" ? KEYBOARD_STEP : 0;
    if (delta === 0) return;
    event.preventDefault();
    dispatch({ type: "setSplit", split: clampForWidth(layout.split + delta) });
  };

  if (layout.panes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex max-w-xs flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-8 py-8 text-center shadow-raised">
          <p className="text-base font-semibold">This desktop is empty</p>
          <p className="text-sm text-ink-muted">Open an app from the dock below. Right-click an app to open it beside another.</p>
        </div>
      </div>
    );
  }

  const isSplit = layout.panes.length === 2;

  return (
    <div ref={stageRef} className="flex h-full min-w-0">
      {layout.panes.map((pane, index) => {
        const isFocused = pane.id === (layout.focusedPaneId ?? layout.panes[0]?.id);
        const grow = isSplit ? (index === 0 ? layout.split : 1 - layout.split) : 1;
        return (
          <Fragment key={pane.id}>
            {index === 1 ? (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize windows"
                aria-valuemin={Math.round(SPLIT_MIN * 100)}
                aria-valuemax={Math.round(SPLIT_MAX * 100)}
                aria-valuenow={Math.round(layout.split * 100)}
                tabIndex={0}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onKeyDown={onKeyDown}
                className="group flex w-2 shrink-0 cursor-col-resize touch-none items-center justify-center max-md:hidden"
              >
                <span className="h-12 w-1 rounded-full bg-line-strong transition-colors duration-150 group-hover:bg-ink-subtle group-focus-visible:bg-focus" />
              </div>
            ) : null}
            <div
              data-pane-id={pane.id}
              style={{ flexGrow: grow, flexBasis: 0 }}
              className={isSplit ? (isFocused ? "min-w-0 md:min-w-80" : "min-w-0 max-md:hidden md:min-w-80") : "min-w-0"}
            >
              <WindowFrame pane={pane} isFocused={isFocused} />
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
