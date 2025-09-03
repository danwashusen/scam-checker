# Caching Architecture

## Current Implementation: Sophisticated In-Memory Caching

The application implements a **multi-tier LRU cache system** with advanced memory management:

### CacheManager Features
- **LRU Eviction:** Least-recently-used items automatically removed when capacity limits reached
- **TTL Support:** Time-to-live expiration for each cache entry with automatic cleanup
- **Memory Tracking:** Real-time monitoring of cache memory usage with configurable limits
- **Cache Warming:** Proactive population of frequently accessed data
- **Statistics:** Hit/miss ratios, memory usage, and performance metrics
- **Prefix Namespacing:** Multiple cache instances with isolated key spaces

### Cache Configuration
- **Service-Specific Caches:** Separate cache instances for WHOIS, SSL, reputation, and AI analysis
- **Configurable TTLs:** WHOIS (24 hours), SSL (6 hours), AI analysis (1 hour), reputation (30 minutes)
- **Memory Limits:** Default 50MB per cache instance with 80% eviction threshold
- **Development Mode:** All caches in-memory with process lifecycle

### Performance Characteristics
- **Cache Hit Performance:** Sub-millisecond retrieval for cached results
- **Memory Efficiency:** Automatic eviction prevents memory exhaustion
- **Graceful Degradation:** Cache misses fall back to external API calls

## Future Enhancement: DynamoDB Persistence Layer

When deployed to AWS Lambda, caching will extend to include persistent storage:

### Table: `scam-checker-cache`

**Primary Key Design:**
- **Partition Key (PK):** `url_hash` (String) - SHA-256 hash of normalized URL
- **Sort Key (SK):** `analysis_version` (String) - Version for cache invalidation (e.g., "v1.0")

**DynamoDB Features Utilized:**
- **TTL (Time to Live):** Auto-expire cache entries after 24 hours
- **On-Demand Pricing:** Pay-per-request, no provisioned capacity
