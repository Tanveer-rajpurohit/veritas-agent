# SCALING.md — Scaling, Caching, Databases

## Load Balancing

```
Algorithms:
  Round Robin        → equal servers, stateless apps
  Least Connections  → WebSockets, long-lived connections
  IP Hash            → session affinity (same user → same server)
  Weighted RR        → servers with different capacity

Layer 4 (TCP/IP): fast, routes by IP+port, no URL inspection
Layer 7 (HTTP):   smart routing by URL/headers, used by Nginx/ALB

nginx upstream example:
  upstream backend {
    least_conn;
    server app1:3000;
    server app2:3000;
    server app3:3000;
  }
```

---

## Caching Strategies

### Hierarchy (fastest → slowest)
```
Browser cache (free, ms)
  → CDN edge (5-50ms, cheap)
    → Redis / Memcached (0.5ms, moderate)
      → Database (10-100ms, expensive)
```

### Cache-Aside (Lazy Loading) — default choice
```typescript
async function getUser(id: string) {
  const cached = await redis.get(`user:${id}`)
  if (cached) return JSON.parse(cached)           // HIT

  const user = await db.query('SELECT * FROM users WHERE id=$1', [id])
  await redis.setex(`user:${id}`, 3600, JSON.stringify(user))
  return user                                      // MISS → fetch → store
}
// Pros: only caches what's accessed
// Cons: first request cold (slow)
```

### Write-Through — for read-heavy + always-fresh data
```typescript
async function updateUser(id: string, data: any) {
  await db.query('UPDATE users SET name=$1 WHERE id=$2', [data.name, id])
  await redis.setex(`user:${id}`, 3600, JSON.stringify(data))
  // Pros: cache always consistent
  // Cons: writes 2x slower
}
```

### Write-Behind — for high write throughput
```typescript
async function updateUser(id: string, data: any) {
  await redis.setex(`user:${id}`, 3600, JSON.stringify(data)) // instant
  await queue.publish('db-write', { id, data })               // async
  // Pros: near-instant write response
  // Cons: data loss risk if Redis crashes before DB write
}
```

### Cache Stampede Prevention
```typescript
// Problem: popular key expires → 10K requests hit DB simultaneously
async function getWithLock(key: string) {
  const cached = await redis.get(key)
  if (cached) return cached

  const lock = await redis.set(`lock:${key}`, '1', 'EX', 10, 'NX')
  if (lock) {
    const data = await db.query('...')
    await redis.setex(key, 3600, JSON.stringify(data))
    await redis.del(`lock:${key}`)
    return data
  }
  await new Promise(r => setTimeout(r, 100))
  return getWithLock(key) // retry after lock holder fills cache
}
```

### CDN Strategy
```
Cache static: images, CSS, JS, videos (TTL: days/weeks)
Cache API:    product lists, search results (TTL: 60 seconds)
Never cache:  user-specific data, real-time prices, auth endpoints

Cache-Control headers:
  public, max-age=86400         → cache 1 day (CDN + browser)
  private, no-cache             → browser only, revalidate every time
  s-maxage=60                   → CDN TTL 60s, browser TTL longer

Cost example:
  Without CDN: serve 1M videos from origin = $1,000/month
  With CDN:    serve 1M videos from edge   = $100/month
```

---

## Database Scaling

### Read Replicas
```
Master (writes) → Replica 1 (reads)
               → Replica 2 (reads)
               → Replica 3 (reads)

Code pattern:
  Writes → masterPool
  Reads  → replicaPool (round-robin)

Warning: replication lag = 50-500ms
  → Don't read from replica immediately after write for critical ops
  → Read from master for: payments, auth, inventory

When to add:
  Read:Write ratio > 5:1 and DB CPU > 70%
```

### Sharding
```
Hash sharding (most common):
  shardIndex = hash(userId) % numShards
  Pro: even distribution
  Con: range queries span shards → use app-level merge

Range sharding:
  Shard 0: users 0-1M
  Shard 1: users 1M-2M
  Pro: range queries easy
  Con: hotspot on latest shard (new signups)

Geographic sharding:
  US users  → US database
  EU users  → EU database (GDPR compliance)
  Pro: low latency + compliance
  Con: cross-region queries

Problems to address in interviews:
  1. Cross-shard joins → denormalize or application-level join
  2. Cross-shard transactions → SAGA pattern (see PATTERNS.md)
  3. Rebalancing → consistent hashing (minimal key movement)
  4. Hotspot shard → split further, heavy caching
```

---

## Database Selection Guide

### Quick Decision Matrix
```
Use PostgreSQL when:
  ✅ Complex queries with JOINs
  ✅ ACID transactions required
  ✅ Relationships between entities
  ✅ Financial data, user accounts, orders
  ✅ Scale: up to ~10M rows without sharding

Use MongoDB when:
  ✅ Flexible/nested document schema
  ✅ Rapid iteration (schema changes often)
  ✅ No complex JOINs needed
  ✅ Product catalogs, CMS, user profiles

Use Redis when:
  ✅ Caching (always)
  ✅ Session storage
  ✅ Real-time leaderboards (sorted sets)
  ✅ Pub/Sub messaging
  ✅ Distributed locks
  ✅ Rate limiting counters

Use Cassandra when:
  ✅ Write-heavy (millions/sec)
  ✅ Time-series data (logs, events, IoT)
  ✅ Need linear horizontal scale
  ✅ No need for JOINs or transactions
  Used by: Netflix (viewing history), Discord (messages), Uber (trips)

Use Elasticsearch when:
  ✅ Full-text search
  ✅ Log aggregation + analysis
  ✅ Faceted search (filters, aggregations)
  ✅ Autocomplete
```

### Cassandra Deep Dive
```
Architecture: ring topology, no master, all nodes equal
  → Write to any node (coordinator routes automatically)
  → Replication factor = 3 (data on 3 nodes always)
  → You only write: INSERT INTO table VALUES (...)

Consistency tunable per query:
  ONE     → write/read 1 node (fastest, eventual)
  QUORUM  → majority of nodes (balanced, recommended)
  ALL     → all nodes (slowest, strongest)

Rule: W + R > N guarantees strong consistency
  N=3, W=2, R=2 → 2+2=4 > 3 ✅

Design rule: model data for your queries (no JOINs!)
  Bad:  normalize like SQL → lots of tables → JOIN hell
  Good: one table per query pattern

Example for "get user's last 100 messages":
  CREATE TABLE messages_by_user (
    user_id  UUID,
    sent_at  TIMESTAMP,
    content  TEXT,
    PRIMARY KEY (user_id, sent_at)  ← partition + clustering
  ) WITH CLUSTERING ORDER BY (sent_at DESC)
```

### Redis Patterns
```
String:      counters, rate limits, cached JSON
  SET user:123 "{name:'John'}" EX 3600

Hash:        objects with fields (saves memory vs JSON string)
  HSET user:123 name "John" email "j@j.com"

List:        queues, recent activity feeds
  LPUSH recent:user:123 "articleId"
  LTRIM recent:user:123 0 99   ← keep last 100

Sorted Set:  leaderboards, rate limit windows
  ZADD leaderboard 1500 "player:john"
  ZREVRANGE leaderboard 0 9    ← top 10

Pub/Sub:     real-time notifications, fan-out
  PUBLISH channel "event payload"
  SUBSCRIBE channel
```

---

## Architecture Decision: When to Scale Each Layer

```
Traffic level → Action:

0-10K req/day:   Single server + PostgreSQL (keep it simple)
10K-100K/day:    Add Redis caching, CDN for static
100K-1M/day:     Read replicas, separate app + DB servers
1M-10M/day:      Database sharding, multiple cache nodes
10M-100M/day:    Geographic distribution, specialized DBs per use case
100M+/day:       Full distributed system, service-specific scaling
```
