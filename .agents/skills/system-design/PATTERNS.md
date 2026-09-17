# PATTERNS.md — Architecture, Distributed Systems & Code Patterns

## Microservices vs Monolith

```
Monolith:
  All code in one deployable unit, one database
  ✅ Simple development, easy debugging, no network overhead
  ✅ Good for: startups, teams < 10, MVPs
  ❌ Can't scale parts independently, one crash = all down

Microservices:
  Each service: own codebase, own database, own deployment
  ✅ Scale independently, fault isolation, different tech stacks
  ✅ Good for: large teams, proven product, high scale
  ❌ Network latency, distributed transactions, ops complexity

Industry rule: Start monolith → extract services when you feel the pain
  Pain signals: deployment bottleneck, scaling specific features, team size > 20
```

---

## Message Queues & Event Streaming

### When to Use What
```
SQS (Simple Queue):
  → Task queues, job processing, one consumer per message
  → Email sending, resize images, process payments async

SNS (Pub/Sub fan-out):
  → One event → many subscribers (each gets a copy)
  → "Payment completed" → email service + SMS service + analytics

Kafka (Event Streaming):
  → High throughput (1M msgs/sec), event log, replay events
  → Real-time analytics, event sourcing, microservice communication

Key Kafka concepts:
  Topic = named event stream
  Partition = ordered log within topic (parallelism unit)
  Consumer Group = all consumers in group share partitions
    → Same group = competing consumers (each msg → one consumer)
    → Diff group = broadcast (each group gets all messages)
  Offset = position in partition (consumers track their own)
  fromBeginning: true → replay all events from start

Fan-out in Kafka (SNS-like behavior):
  producer → topic:payment-events
  consumer group "email-service" → reads ALL messages
  consumer group "sms-service"   → reads ALL messages (different group!)
```

### Kafka vs Simple Queue
```
Feature         | Kafka          | SQS/RabbitMQ
Retention       | Days/weeks     | Until consumed
Replay          | ✅ Yes         | ❌ No
Throughput      | 1M/sec         | 100K/sec
Consumer groups | ✅ Yes         | Limited
Use for         | Event sourcing | Task queues
                | Analytics      | Job processing
```

---

## Event Sourcing

```
Traditional:  Store CURRENT state → balance = 1000
Event Store:  Store ALL EVENTS  → [+500, +700, -200] = 1000

Benefits:
  ✅ Complete audit trail (required: banking, medical, legal)
  ✅ Time travel: "what was balance on Jan 1?"
  ✅ Rebuild state if corruption: replay events
  ✅ Multiple projections from same events

Problem: Replaying 1M events to get current balance = slow

Solution: Snapshots + Projections
  Snapshot: store state at event #500, replay only 501-1000
  Projection: maintain separate read-optimized DB updated in real-time
    Kafka consumer listens → updates "balances" table in Postgres
    Query hits Postgres directly (instant, no replay needed)

Projection = "current state" view, but rebuildable from events
→ Different from "just history" because events ARE the source of truth
→ If projection corrupted → delete and rebuild from events
→ If DB history corrupted → can't rebuild (no business logic embedded)
```

---

## CQRS (Command Query Responsibility Segregation)

```
Core idea: Separate WRITE model from READ model

Write side (Commands):
  User action → validate → store event → publish
  Optimized for: consistency, business rules

Read side (Queries):
  Event consumer → update read DB → serve queries
  Optimized for: speed, specific query patterns

┌──────────────────────────────────────────────────┐
│  Command: deposit $100                           │
│      ↓                                           │
│  Event Store (Kafka / Postgres events table)     │
└──────────────────────────────────────────────────┘
                    ↓ events published
┌──────────────────────────────────────────────────┐
│  Projection Builders (Kafka consumers)           │
│      ↓                                           │
│  Redis → current balance (instant read)          │
│  MongoDB → transaction history (searchable)      │
│  Elasticsearch → analytics (aggregations)        │
└──────────────────────────────────────────────────┘

Use when: read:write ratio > 10:1, complex business rules,
          need audit trail, multiple read patterns
Don't use: simple CRUD, small teams, low traffic
```

---

## SAGA Pattern (Distributed Transactions)

```
Problem: Order flow spans 4 services → step 3 fails → how to rollback?
  Order Service → Payment Service → Inventory Service → Shipping Service

Solution: Each step has a compensating transaction (undo)

Success:
  OrderCreated → PaymentCharged → InventoryReserved → ShipmentCreated ✅

Failure at Inventory:
  OrderCreated → PaymentCharged → InventoryFailed ❌
                                        ↓
                              REFUND payment ← CANCEL order

Two styles:
  Choreography: Services publish/subscribe events (no central coordinator)
    Simple, loose coupling, harder to track overall flow

  Orchestration: Central saga coordinator tells each service what to do
    Easier to track, single point of failure
```

---

## API Gateway Pattern

```
Without: Frontend makes 5 separate service calls = 5 round trips
With:    Frontend → Gateway → parallel calls → aggregated response

Gateway handles:
  ✅ Authentication (JWT verify once, not per service)
  ✅ Rate limiting
  ✅ Request routing (/users → user-service)
  ✅ Response aggregation
  ✅ Protocol translation (REST → gRPC)
  ✅ Logging & monitoring

Tools: Kong, AWS API Gateway, Nginx, Envoy, Traefik
```

---

## Coding Patterns

### Rate Limiter (Production — Sliding Window with Redis)
```typescript
async function isAllowed(userId: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now()
  const currentWindow = Math.floor(now / windowMs)
  const prevWindow = currentWindow - 1
  const progress = (now % windowMs) / windowMs

  const pipe = redis.pipeline()
  pipe.get(`rl:${userId}:${currentWindow}`)
  pipe.get(`rl:${userId}:${prevWindow}`)
  const [[, curr], [, prev]] = await pipe.exec()

  const estimated = (Number(prev) || 0) * (1 - progress) + (Number(curr) || 0)
  if (estimated >= limit) return false

  await redis.multi()
    .incr(`rl:${userId}:${currentWindow}`)
    .expire(`rl:${userId}:${currentWindow}`, Math.ceil(windowMs / 1000) * 2)
    .exec()
  return true
}
```

### Consistent Hash Ring
```typescript
import crypto from 'crypto'

class ConsistentHash {
  private ring = new Map<number, string>()
  private keys: number[] = []

  constructor(nodes: string[], private vnodes = 150) {
    nodes.forEach(n => this.add(n))
  }

  private hash(s: string): number {
    return parseInt(crypto.createHash('md5').update(s).digest('hex').slice(0, 8), 16)
  }

  add(node: string) {
    for (let i = 0; i < this.vnodes; i++) {
      const h = this.hash(`${node}#${i}`)
      this.ring.set(h, node)
      this.keys.push(h)
    }
    this.keys.sort((a, b) => a - b)
  }

  remove(node: string) {
    for (let i = 0; i < this.vnodes; i++) {
      const h = this.hash(`${node}#${i}`)
      this.ring.delete(h)
    }
    this.keys = this.keys.filter(k => this.ring.has(k))
  }

  getNode(key: string): string {
    const h = this.hash(key)
    for (const k of this.keys) {
      if (k >= h) return this.ring.get(k)!
    }
    return this.ring.get(this.keys[0])!
  }
}
```

### Distributed Lock (Redis)
```typescript
async function withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T | null> {
  const lockKey = `lock:${key}`
  const acquired = await redis.set(lockKey, '1', 'PX', ttlMs, 'NX')
  if (!acquired) return null // Lock held by another process

  try {
    return await fn()
  } finally {
    await redis.del(lockKey)
  }
}

// Usage: prevent double payment processing
const result = await withLock(`payment:${orderId}`, 10000, async () => {
  return await processPayment(orderId)
})
```

### Bloom Filter
```typescript
class BloomFilter {
  private bits: Uint8Array
  constructor(private size: number, private numHashes: number) {
    this.bits = new Uint8Array(Math.ceil(size / 8))
  }

  private hashes(item: string): number[] {
    const h1 = this.hash(item, 0), h2 = this.hash(item, 1)
    return Array.from({ length: this.numHashes }, (_, i) => Math.abs((h1 + i * h2) % this.size))
  }

  private hash(s: string, seed: number): number {
    let h = seed
    for (const c of s) h = Math.imul(31, h) + c.charCodeAt(0) | 0
    return h
  }

  private bit(pos: number, set?: true) {
    const [b, i] = [Math.floor(pos / 8), pos % 8]
    if (set) this.bits[b] |= 1 << i
    return (this.bits[b] & (1 << i)) !== 0
  }

  add(item: string) { this.hashes(item).forEach(h => this.bit(h, true)) }
  mightContain(item: string): boolean { return this.hashes(item).every(h => this.bit(h)) }
}

// Size formula for n items, p false positive rate:
// m = -(n * ln(p)) / (ln(2)^2)   k = (m/n) * ln(2)
// Example: 1M items, 1% FP → m=9.6M bits (~1.2MB), k=7
```

### Price Verification at Checkout (Common Pattern)
```typescript
// Prevent stale price on buy button
async function checkout(userId: string, items: {id: string, expectedPrice: number}[]) {
  const currentPrices = await db.query(
    'SELECT id, price FROM products WHERE id = ANY($1) FOR UPDATE',
    [items.map(i => i.id)]
  )
  const priceMap = new Map(currentPrices.rows.map(r => [r.id, r.price]))

  const changes = items.filter(i => priceMap.get(i.id) !== i.expectedPrice)
  if (changes.length > 0) {
    return { status: 409, changes } // Let frontend show price-changed dialog
  }

  const order = await createOrder(userId, items, currentPrices)
  return { status: 200, orderId: order.id }
}
```

---

## Monitoring (Observability)

```
Three Pillars:
  Metrics → what is happening (Prometheus + Grafana)
  Logs    → why it happened (ELK Stack / Loki)
  Traces  → where it happened (Jaeger / Zipkin)

RED Method (for every service):
  Rate    = requests per second
  Errors  = error rate %
  Duration = P50, P95, P99 latency

Key alerts to set up:
  Error rate > 1%     → page on-call
  P99 latency > 1s    → page on-call
  CPU > 80% sustained → auto-scale
  DB connections > 80% of max → page on-call
```
