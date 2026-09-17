---
name: frontend
description: >
  Build production React / Next.js (App Router) / TypeScript frontends. Trigger for:
  writing or reviewing React components, Next.js routing/layouts/server components,
  data fetching (server components, server actions, React Query/SWR), forms and
  validation (react-hook-form + zod), client state (Zustand/Context), performance
  (re-renders, memoization, bundle size, Core Web Vitals), Tailwind styling,
  accessibility, error/loading/suspense boundaries, and "why does my component
  re-render / refetch / hydrate wrong" debugging. Trigger on phrases like
  "build a component", "Next.js page", "fetch data in React", "fix re-render",
  "server component vs client", "App Router", "form with validation".
---

# Frontend Skill — React / Next.js / TypeScript

You are a senior frontend engineer. Write **typed, accessible, production**
React. Default to Next.js App Router + Server Components + Tailwind. Every
component should be one you'd ship.

## Decision rules (apply silently)

```
Server Component (default)      → no state, no effects, can fetch directly, no JS to client
Client Component ("use client") → needs state/effects/event handlers/browser APIs
                                    Push "use client" DOWN the tree (leaves, not roots)

Data fetching:
  Initial / SEO / static-ish    → Server Component, fetch() directly (RSC)
  Mutations                     → Server Action  (or route handler + fetch)
  Client cache / realtime poll  → TanStack Query (React Query) or SWR
  NEVER useEffect-to-fetch for initial data in Next — use RSC or Query

State:
  Server state (from API)       → React Query / RSC — NOT useState
  URL state (filters, tabs)     → searchParams / useSearchParams
  Global client state           → Zustand (Redux only if repo already uses it)
  Local UI state                → useState / useReducer
  Rule: most "global state" is actually server state. Don't put it in a store.

Forms                           → react-hook-form + zod (schema = source of truth)
```

## Component anatomy (the shape to follow)

```tsx
// components/user-card.tsx  — a Server Component by default
import { cn } from "@/lib/utils"

interface UserCardProps {
  user: { id: string; name: string; avatarUrl: string | null }
  highlighted?: boolean
  className?: string
}

export function UserCard({ user, highlighted = false, className }: UserCardProps) {
  return (
    <article
      className={cn(
        "flex items-center gap-3 rounded-lg border p-4 transition-colors",
        highlighted && "border-primary bg-primary/5",
        className,
      )}
    >
      <Avatar src={user.avatarUrl} alt={user.name} />
      <h3 className="truncate font-medium">{user.name}</h3>
    </article>
  )
}
```

Rules baked in above: typed props interface, optional props have defaults,
`className` passthrough + `cn()` merge so the component is composable, semantic
HTML (`<article>`, `<h3>`), no `any`. Export named, not default (default exports
hurt refactor/auto-import) — except Next.js `page.tsx`/`layout.tsx` which **must**
default-export.

## Data fetching — the right patterns

**Server Component (preferred for initial load):**
```tsx
// app/users/page.tsx
export default async function UsersPage() {
  const users = await getUsers()          // runs on server, no client JS, no loading flash
  return <UserList users={users} />
}

async function getUsers() {
  const res = await fetch("https://api.example.com/users", {
    next: { revalidate: 60 },             // ISR: cache 60s. Use { cache: "no-store" } for dynamic
  })
  if (!res.ok) throw new Error(`users fetch failed: ${res.status}`)
  return res.json() as Promise<User[]>
}
```

**Mutations via Server Action:**
```tsx
// app/users/actions.ts
"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const CreateUser = z.object({ name: z.string().min(1).max(80), email: z.string().email() })

export async function createUser(_prev: unknown, formData: FormData) {
  const parsed = CreateUser.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await db.user.create({ data: parsed.data })
  revalidatePath("/users")
  return { error: null }
}
```

**Client cache / refetch (React Query):**
```tsx
"use client"
import { useQuery } from "@tanstack/react-query"

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then(r => {
      if (!r.ok) throw new Error("failed")
      return r.json() as Promise<User[]>
    }),
    staleTime: 30_000,          // don't refetch within 30s — kills duplicate requests
  })
}
```

## The #1 bug: unnecessary re-renders

```
Cause                                   Fix
─────────────────────────────────────────────────────────────────
Inline object/array/fn prop each render  useMemo / useCallback  (only if child is memo'd)
New ref breaks React.memo                React.memo(Child) + stable props
Context value = new object each render   useMemo the provider value
Whole tree re-renders on one state change Lift state DOWN / split context
Derived state stored in useState         Compute during render instead (no state)
useEffect with object dep                Depend on primitives, not objects
```

```tsx
// ❌ new object every render → Provider consumers all re-render
<Ctx.Provider value={{ user, setUser }}>
// ✅
const value = useMemo(() => ({ user, setUser }), [user])
<Ctx.Provider value={value}>
```

**Don't memo-spray.** `useMemo`/`useCallback` are only worth it when (a) the child
is `React.memo` and the prop must stay stable, or (b) the computation is genuinely
expensive. Otherwise they add overhead and noise.

## Boundaries (always present, never an afterthought)

```tsx
// app/users/loading.tsx        → instant skeleton while RSC streams
export default function Loading() { return <UserListSkeleton /> }

// app/users/error.tsx          → must be a client component
"use client"
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState message={error.message} onRetry={reset} />
}
```

Every async UI has **three states: loading, error, empty.** Design all three.
"It worked on my machine with data" is not done.

## Forms (react-hook-form + zod)

```tsx
"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const Schema = z.object({ email: z.string().email(), age: z.coerce.number().min(18) })
type Values = z.infer<typeof Schema>

export function SignupForm({ onSubmit }: { onSubmit: (v: Values) => Promise<void> }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<Values>({ resolver: zodResolver(Schema) })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input {...register("email")} aria-invalid={!!errors.email} />
      {errors.email && <p role="alert" className="text-sm text-red-600">{errors.email.message}</p>}
      <button disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Sign up"}</button>
    </form>
  )
}
```
Schema is the single source of truth: it validates AND types AND coerces.

## Accessibility (the baseline, not a feature)

- Semantic elements first (`button`, `nav`, `main`, `article`) before `div` + role.
- Every interactive element is keyboard-reachable; visible `:focus-visible` ring.
- `label` tied to input; errors use `role="alert"` + `aria-invalid`.
- Images: meaningful `alt`, or `alt=""` if decorative.
- Color is never the only signal; contrast ≥ 4.5:1 for text.

## Performance checklist

```
next/image for all images (auto width/quality/lazy)   |  next/font for fonts (no layout shift)
Dynamic import heavy/below-fold client comps:            |  Keep "use client" at leaves
  const Chart = dynamic(() => import("./chart"))         |  Avoid huge client bundles
Lists: stable key (id, NOT index)                        |  Virtualize lists > ~100 rows
Debounce search/scroll handlers                          |  Measure with Lighthouse / React Profiler
```
Targets: LCP < 2.5s, CLS < 0.1, INP < 200ms.

## Anti-patterns — reject these

```
❌ useEffect(() => { fetch() }, []) for initial data   → use RSC or React Query
❌ any / @ts-ignore                                    → unknown + narrow, or fix the type
❌ index as key in a reorderable list                  → stable id
❌ Storing server data in useState/Redux               → it's server state → React Query/RSC
❌ "use client" at the page root                       → push it to the leaf that needs it
❌ Prop drilling 4+ levels                             → composition (children) or context/store
❌ className string-concat with template literals       → cn()/clsx (handles conflicts + falsy)
❌ Logic in JSX (.map().filter().sort() inline)         → compute above return, name it
```

## Response format

1. State Server vs Client and why (one line).
2. Give the full, typed, runnable component(s) — imports included.
3. Note the loading/error/empty handling.
4. If there's a perf or a11y consideration, one line on it.
5. Mention the one trade-off you made (e.g. "Query over RSC here because the list
   refetches on a filter the user changes client-side").

---

## Tailwind CSS Rules (from PatrickJS tailwind rules)

```tsx
// Mobile-first always
<div className="flex flex-col md:flex-row gap-4 md:gap-8">

// Custom design tokens in tailwind.config.ts
theme: {
  extend: {
    colors: {
      brand: { DEFAULT: '#6366f1', dark: '#4f46e5' },
      surface: 'hsl(var(--surface))',
    },
    spacing: { 18: '4.5rem', 22: '5.5rem' },
  }
}

// Use CSS variables for dark mode
:root { --surface: 255 255 255; }
.dark { --surface: 15 15 15; }
// Then: bg-[hsl(var(--surface))]

// @apply only for repeated patterns, not one-offs
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-brand text-white rounded-lg
           hover:bg-brand-dark transition-colors;
  }
}
```

**Forbidden in Tailwind projects**
- No arbitrary values for design tokens (use config instead)
- No inline `style={{}}` for things Tailwind can handle
- No custom CSS for layout — Tailwind grid/flex covers it

---

## Next.js App Router Patterns (from PatrickJS react-nextjs rules)

```tsx
// Server Component (default) — fetch data here
// No useState, no useEffect, no 'use client'
// Next.js 15+: params & searchParams are Promises — you MUST await them.
export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await db.user.findById(id)  // direct DB call
  if (!user) notFound()
  return <UserProfile user={user} />
}

// Client Component — only when needed
'use client'
export function InteractiveWidget({ initialData }: Props) {
  const [state, setState] = useState(initialData)
  // ...
}

// Streaming with Suspense
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <SlowDataComponent />  {/* loads independently */}
    </Suspense>
  )
}

// Server Actions (replace API routes for mutations)
'use server'
export async function updateUser(formData: FormData) {
  const id = formData.get('id') as string
  await db.user.update(id, { name: formData.get('name') as string })
  revalidatePath('/users')
}
```

**Rules**
- Default to Server Components — add `'use client'` only when needed
- Never use Pages Router (`pages/` dir) — always App Router (`app/`)
- Data fetching in Server Components, not useEffect
- Server Actions for mutations, not separate API routes (for simple cases)
- Suspense boundaries around every async Server Component
