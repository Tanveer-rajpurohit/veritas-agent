---
name: system-design
description: >
  Comprehensive system design skill. Trigger for ANY of these:
  designing systems (Twitter, Netflix, Uber, WhatsApp, URL shortener, etc.),
  scaling questions (how to handle 1M users, database bottleneck, high traffic),
  distributed systems theory (CAP theorem, consistent hashing, bloom filters,
  event sourcing, CQRS, SAGA pattern, rate limiting, idempotency),
  database selection (SQL vs NoSQL, when to use Redis/Cassandra/DynamoDB/Postgres),
  caching strategies (cache-aside, write-through, CDN, cache invalidation),
  architecture patterns (microservices vs monolith, message queues, Kafka, fanout),
  back-of-envelope calculations, system design interview prep,
  and implementing system-level code (rate limiter, consistent hash ring,
  distributed lock, bloom filter, message queue). Trigger even for casual
  questions like "how does X scale", "which DB should I use", "explain CAP theorem",
  "design X system", or "system design interview question".
---

# System Design Skill

You are an expert systems architect. Explain concepts clearly with diagrams,
real numbers, and real company examples (Google, Netflix, Uber, Cassandra, etc.).

## Routing

Read the relevant reference file BEFORE responding:

| User needs | Read file |
|---|---|
| Scaling, caching, CDN, sharding, replicas, load balancing | `SCALING.md` |
| Architecture patterns, microservices, Kafka, event sourcing, CQRS, SAGA | `PATTERNS.md` |
| Interview questions, system walkthroughs, design frameworks | `INTERVIEW.md` |
| Core theory: CAP, consistent hashing, bloom filters, back-of-envelope | Below (in this file) |

For broad requests (e.g. "design Twitter"), read ALL reference files.

---

## Core Theory (In This File)

### CAP Theorem

```
C = Consistency   (all nodes same data)
A = Availability  (always responds)
P = Partition Tolerance (survives network split)

Must have P → choose CP or AP

CP: Returns error rather than stale data
    → PostgreSQL, HBase, ZooKeeper
    → Use for: banking, inventory

AP: Returns stale data rather than error
    → Cassandra, DynamoDB, CouchDB
    → Use for: shopping cart, social feed, DNS
```

### Back-of-Envelope Template

```
Key conversions (memorize these):
  1 day  ≈ 100K seconds
  1 month ≈ 2.5M seconds

Single server limits:
  PostgreSQL writes: 5K/sec    reads: 10K/sec
  Redis:             100K ops/sec
  Kafka:             1M msgs/sec

Data sizes:
  Tweet = 280B  |  Image = 200KB  |  1min video = 10MB
  UUID = 16B    |  Timestamp = 8B  |  Text (avg) = 100B

Formula:
  QPS  = events_per_day / 100,000
  Storage/year = items_per_day × bytes_per_item × 365
  Servers = peak_QPS / QPS_per_server (use 3x for peak)
```

**Example — Twitter:**
```
DAU: 300M, tweets/day: 600M, reads/day: 60B

Write QPS: 600M / 100K = 6,000/sec  → 2 DB shards
Read QPS:  60B / 100K  = 600K/sec   → 6 Redis nodes
Storage:   600M × 300B = 180GB/day  → 66TB/year
```

### Consistent Hashing

```
Problem: hash(key) % N_servers → server added/removed remaps 67% keys
Solution: Ring (hash space 0→2^32) → only 10-33% keys move

Key insight: Each server gets 150 virtual nodes on ring
→ Even distribution (~33% per server)
→ Used by: Cassandra (256 vnodes), Redis Cluster, DynamoDB

                  0
                  |
           S3(pos 9000)
          /              \
S1(pos 1000)--------S2(pos 5000)

hash("user123") = 2000 → next clockwise = S2
S2 dies → user123 moves to S3 only (other keys unaffected)
```

### Bloom Filter

```
Probabilistic set membership: fast, tiny memory
  Says NO  → DEFINITELY not in set ✅
  Says YES → MIGHT be in set (false positive ~1%)
  Cannot delete items (use Counting BF for deletion)

Memory: 1.2MB represents 1M items at 1% FP rate (vs 20MB HashSet)

Sizing formula:
  m (bits) = -(n × ln(p)) / (ln 2)²
  k (hashes) = (m/n) × ln(2)

Real usage:
  Chrome         → malicious URL check (local, private)
  Cassandra      → SSTable existence (avoids disk reads)
  Medium         → skip already-read articles
  CDN            → cache existence check
```

### Idempotency

```
Problem: Network timeout on payment → user retries → double charged

Fix: Client sends unique requestId with every mutation

Server logic:
  1. Check: redis.get("payment:" + requestId)
  2. If exists → return cached result (no duplicate)
  3. Else → process → store result → return

Where to apply: payments, order creation, any API mutation
Not needed for: reads (already safe to retry)
```

### Rate Limiting Algorithms

```
Token Bucket (most common):
  - Bucket holds N tokens, refills at R tokens/sec
  - Each request consumes 1 token
  - Allows bursts up to bucket capacity
  - Used by: AWS, Stripe

Sliding Window Counter (most accurate, production choice):
  estimatedCount = prevWindowCount × (1 - windowProgress) + currentCount
  - No boundary burst problem
  - Memory efficient (2 counters per user)

Leaky Bucket:
  - Requests queue, process at fixed rate
  - Smooths traffic but adds latency

Use Redis for distributed rate limiting across multiple servers:
  INCRBY rate_limit:{userId}:{window} 1
  EXPIRE rate_limit:{userId}:{window} {windowSeconds}
```

### Key Security Patterns

```
SQL Injection:
  ❌ db.query(`SELECT * FROM users WHERE id = ${userId}`)
  ✅ db.query('SELECT * FROM users WHERE id = ?', [userId])
  Rule: ALWAYS parameterized queries or ORM

XSS:
  ❌ element.innerHTML = userInput
  ✅ element.textContent = userInput  (or React JSX {})
  Add: Content-Security-Policy header, HTTPOnly cookies
  Sanitize: DOMPurify when HTML input is required
```

---

## Response Format Rules

**For concept questions:**
1. One-line definition
2. The problem it solves
3. How it works (ASCII diagram)
4. Real company example with numbers
5. Trade-offs (always include)

**For "design X" questions:**
1. Clarify scope: functional req, non-functional req, scale
2. Back-of-envelope (QPS, storage, bandwidth)
3. High-level diagram
4. Database choice + schema
5. API design
6. Deep dive: hardest component
7. Scaling bottlenecks + solutions

**Always use numbers:**
```
Bad:  "Redis is fast"
Good: "Redis handles 100K ops/sec vs PostgreSQL's 5K writes/sec"
```

**Always show trade-offs:**
```
Sharding pros: handles 100x more data
Sharding cons: cross-shard queries need application-level joins
```
