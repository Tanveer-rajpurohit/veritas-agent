"use client";

import { useId } from "react";

interface NameBlobAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

function hashName(value: string): number {
  let hash = 2166136261;
  for (const character of value.trim().toLowerCase()) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function NameBlobAvatar({ name, size = 64, className = "" }: NameBlobAvatarProps) {
  const gradientId = `blob-${useId().replace(/:/g, "")}`;
  const seed = hashName(name || "Veritas user");
  const hue = 198 + (seed % 24);
  const hueTwo = 28 + ((seed >>> 8) % 22);
  const rotate = (seed % 18) - 9;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${name || "User"} avatar`} className={className}>
      <defs>
        <linearGradient id={gradientId} x1="10%" y1="8%" x2="90%" y2="92%">
          <stop offset="0%" stopColor={`hsl(${hue} 62% 69%)`} />
          <stop offset="58%" stopColor={`hsl(${hue + 14} 56% 48%)`} />
          <stop offset="100%" stopColor={`hsl(${hueTwo} 72% 65%)`} />
        </linearGradient>
      </defs>
      <path d="M77.8 18.6C89.2 27.7 94.1 43 91 57.8c-3 14.8-14 29-28.1 34.1-14.2 5.1-31.5 1.1-42.1-9.8C10.3 71.2 6.5 53.5 12.3 39.4 18.1 25.2 33.4 14.6 48 12.2c14.6-2.4 18.4-2.7 29.8 6.4Z" fill={`url(#${gradientId})`} transform={`rotate(${rotate} 50 50)`} />
      <circle cx="38" cy="47" r="4.7" fill="#fff" opacity=".95" />
      <circle cx="63" cy="45" r="4.7" fill="#fff" opacity=".95" />
      <circle cx="39" cy="47" r="2.2" fill="#244b6d" />
      <circle cx="62" cy="45" r="2.2" fill="#244b6d" />
      <path d="M39 64c6.3 5.8 15.2 5.5 21.4-.8" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" opacity=".95" />
    </svg>
  );
}
