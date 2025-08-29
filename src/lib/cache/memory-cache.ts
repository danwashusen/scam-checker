import type { CacheInterface, CacheEntry, MemoryCacheOptions } from './cache-types'
import { LRUManager } from './lru-manager'
import { Logger } from '../logger'

// Create logger instance for cache operations
const logger = new Logger()

/**
 * MemoryCache - High-performance in-memory cache implementation
 * 
 * Features:
 * - LRU eviction for memory management
 * - TTL-based expiration
 * - Memory usage tracking and limits
 * - O(1) operations for get/set/delete
 * - Background cleanup of expired entries
 * - Comprehensive statistics tracking
 */
export class MemoryCache<T> implements CacheInterface<T> {
  private storage: Map<string, T> = new Map()
  private lruManager: LRUManager = new LRUManager()
  private memoryUsage: number = 0
  private maxMemoryBytes: number
  private evictionThreshold: number
  private enableMemoryTracking: boolean
  private defaultTtl: number
  private cleanupTimer?: NodeJS.Timeout

  constructor(options: MemoryCacheOptions) {
    this.maxMemoryBytes = (options.maxMemoryMB || 100) * 1024 * 1024 // Convert MB to bytes
    this.evictionThreshold = options.evictionThreshold || 0.8
    this.enableMemoryTracking = options.enableMemoryTracking !== false
    this.defaultTtl = options.ttl

    // Start background cleanup if cleanup interval provided
    if (options.ttl && options.ttl > 0) {
      this.startBackgroundCleanup(Math.max(options.ttl / 4, 60000)) // Cleanup every 1/4 TTL or 1 minute minimum
    }
  }

  async get(key: string): Promise<T | null> {
    const entry = this.storage.get(key)
    
    if (!entry) {
      return null
    }

    // Type guard to ensure we have a CacheEntry
    if (!this.isCacheEntry(entry)) {
      // Remove invalid entry
      await this.delete(key)
      return null
    }

    // Check TTL expiration
    if (entry.expiresAt < Date.now()) {
      // Remove expired entry
      await this.delete(key)
      return null
    }

    // Update LRU tracking
    this.lruManager.markAccessed(key)
    entry.lastAccessed = Date.now()
    entry.accessCount++

    return entry.data
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    const now = Date.now()
    const estimatedSize = this.enableMemoryTracking ? this.calculateMemorySize(value) : 1024 // Default 1KB if tracking disabled
    
    // Create cache entry
    const entry: CacheEntry<T> = {
      data: value,
      expiresAt: now + (ttl || this.defaultTtl), // Use provided TTL or default
      createdAt: now,
      size: estimatedSize,
      accessCount: 1,
      lastAccessed: now
    }

    // Handle existing key replacement
    if (this.storage.has(key)) {
      const oldEntry = this.storage.get(key)
      if (oldEntry && this.isCacheEntry(oldEntry)) {
        this.memoryUsage -= oldEntry.size
      }
      this.lruManager.remove(key)
    }

    // Ensure memory capacity before storing
    await this.ensureMemoryCapacity(estimatedSize)

    // Store new entry
    this.storage.set(key, entry as T)
    this.lruManager.addMostRecentlyUsed(key)
    this.memoryUsage += estimatedSize
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.storage.get(key)
    
    if (!entry) {
      return false
    }

    // Update memory tracking
    if (this.isCacheEntry(entry)) {
      this.memoryUsage -= entry.size
    }

    // Remove from storage and LRU tracking
    this.storage.delete(key)
    this.lruManager.remove(key)
    
    return true
  }

  async clear(): Promise<void> {
    this.storage.clear()
    this.lruManager.clear()
    this.memoryUsage = 0
  }

  async has(key: string): Promise<boolean> {
    if (!this.storage.has(key)) {
      return false
    }

    // Check if entry is expired
    const entry = this.storage.get(key)
    if (entry && this.isCacheEntry(entry) && entry.expiresAt < Date.now()) {
      // Remove expired entry
      await this.delete(key)
      return false
    }

    return true
  }

  async size(): Promise<number> {
    return this.storage.size
  }

  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys())
  }

  /**
   * Clean up expired entries
   * Returns number of entries cleaned
   */
  async cleanup(): Promise<number> {
    let cleanedCount = 0
    const now = Date.now()

    for (const [key, entry] of this.storage) {
      if (this.isCacheEntry(entry) && entry.expiresAt < now) {
        await this.delete(key)
        cleanedCount++
      }
    }

    return cleanedCount
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage(): { current: number; max: number; percentage: number } {
    return {
      current: this.memoryUsage,
      max: this.maxMemoryBytes,
      percentage: this.maxMemoryBytes > 0 ? (this.memoryUsage / this.maxMemoryBytes) * 100 : 0
    }
  }

  /**
   * Get cache statistics
   */
  getStatistics(): {
    size: number
    memoryUsage: number
    maxMemory: number
    totalHits: number
    averageAccessCount: number
  } {
    let totalHits = 0
    let entryCount = 0

    for (const entry of this.storage.values()) {
      if (this.isCacheEntry(entry)) {
        totalHits += entry.accessCount
        entryCount++
      }
    }

    return {
      size: this.storage.size,
      memoryUsage: this.memoryUsage,
      maxMemory: this.maxMemoryBytes,
      totalHits,
      averageAccessCount: entryCount > 0 ? totalHits / entryCount : 0
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    this.clear()
  }

  // Private helper methods

  private isCacheEntry(entry: unknown): entry is CacheEntry<T> {
    if (!entry || typeof entry !== 'object') {
      return false
    }
    
    const obj = entry as Record<string, unknown>
    return 'data' in obj &&
           'expiresAt' in obj &&
           'createdAt' in obj &&
           'size' in obj &&
           'accessCount' in obj &&
           'lastAccessed' in obj &&
           typeof obj.expiresAt === 'number' &&
           typeof obj.createdAt === 'number' &&
           typeof obj.size === 'number' &&
           typeof obj.accessCount === 'number' &&
           typeof obj.lastAccessed === 'number'
  }

  private calculateMemorySize(value: T): number {
    try {
      // Estimate memory usage using JSON.stringify length
      // This is an approximation - actual memory usage can vary
      const jsonString = JSON.stringify(value)
      return jsonString.length * 2 // Multiply by 2 to account for object overhead
    } catch (error) {
      // Fallback to conservative estimate if serialization fails
      logger.warn('Failed to calculate memory size for cache entry', { 
        error: error instanceof Error ? error : new Error(String(error))
      })
      return 1024 // 1KB default
    }
  }

  private async ensureMemoryCapacity(requiredSize: number): Promise<void> {
    // Check if we need to evict entries
    const thresholdBytes = this.maxMemoryBytes * this.evictionThreshold
    
    while (this.memoryUsage + requiredSize > thresholdBytes && this.lruManager.size() > 0) {
      const lruKey = this.lruManager.getLeastRecentlyUsed()
      
      if (!lruKey) {
        logger.error('LRU manager reported entries but could not provide LRU key')
        break
      }

      const evicted = await this.delete(lruKey)
      
      if (!evicted) {
        logger.warn('Failed to evict LRU entry', { key: lruKey })
        break
      }

      logger.debug('Evicted LRU cache entry for memory management', { 
        key: lruKey,
        memoryUsage: this.memoryUsage,
        maxMemory: this.maxMemoryBytes
      })
    }

    // Emergency cleanup if still over limit
    if (this.memoryUsage + requiredSize > this.maxMemoryBytes) {
      logger.warn('Cache approaching memory limit, performing emergency cleanup', {
        current: this.memoryUsage,
        required: requiredSize,
        max: this.maxMemoryBytes
      })
      
      await this.cleanup()
    }
  }

  private startBackgroundCleanup(intervalMs: number): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        const cleaned = await this.cleanup()
        if (cleaned > 0) {
          logger.debug('Background cache cleanup completed', { 
            entriesCleaned: cleaned,
            remainingSize: this.storage.size
          })
        }
      } catch (error) {
        logger.error('Background cache cleanup failed', { 
          error: error instanceof Error ? error : new Error(String(error))
        })
      }
    }, intervalMs)
  }
}