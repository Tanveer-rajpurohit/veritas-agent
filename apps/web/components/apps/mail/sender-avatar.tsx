"use client";

import { useState } from "react";
import { avatarDomain, type MailAddress } from "@veritas/shared";
import { cx } from "@veritas/ui";
import { avatarColor, senderInitials } from "./mail-format";

type LogoState = "loading" | "loaded" | "failed";

/**
 * 32px sender avatar: coloured initials, replaced by the sender's logo once it
 * loads. Decorative, because the sender's name is always printed beside it.
 */
export function SenderAvatar({ address }: { address: MailAddress }) {
  const domain = avatarDomain(address.email);
  // Keyed by domain so a reused component never shows the previous sender's logo state.
  const [logo, setLogo] = useState<{ domain: string | null; state: LogoState }>({ domain, state: "loading" });
  const state = logo.domain === domain ? logo.state : "loading";

  return (
    <span
      aria-hidden
      className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white select-none"
      style={{ backgroundColor: avatarColor(address.email) }}
    >
      {senderInitials(address)}
      {domain && state !== "failed" ? (
        // A plain <img>: the API route already returns a sized, cached image, so next/image adds nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/v1/mail/avatar?domain=${encodeURIComponent(domain)}`}
          alt=""
          width={32}
          height={32}
          loading="lazy"
          decoding="async"
          onLoad={() => setLogo({ domain, state: "loaded" })}
          onError={() => setLogo({ domain, state: "failed" })}
          className={cx(
            "absolute inset-0 size-full rounded-full border border-line bg-white object-contain p-1",
            state === "loaded" ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}
    </span>
  );
}
