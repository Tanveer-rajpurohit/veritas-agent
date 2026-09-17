---
name: motion
description: >
  Web animation *craft and taste* — the judgment layer above GSAP mechanics.
  Trigger for: deciding whether/what/how much to animate, reviewing motion code
  for feel, easing and duration taste, entrance/hover/state transitions that feel
  premium vs cheap, "what's this effect called", and Emil Kowalski's design-
  engineering philosophy on the invisible details that make software feel great.
  Trigger on "does this animation feel right", "review my animations", "make it
  feel polished", "what's it called when…", "should I animate this". Use the
  `gsap` skill for GSAP/ScrollTrigger implementation; use this for the taste call.
---

# Motion — Animation Craft & Taste (Emil Kowalski)

The judgment layer for motion. `gsap` covers *how to build* an animation; this
covers *whether, what, and how much* — the taste that separates premium motion
from the uniform-fade reflex. Three sub-skills, each its own `SKILL.md`:

| Sub-skill | Folder | Load when |
|---|---|---|
| **emil-design-eng** | `emil-design-eng/` | Building or refining UI and you want the craft bar: component design, when/what to animate, easing + duration defaults, the invisible details. The philosophy core. |
| **review-animations** | `review-animations/` | Reviewing existing animation/motion code against a high craft bar. Defaults to flagging; approval is earned. Pairs with `STANDARDS.md` in that folder. |
| **animation-vocabulary** | `animation-vocabulary/` | Naming an effect — "the bouncy thing when a popover opens" → *Pop in*. Reverse-lookup glossary to get the right word to prompt with. Naming, not building. |

## How this fits the rest of the library

```
User wants motion
   ├─ "what should this feel like / is this too much?"   → motion/emil-design-eng
   ├─ "review these animations"                          → motion/review-animations
   ├─ "what's this effect called?"                       → motion/animation-vocabulary
   └─ "build the scroll/timeline/stagger"                → gsap  (implementation)
```

Rule of thumb: reach here **before** writing the animation (taste + decision),
reach for `gsap` **to** write it, come back to `review-animations` **after**.
For static visual polish (spacing/type/color) use `ui-design` / `impeccable`.

Source: https://github.com/emilkowalski/skills — Emil Kowalski (animations.dev).
