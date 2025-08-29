import type { CacheManager } from './cache-manager'
import { Logger } from '../logger'

const logger = new Logger()

/**
 * Cache warming entry configuration
 */
export interface WarmingEntry<T> {
  key: string
  factory: () => Promise<T>
  ttl?: number
  priority?: 'high' | 'medium' | 'low'
}

/**
 * Cache warming result
 */
export interface WarmingResult {
  totalEntries: number
  successCount: number
  failureCount: number
  duration: number
  errors: Array<{ key: string; error: string }>
}

/**
 * Cache warming configuration
 */
export interface WarmingConfig {
  maxConcurrency: number
  retryAttempts: number
  retryDelayMs: number
  timeoutMs: number
  enableBackgroundRefresh: boolean
  refreshIntervalMs: number
}

/**
 * Cache warming implementation for preloading frequently accessed data
 */
export class CacheWarming {
  private config: WarmingConfig
  private refreshTimer?: NodeJS.Timeout
  private warmingInProgress = false

  constructor(config?: Partial<WarmingConfig>) {
    this.config = {
      maxConcurrency: 5,
      retryAttempts: 2,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      enableBackgroundRefresh: false,
      refreshIntervalMs: 60 * 60 * 1000, // 1 hour
      ...config
    }
  }

  /**
   * Warm cache with popular domains
   */
  async warmPopularDomains<T>(
    cache: CacheManager<T>,
    domains: string[],
    factory: (domain: string) => Promise<T>
  ): Promise<WarmingResult> {
    const entries: WarmingEntry<T>[] = domains.map(domain => ({
      key: domain,
      factory: () => factory(domain),
      priority: 'high'
    }))

    return this.warmCache(cache, entries)
  }

  /**
   * Warm cache with multiple entries
   */
  async warmCache<T>(
    cache: CacheManager<T>, 
    entries: WarmingEntry<T>[]
  ): Promise<WarmingResult> {
    if (this.warmingInProgress) {
      throw new Error('Cache warming already in progress')
    }

    this.warmingInProgress = true
    const startTime = Date.now()
    
    try {
      logger.info('Starting cache warming', {
        entryCount: entries.length,
        maxConcurrency: this.config.maxConcurrency
      })

      const result = await this.executeWarmingWithConcurrency(cache, entries)
      
      const duration = Date.now() - startTime
      const finalResult = { ...result, duration }

      logger.info('Cache warming completed', {
        ...finalResult,
        successRate: `${((finalResult.successCount / finalResult.totalEntries) * 100).toFixed(1)}%`
      })

      return finalResult
    } finally {
      this.warmingInProgress = false
    }
  }

  /**
   * Preload critical data that should always be cached
   */
  async preloadCriticalData<T>(
    cache: CacheManager<T>,
    criticalEntries: WarmingEntry<T>[]
  ): Promise<WarmingResult> {
    // Filter for high-priority entries only
    const highPriorityEntries = criticalEntries.filter(entry => 
      entry.priority === 'high' || !entry.priority
    )

    // Set shorter timeout for critical data
    const originalTimeout = this.config.timeoutMs
    this.config.timeoutMs = 10000 // 10 seconds for critical data

    try {
      const result = await this.warmCache(cache, highPriorityEntries)
      
      // Log any failures for critical data
      if (result.failureCount > 0) {
        logger.error('Failed to preload some critical cache entries', {
          failureCount: result.failureCount,
          errors: result.errors
        })
      }

      return result
    } finally {
      this.config.timeoutMs = originalTimeout
    }
  }

  /**
   * Schedule background refresh for cached entries
   */
  async scheduleBackgroundRefresh<T>(
    cache: CacheManager<T>,
    refreshEntries: () => Promise<WarmingEntry<T>[]>
  ): Promise<void> {
    if (!this.config.enableBackgroundRefresh) {
      logger.debug('Background cache refresh is disabled')
      return
    }

    if (this.refreshTimer) {
      this.stopBackgroundRefresh()
    }

    this.refreshTimer = setInterval(async () => {
      try {
        logger.debug('Starting background cache refresh')
        
        const entries = await refreshEntries()
        if (entries.length === 0) {
          logger.debug('No entries to refresh')
          return
        }

        // Only refresh entries that are near expiry or missing
        const entriesToRefresh = await this.filterEntriesForRefresh(cache, entries)
        
        if (entriesToRefresh.length === 0) {
          logger.debug('All entries are fresh, skipping refresh')
          return
        }

        const result = await this.warmCache(cache, entriesToRefresh)
        
        logger.info('Background cache refresh completed', {
          entriesRefreshed: result.successCount,
          failures: result.failureCount
        })
      } catch (error) {
        logger.error('Background cache refresh failed', {
          error: error instanceof Error ? error : new Error(String(error))
        })
      }
    }, this.config.refreshIntervalMs)

    logger.info('Background cache refresh scheduled', {
      intervalMs: this.config.refreshIntervalMs
    })
  }

  /**
   * Stop background refresh
   */
  stopBackgroundRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
      logger.info('Background cache refresh stopped')
    }
  }

  /**
   * Check if cache warming is currently in progress
   */
  isWarmingInProgress(): boolean {
    return this.warmingInProgress
  }

  /**
   * Update warming configuration
   */
  updateConfig(config: Partial<WarmingConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('Cache warming configuration updated', { config: this.config })
  }

  /**
   * Destroy warming instance and cleanup
   */
  destroy(): void {
    this.stopBackgroundRefresh()
    this.warmingInProgress = false
    logger.info('Cache warming instance destroyed')
  }

  // Private helper methods

  private async executeWarmingWithConcurrency<T>(
    cache: CacheManager<T>,
    entries: WarmingEntry<T>[]
  ): Promise<Omit<WarmingResult, 'duration'>> {
    const result: Omit<WarmingResult, 'duration'> = {
      totalEntries: entries.length,
      successCount: 0,
      failureCount: 0,
      errors: []
    }

    // Process entries in batches based on concurrency limit
    for (let i = 0; i < entries.length; i += this.config.maxConcurrency) {
      const batch = entries.slice(i, i + this.config.maxConcurrency)
      const batchPromises = batch.map(entry => this.warmEntry(cache, entry))
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((batchResult, index) => {
        if (batchResult.status === 'fulfilled') {
          result.successCount++
        } else {
          result.failureCount++
          result.errors.push({
            key: batch[index].key,
            error: batchResult.reason?.message || 'Unknown error'
          })
        }
      })
    }

    return result
  }

  private async warmEntry<T>(
    cache: CacheManager<T>,
    entry: WarmingEntry<T>
  ): Promise<void> {
    let attempts = 0
    let lastError: Error | null = null

    while (attempts <= this.config.retryAttempts) {
      try {
        // Check if entry already exists and is fresh
        const existing = await cache.get(entry.key)
        if (existing !== null) {
          logger.debug('Cache entry already exists, skipping warming', { key: entry.key })
          return
        }

        // Execute with timeout
        const value = await this.executeWithTimeout(entry.factory(), this.config.timeoutMs)
        await cache.set(entry.key, value, entry.ttl)

        logger.debug('Cache entry warmed successfully', { key: entry.key })
        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        attempts++

        if (attempts <= this.config.retryAttempts) {
          logger.debug('Retrying cache warming', {
            key: entry.key,
            attempt: attempts,
            error: lastError || new Error('Unknown error')
          })
          
          // Exponential backoff
          await this.delay(this.config.retryDelayMs * attempts)
        }
      }
    }

    if (lastError) {
      throw lastError
    } else {
      throw new Error(`Failed to warm cache entry after ${attempts} attempts`)
    }
  }

  private async filterEntriesForRefresh<T>(
    cache: CacheManager<T>,
    entries: WarmingEntry<T>[]
  ): Promise<WarmingEntry<T>[]> {
    const entriesToRefresh: WarmingEntry<T>[] = []

    for (const entry of entries) {
      try {
        const existing = await cache.get(entry.key)
        
        // If entry doesn't exist or we can't determine freshness, include it for refresh
        if (existing === null) {
          entriesToRefresh.push(entry)
        }
        // Note: More sophisticated freshness checking could be implemented here
        // by examining cache entry metadata
      } catch (_error) {
        // If we can't check the entry, include it for refresh
        entriesToRefresh.push(entry)
      }
    }

    return entriesToRefresh
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    })

    return Promise.race([promise, timeoutPromise])
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Utility function to create warming entries for popular domains
 */
export function createDomainWarmingEntries<T>(
  domains: string[],
  factory: (domain: string) => Promise<T>,
  ttl?: number
): WarmingEntry<T>[] {
  return domains.map(domain => ({
    key: domain,
    factory: () => factory(domain),
    ttl,
    priority: 'high'
  }))
}

/**
 * Utility function to create warming configuration based on environment
 */
export function createWarmingConfig(environment: string): WarmingConfig {
  switch (environment.toLowerCase()) {
    case 'production':
      return {
        maxConcurrency: 10,
        retryAttempts: 3,
        retryDelayMs: 2000,
        timeoutMs: 30000,
        enableBackgroundRefresh: true,
        refreshIntervalMs: 30 * 60 * 1000 // 30 minutes
      }
    
    case 'staging':
      return {
        maxConcurrency: 5,
        retryAttempts: 2,
        retryDelayMs: 1500,
        timeoutMs: 20000,
        enableBackgroundRefresh: true,
        refreshIntervalMs: 60 * 60 * 1000 // 1 hour
      }
    
    case 'development':
    case 'test':
    default:
      return {
        maxConcurrency: 3,
        retryAttempts: 1,
        retryDelayMs: 1000,
        timeoutMs: 15000,
        enableBackgroundRefresh: false,
        refreshIntervalMs: 2 * 60 * 60 * 1000 // 2 hours
      }
  }
}