"use client";

import { useEffect, useId, useMemo, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { AgentIcon, cx, SettingsIcon, SidebarIcon, SplitIcon } from "@veritas/ui";
import { APPS } from "@/lib/apps";
import { queueAgentPrompt } from "../agent/agent-context";
import { applyTheme } from "../theme-switch";
import { useDesktop } from "./desktop-provider";
import { openApps } from "./layout-reducer";
import { filterCommands, withAskRow, type PromptCommand } from "./prompt-commands";

type Row = PromptCommand & { icon: ComponentType<{ className?: string }>; run: () => void };

const isPaletteShortcut = (event: globalThis.KeyboardEvent) => event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey) && !event.altKey;

/**
 * The prompt window (Ctrl/Cmd+K): open apps, switch desktops and themes, or type anything
 * and press Enter to ask the agent, which opens beside the current app.
 */
export function PromptWindow() {
  const { layout, dispatch, desktops, currentDesktopId, selectDesktop } = useDesktop();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!isPaletteShortcut(event)) return;
      event.preventDefault();
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (dialog.open) {
        dialog.close();
        return;
      }
      setQuery("");
      setActiveIndex(0);
      // showModal traps focus and restores it to the previous element on close.
      dialog.showModal();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const commands = useMemo<Row[]>(() => {
    const appRows = APPS.flatMap(({ id, label, icon }): Row[] => {
      const open: Row = { id: `open-${id}`, label: `Open ${label}`, keywords: id, icon, run: () => dispatch({ type: "open", app: id }) };
      if (id === "home") return [open];
      const beside: Row = {
        id: `beside-${id}`,
        label: `Open ${label} beside`,
        hint: "Split",
        keywords: `${id} split side`,
        icon: SplitIcon,
        run: () => dispatch({ type: "open", app: id, beside: true }),
      };
      return [open, beside];
    });
    const desktopRows = desktops
      .filter((d) => d.id !== currentDesktopId)
      .map(
        (d): Row => ({
          id: `desktop-${d.id}`,
          label: `Switch to ${d.name}`,
          hint: "Desktop",
          keywords: "desktop",
          icon: SidebarIcon,
          run: () => selectDesktop(d.id),
        }),
      );
    const themeRows = (["light", "dark", "system"] as const).map(
      (pref): Row => ({
        id: `theme-${pref}`,
        label: pref === "system" ? "Match system theme" : `Use ${pref} theme`,
        hint: "Theme",
        keywords: "theme appearance mode",
        icon: SettingsIcon,
        run: () => applyTheme(pref),
      }),
    );
    return [...appRows, ...desktopRows, ...themeRows];
  }, [desktops, currentDesktopId, dispatch, selectDesktop]);

  const rows = useMemo(() => {
    const askRow = (text: string): Row => ({
      id: "ask",
      label: `Ask Veritas: ${text}`,
      hint: "Agent",
      icon: AgentIcon,
      run: () => {
        const isAgentOpen = openApps(layout).has("agent");
        // Beside keeps the user's current app in view; with nothing open the agent gets the stage.
        dispatch({ type: "open", app: "agent", beside: !isAgentOpen && layout.panes.length > 0 });
        queueAgentPrompt(text);
      },
    });
    return withAskRow(query, filterCommands(query, commands), askRow);
  }, [query, commands, layout, dispatch]);

  const active = Math.min(activeIndex, Math.max(rows.length - 1, 0));

  const runRow = (row: Row | undefined) => {
    if (!row) return;
    dialogRef.current?.close();
    row.run();
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (rows.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((active + step + rows.length) % rows.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      runRow(rows[active]);
    }
  };

  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Prompt window"
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="vt-prompt-window m-0 mx-auto mt-[18vh] w-[min(36rem,calc(100%-2rem))] overflow-hidden rounded-2xl border border-line bg-surface-raised p-0 text-ink shadow-overlay backdrop:bg-black/30"
    >
      <div className="border-b border-line px-4">
        <input
          ref={inputRef}
          role="combobox"
          aria-label="Search apps and commands, or ask Veritas"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={rows.length > 0 ? optionId(active) : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onInputKeyDown}
          placeholder="Search apps and commands, or ask Veritas"
          className="h-14 w-full bg-transparent text-base text-ink placeholder:text-ink-subtle focus:outline-none"
        />
      </div>
      <ul id={listId} role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-1.5">
        {rows.map((row, index) => {
          const Icon = row.icon;
          const isActive = index === active;
          return (
            <li
              key={row.id}
              id={optionId(index)}
              role="option"
              aria-selected={isActive}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => runRow(row)}
              className={cx(
                "flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm",
                isActive ? "bg-surface-selected text-ink" : "text-ink-muted",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-medium">{row.label}</span>
              {row.hint ? <span className="font-mono text-xs text-ink-subtle">{row.hint}</span> : null}
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-4 py-2 font-mono text-xs text-ink-subtle">Enter to run · Esc to close</p>
    </dialog>
  );
}
