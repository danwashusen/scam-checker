# Database Schema

## Current State: No Database (Pass-through Cache)

For the MVP, we're using a **NoOp cache implementation** with no persistent storage. All data is ephemeral and computed on-demand.

## Future State: DynamoDB Schema

When caching becomes necessary based on cost/performance metrics, here's the DynamoDB schema:

### Table: `scam-checker-cache`

**Primary Key Design:**
- **Partition Key (PK):** `url_hash` (String) - SHA-256 hash of normalized URL
- **Sort Key (SK):** `analysis_version` (String) - Version for cache invalidation (e.g., "v1.0")

**DynamoDB Features Utilized:**
- **TTL (Time to Live):** Auto-expire cache entries after 24 hours
- **On-Demand Pricing:** Pay-per-request, no provisioned capacity
