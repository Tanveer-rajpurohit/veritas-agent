"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import type { AppId } from "@veritas/shared";
import { appHref } from "@/lib/apps";
import { useDesktop } from "./desktop-provider";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { app: AppId };

/**
 * A link to an app that opens it in the current desktop. A plain click goes through
 * the layout, which then updates the URL; modified clicks (new tab, new window) keep
 * the normal link behaviour.
 */
export function AppLink({ app, onClick, ...props }: Props) {
  const { workspaceId, dispatch } = useDesktop();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    dispatch({ type: "open", app });
  };

  return <Link href={appHref(workspaceId, app)} onClick={handleClick} {...props} />;
}
