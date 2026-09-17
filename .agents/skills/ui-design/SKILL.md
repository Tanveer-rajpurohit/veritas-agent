---
name: ui-design
description: >
  Make UIs look professionally designed, not "developer default". Trigger for:
  designing or improving visual quality, building a design system / design tokens,
  spacing/typography/color/layout decisions, choosing a visual style, making
  something "look better / more polished / less AI-generated", landing pages and
  marketing sections, component visual states (hover/focus/active/disabled),
  dark mode, responsive layout, and design critique ("why does this look off").
  Trigger on phrases like "make it look good", "design a landing page", "this
  looks bland", "design system", "spacing feels off", "pick colors", "polish UI".
---

# UI Design Skill — Make It Look Designed

You are a product designer with an engineer's hands. The goal: interfaces that
look **intentional and premium**, not bootstrapped-default. Taste is mostly a few
systematic rules applied consistently. Apply them.

## The 5 things that separate "designed" from "developer-default"

```
1. SPACING is on a scale and generous   → most amateur UIs are too cramped
2. TYPE has hierarchy and few sizes      → 3-4 sizes, big weight/size jumps
3. COLOR is restrained                   → 1 accent, lots of neutrals, not a rainbow
4. ALIGNMENT is ruthless                 → everything on a grid, optical alignment
5. DEPTH is subtle                       → soft shadows + borders, not heavy/neon
```

If a UI looks "off," it's almost always #1 (spacing) or #4 (alignment) first.

## Spacing — use a scale, be generous

```
Scale (Tailwind-aligned, 4px base):  4  8  12  16  24  32  48  64  96  128
NEVER random values (13px, 7px, 22px). Pick from the scale.

Rules of thumb:
  Related items          → small gap (8–12px)
  Unrelated groups       → large gap (32–64px)
  Section padding (web)  → 64–96px vertical, breathe
  Card/inner padding     → 16–24px
  Whitespace is not wasted space — it's how you signal grouping and hierarchy.

The proximity rule: things close together are perceived as related.
Tighten within a group, loosen between groups. This alone fixes most "messy" UIs.
```

## Typography — hierarchy with restraint

```
Use ONE font family for UI (a good geometric/grotesk sans). Two max
(one display + one body). System stack or Inter/Geist is a safe default.

Type scale (pick ~4 sizes, big jumps — not 15/16/17):
  Display  48–72px / 700 / tight tracking (-0.02em) / line-height ~1.05
  H1       30–36px / 600
  H2       20–24px / 600
  Body     16px    / 400 / line-height 1.5–1.7
  Small    14px    / 400 / muted color

Rules:
  Line length 50–75 chars (max-w-prose / ~65ch) — long lines kill readability
  Headings: tighter line-height + negative tracking. Body: looser line-height.
  Weight carries hierarchy more than size. 400 body vs 600 heading.
  Numbers in tables/data → tabular-nums (font-variant-numeric)
```

## Color — restrained, semantic, accessible

```
Structure (this is the whole system):
  Neutrals (90% of the UI):  background, surface, border, text, muted-text
                             → a 9–11 step gray ramp (e.g. slate/zinc)
  1 accent / brand:          buttons, links, focus, active — used SPARINGLY
  Semantic:                  success (green), warning (amber), danger (red), info (blue)

Build from tokens, not raw hex in components:
  --bg, --surface, --border, --text, --text-muted, --primary, --primary-fg, --ring

Rules:
  Don't use pure black (#000) on white — use near-black (#0a0a0a / zinc-950).
  Backgrounds: off-white (#fafafa) or true white; layer surfaces with subtle steps.
  Contrast: text ≥ 4.5:1, large text/UI ≥ 3:1 (WCAG AA). Check it.
  Saturated colors only for small accents. Big saturated areas look cheap.
  Tint your grays slightly toward the brand hue for cohesion.
```

## Depth & detail — subtle, layered

```
Shadows: soft, low-opacity, layered — light comes from above.
  ❌ box-shadow: 0 0 20px rgba(0,0,0,0.5)        (heavy, even, "glow")
  ✅ 0 1px 2px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.08)   (stacked, directional)

Borders: 1px, low-contrast (border-zinc-200 / white at 8–12% on dark).
  A border + a tiny shadow reads more "premium" than a big shadow alone.

Radius: pick ONE base (e.g. 8–12px) and derive (inner = outer − padding).
  Be consistent — mixed radii look accidental.

Transitions: 150–250ms ease-out on color/opacity/transform. Never animate layout
  properties (width/height/top) — animate transform/opacity (GPU, 60fps).
```

## Every interactive element needs all its states

```
default → hover → focus-visible → active → disabled → loading
```
```tsx
<button className="
  rounded-lg bg-primary px-4 py-2 text-primary-fg font-medium
  transition-colors duration-150
  hover:bg-primary/90
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
  active:scale-[.98]
  disabled:opacity-50 disabled:pointer-events-none
">
```
A button with only a default state is the #1 tell of an unpolished UI. **Never
remove focus outlines** without replacing them with a visible `focus-visible` ring.

## Layout & alignment

```
Use a grid. 12-col for pages; flex/grid with consistent gaps for components.
Max content width: 1100–1280px, centered, with generous side padding.
Align to a baseline — everything should snap to invisible lines.
Optical alignment > mathematical: icons/text may need a 1px nudge to *look* centered.
Don't center long-form text. Left-align body copy.
Establish ONE primary action per view (visual weight); secondaries are quieter.
```

## Responsive

```
Design mobile-first; layout adapts at content-driven breakpoints, not device names.
Tap targets ≥ 44×44px. Body text never below 16px on mobile (iOS zooms < 16px inputs).
Stack columns, increase spacing, hide non-essential chrome on small screens.
Test at 360px, 768px, 1280px minimum.
```

## Design tokens (the implementation)

```css
:root {
  --bg: #ffffff;        --surface: #fafafa;   --border: #e4e4e7;
  --text: #09090b;      --text-muted: #71717a;
  --primary: #4f46e5;   --primary-fg: #ffffff; --ring: #4f46e5;
  --radius: 0.625rem;
}
.dark {
  --bg: #09090b;        --surface: #18181b;   --border: #27272a;
  --text: #fafafa;      --text-muted: #a1a1aa;
  --primary: #6366f1;   --primary-fg: #ffffff; --ring: #6366f1;
}
```
Components reference tokens (`bg-[var(--surface)]` or Tailwind theme mapping),
never raw hex. Dark mode = swap token values, not rewrite components.

## The "looks AI-generated" smell test — avoid these

```
❌ Everything purple-to-pink gradient + glassmorphism on everything
❌ Emoji as the only iconography; centered text everywhere
❌ Uniform 16px gaps with no hierarchy; cramped, no breathing room
❌ Heavy even glow shadows; pure black on pure white
❌ 6 different accent colors; saturated full-bleed backgrounds
❌ One default button state; no hover/focus
✅ Restraint, hierarchy, one accent, generous space, subtle depth, real states
```

## Critique workflow (when asked "why does this look off")

Diagnose in this order — it's almost always early in the list:
1. **Spacing/proximity** — cramped? inconsistent gaps? no grouping?
2. **Alignment** — things not on a grid? ragged edges?
3. **Hierarchy** — can't tell what's primary? too many equal-weight elements?
4. **Type** — too many sizes? weak weight contrast? lines too long?
5. **Color** — too many accents? low contrast? saturated backgrounds?
6. **Depth** — heavy/neon shadows? no separation between layers?

Give the fix as concrete values (px, token, weight), not vibes.

## Response format

- Lead with the 1–2 highest-impact changes (usually spacing + hierarchy).
- Give concrete values from the scales above, not "add some padding."
- When building, output a token set + the component using tokens + all states.
- Pair with the `frontend` skill for implementation and `gsap` for motion mechanics.

## Related skills — when to reach past this one

This skill is the compact rulebook. For a bigger design job, layer it with:
- **`taste`** — design *direction* + style presets (minimalist/brutalist/luxury) +
  the anti-"AI-slop" pre-flight. Use when picking a look or redesigning a site.
- **`impeccable`** — deep craft with named passes (`critique`, `audit`, `polish`,
  `typeset`, `layout`, `bolder`, `quieter`) and brand/product registers.
- **`motion`** — decide *whether/what/how much* to animate (taste), then build the
  movement with **`gsap`**, then review it with `motion/review-animations`.
Typical flow: `ui-design`/`taste` (direction) → `impeccable` (craft) → `motion`+`gsap` (movement) → `frontend` (ship).
