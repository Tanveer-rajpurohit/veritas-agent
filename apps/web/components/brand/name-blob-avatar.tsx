"use client";

import { Blobatar } from "@blobatar/react";

interface NameBlobAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export function NameBlobAvatar({
  name,
  size = 64,
  className = "",
}: NameBlobAvatarProps) {
  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${name || "User"} avatar`}
    >
      <Blobatar name={name || "Veritas user"} size={size} animate="hover" />
    </span>
  );
}
