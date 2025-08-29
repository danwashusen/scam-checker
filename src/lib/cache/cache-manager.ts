import type { CacheInterface, CacheOptions, CacheEntry, CacheStats } from './cache-types'
import { NoOpCache } from './no-op-cache'
import { Logger } from '../logger'

// Create logger instance - this will be replaced with dependency injection later
const logger = new Logger()

/**
 * CacheManager - Generic cache implementation with configurable backing store
 * Supports multiple instances for different data types with separate TTLs
 * 
 * Usage:
 * const whoisCache = new CacheManager<WhoisData>({
 *   prefix: 'whois',
 *   ttl: 24 * 60 * 60 * 1000, // 24 hours
 *   maxSize: 1000
 * });
 */
export class CacheManager<T> {
  private cache: CacheInterface<CacheEntry<T>>
  private options: Required<CacheOptions>
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    maxSize: 0,
    memoryUsage: 0
  }
  private cleanupTimer?: NodeJS.Timeout

  constructor(
    options: CacheOptions,
    cacheImpl?: CacheInterface<CacheEntry<T>>
  ) {
    this.options = {
      maxSize: 1000,
      ...options,
    }
    
    // Use provided cache implementation or default to NoOpCache for MVP
    this.cache = cacheImpl || new NoOpCache<CacheEntry<T>>()
    this.stats.maxSize = this.options.maxSize
  }

  /**
   * Get item from cache if it exists and hasn't expired
   */
  async get(key: string): Promise<T | null> {
    const cacheKey = this.buildKey(key)
    
    try {
      const entry = await this.cache.get(cacheKey)
      
      if (!entry) {
        this.stats.misses++
        this.updateHitRate()
        return null
      }

      // Check if entry has expired
      if (entry.expiresAt < Date.now()) {
        // Remove expired entry
        await this.cache.delete(cacheKey)
        this.stats.misses++
        this.updateHitRate()
        return null
      }

      this.stats.hits++
      this.updateHitRate()
      return entry.data
    } catch (error) {
      logger.error('Cache get error', {
        cacheKey,
        error: error instanceof Error ? error : new Error(String(error))
      })
      this.stats.misses++
      this.updateHitRate()
      return null
    }
  }

  /**
   * Set item in cache with TTL
   */
  async set(key: string, value: T, customTtl?: number): Promise<void> {
    const cacheKey = this.buildKey(key)
    const ttl = customTtl || this.options.ttl
    const now = Date.now()
    
    const entry: CacheEntry<T> = {
      data: value,
      expiresAt: now + ttl,
      createdAt: now,
      size: 0, // Size tracking will be handled by the cache implementation
      accessCount: 1,
      lastAccessed: now
    }

    try {
      await this.cache.set(cacheKey, entry, ttl)
      await this.updateSize()
    } catch (error) {
      logger.error('Cache set error', {
        cacheKey,
        error: error instanceof Error ? error : new Error(String(error))
      })
      // Continue operation even if cache fails
    }
  }

  /**
   * Delete item from cache
   */
  async delete(key: string): Promise<boolean> {
    const cacheKey = this.buildKey(key)
    
    try {
      const deleted = await this.cache.delete(cacheKey)
      if (deleted) {
        await this.updateSize()
      }
      return deleted
    } catch (error) {
      logger.error('Cache delete error', {
        cacheKey,
        error: error instanceof Error ? error : new Error(String(error))
      })
      return false
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const cacheKey = this.buildKey(key)
    
    try {
      return await this.cache.has(cacheKey)
    } catch (error) {
      logger.error('Cache has error', {
        cacheKey,
        error: error instanceof Error ? error : new Error(String(error))
      })
      return false
    }
  }

  /**
   * Clear all entries from this cache instance
   */
  async clear(): Promise<void> {
    try {
      await this.cache.clear()
      this.stats.size = 0
    } catch (error) {
      logger.error('Cache clear error', {
        error: error instanceof Error ? error : new Error(String(error))
      })
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    let cleaned = 0
    
    try {
      const keys = await this.cache.keys()
      const now = Date.now()
      
      for (const key of keys) {
        if (!key.startsWith(this.options.prefix + ':')) {
          continue // Skip keys that don't belong to this cache instance
        }
        
        const entry = await this.cache.get(key)
        if (entry && entry.expiresAt < now) {
          await this.cache.delete(key)
          cleaned++
        }
      }
      
      await this.updateSize()
    } catch (error) {
      logger.error('Cache cleanup error', {
        error: error instanceof Error ? error : new Error(String(error))
      })
    }
    
    return cleaned
  }

  /**
   * Get or set pattern - retrieve from cache or compute and cache the result
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    customTtl?: number
  ): Promise<T> {
    const cached = await this.get(key)
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    await this.set(key, value, customTtl)
    return value
  }

  /**
   * Start background cleanup timer
   */
  startBackgroundCleanup(intervalMs?: number): void {
    if (this.cleanupTimer) {
      this.stopBackgroundCleanup()
    }

    const interval = intervalMs || 5 * 60 * 1000 // Default 5 minutes
    
    this.cleanupTimer = setInterval(async () => {
      try {
        const cleaned = await this.cleanup()
        if (cleaned > 0) {
          logger.debug('Background cache cleanup completed', {
            prefix: this.options.prefix,
            entriesCleaned: cleaned,
            remainingSize: this.stats.size
          })
        }
      } catch (error) {
        logger.error('Background cache cleanup failed', {
          prefix: this.options.prefix,
          error: error instanceof Error ? error : new Error(String(error))
        })
      }
    }, interval)

    logger.info('Started background cache cleanup', {
      prefix: this.options.prefix,
      intervalMs: interval
    })
  }

  /**
   * Stop background cleanup timer
   */
  stopBackgroundCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
      
      logger.info('Stopped background cache cleanup', {
        prefix: this.options.prefix
      })
    }
  }

  /**
   * Get memory usage statistics if supported by cache implementation
   */
  async getMemoryUsage(): Promise<{ current: number; max: number; percentage: number } | null> {
    try {
      // Check if the cache implementation supports memory usage tracking
      if ('getMemoryUsage' in this.cache && typeof this.cache.getMemoryUsage === 'function') {
        return (this.cache as unknown as { getMemoryUsage: () => { current: number; max: number; percentage: number } }).getMemoryUsage()
      }
      return null
    } catch (error) {
      logger.warn('Failed to get memory usage from cache implementation', {
        prefix: this.options.prefix,
        error: error instanceof Error ? error : new Error(String(error))
      })
      return null
    }
  }

  /**
   * Get enhanced statistics including memory usage
   */
  async getEnhancedStats(): Promise<{
    hits: number
    misses: number
    hitRate: number
    size: number
    maxSize: number
    memoryUsage?: { current: number; max: number; percentage: number }
  }> {
    const baseStats = this.getStats()
    const memoryUsage = await this.getMemoryUsage()
    
    // Create new stats object with proper typing
    return {
      hits: baseStats.hits,
      misses: baseStats.misses,
      hitRate: baseStats.hitRate,
      size: baseStats.size,
      maxSize: baseStats.maxSize,
      memoryUsage: memoryUsage || undefined
    }
  }

  /**
   * Warm cache with multiple entries
   */
  async warmCache(entries: Array<{ key: string; factory: () => Promise<T>; ttl?: number }>): Promise<void> {
    const warmingPromises = entries.map(async ({ key, factory, ttl }) => {
      try {
        // Check if entry already exists and is not near expiry
        const existing = await this.get(key)
        if (existing !== null) {
          return // Entry already cached
        }

        // Generate and cache the value
        const value = await factory()
        await this.set(key, value, ttl)
        
        logger.debug('Cache entry warmed', {
          prefix: this.options.prefix,
          key
        })
      } catch (error) {
        logger.warn('Failed to warm cache entry', {
          prefix: this.options.prefix,
          key,
          error: error instanceof Error ? error : new Error(String(error))
        })
      }
    })

    await Promise.all(warmingPromises)
    logger.info('Cache warming completed', {
      prefix: this.options.prefix,
      entriesWarmed: entries.length
    })
  }

  /**
   * Invalidate entries by pattern
   */
  async invalidatePattern(pattern: RegExp): Promise<number> {
    let invalidatedCount = 0
    
    try {
      const keys = await this.cache.keys()
      const matchingKeys = keys.filter(key => pattern.test(key))
      
      for (const key of matchingKeys) {
        await this.cache.delete(key)
        invalidatedCount++
      }
      
      await this.updateSize()
      
      logger.info('Cache invalidation by pattern completed', {
        prefix: this.options.prefix,
        pattern: pattern.toString(),
        invalidatedCount
      })
    } catch (error) {
      logger.error('Cache invalidation by pattern failed', {
        prefix: this.options.prefix,
        pattern: pattern.toString(),
        error: error instanceof Error ? error : new Error(String(error))
      })
    }
    
    return invalidatedCount
  }

  /**
   * Destroy cache manager and cleanup resources
   */
  destroy(): void {
    this.stopBackgroundCleanup()
    
    // If cache implementation has destroy method, call it
    if ('destroy' in this.cache && typeof this.cache.destroy === 'function') {
      try {
        (this.cache as unknown as { destroy: () => void }).destroy()
      } catch (error) {
        logger.warn('Error destroying cache implementation', {
          prefix: this.options.prefix,
          error: error instanceof Error ? error : new Error(String(error))
        })
      }
    }

    logger.info('Cache manager destroyed', {
      prefix: this.options.prefix
    })
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.options.prefix}:${key}`
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }

  /**
   * Update cache size stats
   */
  private async updateSize(): Promise<void> {
    try {
      this.stats.size = await this.cache.size()
    } catch (error) {
      // Size tracking is not critical, continue without it
      logger.warn('Could not update cache size stats', {
        error: error instanceof Error ? error : new Error(String(error))
      })
    }
  }
}