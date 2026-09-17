---
name: testing
description: >
  Write meaningful, maintainable tests at the right level. Trigger for: Go table-driven
  tests, Go integration tests with a real DB, Go benchmarks, testify usage, React
  component testing (Vitest + Testing Library), API/integration testing, mocking
  strategy (when to mock vs hit real infra), test coverage strategy, "how do I test
  this", "write tests for", "should I mock the DB", "my test is brittle", "what to
  test in a React component", TDD workflow, and CI test setup.
---

# Testing Skill — Tests That Catch Real Bugs

Tests that pass when things are broken are worse than no tests. Write tests that
exercise real behavior, fail loudly on real regressions, and are easy to update
when requirements change. Test the **contract** (what it does), not the
**implementation** (how it does it).

## What level to test (the honest pyramid)

```
Unit tests       Fast, isolated, many.   Logic you can exercise without I/O.
Integration      Real DB/Redis/queue.    Repository layer, full handler stack.
E2E              Full browser or binary. Happy path + 1-2 critical user journeys.

Heuristic: mock at architectural boundaries (HTTP, external APIs), not inside your code.
           Testing through real infra catches the bugs that matter in production.
```

---

## Go — table-driven tests (the canonical pattern)

```go
func TestGetUser(t *testing.T) {
    tests := []struct {
        name    string
        id      string
        seed    *User             // what to pre-insert
        want    *User
        wantErr error
    }{
        {
            name: "existing user",
            id:   "u1",
            seed: &User{ID: "u1", Name: "Alice"},
            want: &User{ID: "u1", Name: "Alice"},
        },
        {
            name:    "not found",
            id:      "missing",
            wantErr: ErrNotFound,
        },
    }

    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            t.Parallel()            // safe if each case has its own DB state/txn

            svc := newTestService(t, tc.seed)
            got, err := svc.GetUser(context.Background(), tc.id)

            if tc.wantErr != nil {
                require.ErrorIs(t, err, tc.wantErr)
                return
            }
            require.NoError(t, err)
            assert.Equal(t, tc.want, got)
        })
    }
}
```

Rules:
- Name each case descriptively (`tc.name`) — the test runner prints it on failure.
- `t.Parallel()` inside subtests (parallel sub-tests, sequential test functions by default).
- `require.X` for "stop here if wrong" (fatal), `assert.X` for "keep going" (non-fatal).
- Table cases are additive — adding a new edge case = one struct literal, no new function.

## Go — integration tests with a real DB

Don't mock the database layer. Use a real Postgres (spin up with Docker or testcontainers-go):

```go
// internal/platform/testdb/testdb.go
func New(t *testing.T) *pgxpool.Pool {
    t.Helper()
    url := os.Getenv("TEST_DATABASE_URL")
    if url == "" {
        url = "postgres://postgres:postgres@localhost:5432/testdb?sslmode=disable"
    }
    pool, err := pgxpool.New(context.Background(), url)
    require.NoError(t, err)
    t.Cleanup(func() { pool.Close() })
    return pool
}

// In a test:
func TestUserRepo(t *testing.T) {
    pool := testdb.New(t)
    repo := user.NewRepo(pool)

    t.Run("create and retrieve", func(t *testing.T) {
        ctx := context.Background()
        u := &User{ID: uuid.New().String(), Name: "Bob"}
        require.NoError(t, repo.Create(ctx, u))

        got, err := repo.FindByID(ctx, u.ID)
        require.NoError(t, err)
        assert.Equal(t, u.Name, got.Name)
    })
}
```

For test isolation without resetting the DB every time, wrap each test in a
**transaction that you always roll back**:
```go
func txTest(t *testing.T, pool *pgxpool.Pool, fn func(ctx context.Context)) {
    t.Helper()
    tx, err := pool.Begin(context.Background())
    require.NoError(t, err)
    t.Cleanup(func() { _ = tx.Rollback(context.Background()) })
    fn(context.WithValue(context.Background(), dbKey{}, tx))
}
```

## Go — testing HTTP handlers

```go
func TestCreateUserHandler(t *testing.T) {
    svc := &fakeUserService{}        // a small hand-written fake, not a mock framework
    r := NewRouter(svc, slog.Default())

    body := `{"name":"Alice","email":"a@b.com"}`
    req := httptest.NewRequest("POST", "/users", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()

    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusCreated, w.Code)
    var got User
    require.NoError(t, json.NewDecoder(w.Body).Decode(&got))
    assert.Equal(t, "Alice", got.Name)
}
```
Use `httptest.NewRequest` + `httptest.NewRecorder` — no real server needed for
handler unit tests. Test the whole handler stack (middleware included) via the
`http.Handler` returned by your router function.

## Go — benchmarks

```go
func BenchmarkGetUser(b *testing.B) {
    svc := newBenchService(b)
    b.ResetTimer()
    b.ReportAllocs()
    for i := 0; i < b.N; i++ {
        _, _ = svc.GetUser(context.Background(), "u1")
    }
}
// Run: go test -bench=. -benchmem -count=5
// Compare with: benchstat old.txt new.txt
```

## Mocking strategy (Go)

```
Use a hand-written fake (implement the interface) when:
  - the interface is small (1–3 methods)
  - you need stateful behavior (e.g. a fake DB that stores in a map)

Use testify/mock when:
  - the interface is large and you only care about 1-2 calls
  - you need to assert call order / argument capture

NEVER mock the thing you're trying to test. Mock its dependencies.
Repository → mock the DB connection? No. Run against real Postgres.
Service    → mock the repository? Yes (hand-written fake). Tests the service logic in isolation.
Handler    → mock the service? Yes (fake service). Tests HTTP wire format.
```

---

## React — Vitest + Testing Library

```tsx
// components/user-card.test.tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { UserCard } from "./user-card"

const user = { id: "1", name: "Alice", avatarUrl: null }

describe("UserCard", () => {
  it("displays the user name", () => {
    render(<UserCard user={user} />)
    expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument()
  })

  it("calls onSelect when clicked", async () => {
    const onSelect = vi.fn()
    render(<UserCard user={user} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole("article"))
    expect(onSelect).toHaveBeenCalledWith("1")
  })
})
```

**The Testing Library philosophy (internalize this):**
- Query by **role** (`getByRole`) > label/placeholder > text > test-id.
- Test what the user sees and does, not internal state or implementation.
- Never query by class name or component internals.
- `userEvent` over `fireEvent` — it simulates real browser events (pointerdown → focus → click).

```tsx
// Testing async data fetching (mock at the network, not the module)
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"   // msw setupServer

it("shows users after load", async () => {
  server.use(http.get("/api/users", () => HttpResponse.json([user])))
  render(<UserList />)
  expect(await screen.findByText("Alice")).toBeInTheDocument()  // findBy = async
})
```
Use **msw** (Mock Service Worker) to intercept network requests — your components
run exactly as they would in a browser, but fetch hits your mock handlers. Catches
serialization bugs that module-mocking misses.

## What to test (and what not to)

```
Test:
  ✅ Business logic (the non-trivial: authorization, state machines, calculations)
  ✅ Error cases (not found, validation failure, external service down)
  ✅ API contract (request → response shape, status codes)
  ✅ UI: what's visible, what happens on interaction (not internal state)
  ✅ Integration: the real DB/cache layer

Skip:
  ❌ Trivial getters/setters with no logic
  ❌ Implementation details (which internal function was called)
  ❌ Testing the framework itself (Next.js routing, ORM internals)
  ❌ 100% coverage as a goal — coverage is a floor check, not a quality signal
```

## CI setup (the non-negotiable baseline)

```yaml
# .github/workflows/test.yml
- run: go test -race -count=1 ./...        # -race every time in CI
- run: go vet ./...
- run: golangci-lint run

# For frontend
- run: pnpm vitest run --coverage
- run: pnpm tsc --noEmit                   # type-check without emitting
```

The race detector (`-race`) is not optional — it's how you catch data races that
only appear under load in production. Always on in CI, sometimes locally.

## Anti-patterns

```
❌ Tests that test the mock, not the code    → use real infra at the repo layer
❌ Testing implementation (assert which fn was called internally)  → test the output
❌ One huge test that tests everything       → table-driven, focused cases
❌ No error case tests                       → at least one sad path per function
❌ Shared global state between tests         → rollback txn or per-test setup
❌ Testing Library: queryByClass/id/testId   → queryByRole / queryByText
❌ No -race in CI                            → always run with race detector
```
