# INTERVIEW.md — System Design Interview Prep

## Interview Framework (Use Every Time)

```
Step 1: Clarify Requirements (5 min)
  Functional:     "What features exactly? MVP or full?"
  Non-functional: "What scale? Latency SLA? Availability SLA?"
  Constraints:    "Global or single region? Budget?"

Step 2: Estimate Scale (3 min)
  DAU → QPS (÷ 100K) → storage (× bytes × 365) → bandwidth
  State assumptions clearly: "I'll assume 100M DAU"

Step 3: High-Level Design (10 min)
  Draw: Client → LB → App Servers → Cache → DB
  Identify: Where is the hard part?

Step 4: Deep Dive (15 min)
  Pick the hardest component (usually the one that breaks at scale)
  Database schema + indexes
  API design
  Handle failures

Step 5: Scale It (5 min)
  Identify bottlenecks in your design
  Add: replicas / shards / caches / queues as needed

Step 6: Trade-offs (2 min)
  "This design is strong in X but weak in Y because..."
```

---

## 40 Common Questions

### Tier 1 — Always Asked
```
1.  Design URL Shortener (bit.ly)
2.  Design Rate Limiter
3.  Design Key-Value Store (Redis-like)
4.  Design Unique ID Generator (Snowflake)
5.  Design Notification System
6.  Design Web Crawler
7.  Design Autocomplete / Typeahead
8.  Design Chat App (1-on-1)
9.  Design Distributed Cache
10. Design a Pastebin
```

### Tier 2 — Frequently Asked
```
11. Design Twitter / X
12. Design Instagram
13. Design Facebook News Feed
14. Design YouTube
15. Design Netflix
16. Design Uber / Lyft (ride sharing)
17. Design WhatsApp
18. Design Google Drive / Dropbox
19. Design Amazon / E-commerce
20. Design TikTok
21. Design Google Maps
22. Design Ticketmaster (concert tickets)
23. Design Food Delivery (DoorDash)
24. Design a Search Engine
25. Design Gmail
```

### Tier 3 — Advanced / Specialized
```
26. Design Stock Exchange
27. Design Zoom / Video Conferencing
28. Design Google Docs (collaborative editing)
29. Design Multiplayer Game Backend
30. Design Distributed File System (HDFS)
31. Design Recommendation System
32. Design CDN
33. Design Payment System (Stripe/PayPal)
34. Design Metrics System (Prometheus)
35. Design Distributed Task Scheduler
36. Design Distributed Message Queue (Kafka)
37. Design an Ad Click Aggregation System
38. Design a Hotel Reservation System
39. Design a Code Execution Engine (LeetCode)
40. Design a Proximity Service (Nearby restaurants)
```

---

## Walkthroughs for Top 5

### 1. URL Shortener

```
Scale: 100M URLs/month, read:write = 100:1

QPS: writes = 100M/month / 2.5M sec = 40/sec, reads = 4000/sec
Storage: 100M × 6 months × 500B = 300GB total

Short code: base62 encoding of auto-increment ID
  10^7 = 10M unique codes with 7 chars (plenty for years)
  or hash(longURL) → take first 7 chars

API:
  POST /urls body:{longUrl} → returns {shortUrl}
  GET /{code} → 302 redirect

DB schema:
  urls: id (PK), short_code (indexed), long_url, created_at, expires_at

Caching: 80% reads hit cache (popular short codes)
  Cache: short_code → long_url in Redis (TTL: 24h)

301 vs 302:
  301 Permanent → browser caches, no future requests (less server load)
  302 Temporary → every click hits server (can track analytics)
  Production: use 302 for analytics

Scaling: single DB works for years, add read replica first
```

### 2. Twitter

```
Scale: 300M DAU, 600M tweets/day, read-heavy

The hard part: timeline fanout
  User posts tweet → needs to appear in 300 followers' feeds

Approach 1: Fanout on Write (push)
  Post tweet → worker fans out to all followers' feed cache
  Read: just read from cache (fast!)
  Problem: celebrity with 30M followers → 30M cache writes per tweet

Approach 2: Fanout on Read (pull)
  Post tweet → store in author's timeline
  Read: fetch tweets from all followed users, merge, sort
  Problem: following 1000 people → 1000 DB queries per read (slow)

Twitter's actual solution: Hybrid
  Normal users (<10K followers): fanout on write
  Celebrities (>10K followers): fanout on read
  When you load timeline: cache + "inject" celebrity tweets live

DB choice:
  Tweets: Cassandra (write-heavy, time-series)
  Social graph (follows): Graph DB or Redis sets
  Media: S3 + CDN
  Search: Elasticsearch
```

### 3. Uber

```
Scale: 10M rides/day, 1M concurrent drivers sending GPS every 5s

The hard part: matching rider to nearest available driver

Location storage: Redis GEO
  GEOADD drivers:active {lng} {lat} "driver:123"
  GEORADIUS drivers:active {lng} {lat} 5 km ASC COUNT 10
  → Returns nearest 10 drivers within 5km

GPS update flow:
  Driver app → WebSocket → location service → Redis GEO update
  10M active drivers × 1 update/5sec = 2M updates/sec → Cassandra for history

Matching:
  1. Rider requests → find top 10 nearby drivers (Redis GEO)
  2. Send ride request to each (Kafka topic per driver)
  3. First to accept → matched

ETA calculation: precomputed road graph (Dijkstra-like), refreshed periodically

Surge pricing: city grid cells, track supply/demand ratio per cell
```

### 4. WhatsApp

```
Scale: 1B users, 50B msgs/day, real-time delivery

Core flow: sender → server → receiver
  If receiver offline: store message → deliver when online

Delivery guarantee:
  1. Sender → server: ACK (server received)
  2. Server → receiver: ACK (delivered to device)
  3. Receiver opens app: read receipt

Storage:
  Messages: Cassandra (partitioned by conversation_id + timestamp)
  Media: S3, send URL in message
  User sessions: Redis (which server holds which user's WebSocket)

WebSocket routing (hard part):
  1B users × 1 WebSocket = 1M connections per server (need 1000 servers)
  When A sends to B: A's server looks up "which server holds B?" (Redis)
  → Forward message to B's server → B's server delivers via WebSocket

Group messages (fanout):
  Small groups (<500): fanout to all member WebSockets
  Large groups: use Kafka, each member's server subscribes
```

### 5. Netflix

```
Scale: 200M subscribers, 1B hours watched/day

The hard part: video delivery at scale

Upload pipeline:
  Creator uploads raw video → S3
  → Transcoding service (AWS Elemental / custom)
  → Multiple formats: 4K, 1080p, 720p, 480p
  → Multiple codecs: H.264, H.265, AV1
  → Chunks of 4-10 seconds each
  → Store chunks in S3

Delivery (CDN):
  Netflix has Open Connect Appliances (OCAs) in ISPs worldwide
  ISP gets copy of popular content proactively (not on-demand)
  User → nearest OCA (often same city) = very low latency

Adaptive bitrate:
  Player monitors bandwidth → switches quality automatically
  Start at 480p → upgrade if bandwidth good → never buffer

Recommendation system:
  User history + ratings → collaborative filtering
  "Users like you also watched..." model
  Re-trained daily on Spark, served from feature store

DB choices:
  User data / accounts: MySQL (sharded)
  Viewing history: Cassandra (time-series, write-heavy)
  Recommendations: custom ML, served via feature store
  Metadata (show info): Elasticsearch
  Sessions: Redis
```

---

## Common Follow-up Questions & Answers

```
"How do you handle a database being down?"
→ Circuit breaker pattern, fallback to cache, queue writes for retry

"How do you ensure exactly-once message delivery?"
→ Idempotency keys on consumer side, deduplication window in cache

"How would you debug a slow API in production?"
→ Check metrics (which endpoint), traces (which service/DB query), logs (errors)

"What if one shard gets too hot?"
→ Split the shard further, add caching layer in front, route reads to replica

"How do you deploy without downtime?"
→ Blue-green deployment or rolling update, feature flags, database migrations separately

"How do you handle the thundering herd problem?"
→ Jitter on retry (random delay), circuit breaker, request coalescing, warm cache

"Explain eventual consistency in your design"
→ Reads from replica may be stale up to X ms, acceptable for [use case] because...
   Use master for [critical operations]
```
