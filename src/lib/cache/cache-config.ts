import type { CacheLayerConfig, MemoryCacheOptions } from './cache-types'

/**
 * CacheConfig - Configuration management for cache system
 * 
 * Provides environment-specific cache configurations and validation
 * Supports multi-layer caching with different TTL strategies
 */
export class CacheConfig {
  /**
   * Get default cache configuration
   */
  static getDefaultConfig(): CacheLayerConfig {
    return {
      memory: {
        maxSizeMB: 100,
        evictionThreshold: 0.8
      },
      layers: {
        // L1 Cache: Full URL analysis results (highest value operations)
        l1: {
          ttl: 4 * 60 * 60 * 1000, // 4 hours
          maxEntries: 500
        },
        // L2 Cache: Domain-level data (WHOIS, base reputation)
        l2: {
          ttl: 24 * 60 * 60 * 1000, // 24 hours for WHOIS
          maxEntries: 1000
        },
        // L3 Cache: SSL certificate data (intermediate update frequency)
        l3: {
          ttl: 12 * 60 * 60 * 1000, // 12 hours
          maxEntries: 750
        },
        // Reputation Cache: More frequent updates
        reputation: {
          ttl: 6 * 60 * 60 * 1000, // 6 hours
          maxEntries: 2000
        }
      },
      warming: {
        enabled: false,
        popularDomains: []
      }
    }
  }

  /**
   * Get environment-specific cache configuration
   */
  static getEnvironmentConfig(env: string): CacheLayerConfig {
    const baseConfig = this.getDefaultConfig()

    switch (env.toLowerCase()) {
      case 'production':
        return {
          ...baseConfig,
          memory: {
            maxSizeMB: 512, // Higher memory limit for production
            evictionThreshold: 0.85
          },
          layers: {
            ...baseConfig.layers,
            l1: { ttl: 4 * 60 * 60 * 1000, maxEntries: 2000 },
            l2: { ttl: 24 * 60 * 60 * 1000, maxEntries: 5000 },
            l3: { ttl: 12 * 60 * 60 * 1000, maxEntries: 3000 },
            reputation: { ttl: 6 * 60 * 60 * 1000, maxEntries: 10000 }
          },
          warming: {
            enabled: true,
            popularDomains: [
              'google.com', 'facebook.com', 'amazon.com', 'microsoft.com',
              'apple.com', 'youtube.com', 'twitter.com', 'linkedin.com'
            ]
          }
        }

      case 'staging':
        return {
          ...baseConfig,
          memory: {
            maxSizeMB: 256,
            evictionThreshold: 0.8
          },
          layers: {
            ...baseConfig.layers,
            l1: { ttl: 2 * 60 * 60 * 1000, maxEntries: 1000 }, // Shorter TTL for staging
            l2: { ttl: 12 * 60 * 60 * 1000, maxEntries: 2500 },
            l3: { ttl: 6 * 60 * 60 * 1000, maxEntries: 1500 },
            reputation: { ttl: 3 * 60 * 60 * 1000, maxEntries: 5000 }
          },
          warming: {
            enabled: true,
            popularDomains: ['google.com', 'example.com']
          }
        }

      case 'development':
      case 'test':
      default:
        return {
          ...baseConfig,
          memory: {
            maxSizeMB: 50, // Conservative memory usage for development
            evictionThreshold: 0.75
          },
          layers: {
            ...baseConfig.layers,
            l1: { ttl: 30 * 60 * 1000, maxEntries: 100 }, // 30 minutes for faster development cycles
            l2: { ttl: 60 * 60 * 1000, maxEntries: 200 }, // 1 hour
            l3: { ttl: 45 * 60 * 1000, maxEntries: 150 }, // 45 minutes
            reputation: { ttl: 15 * 60 * 1000, maxEntries: 300 } // 15 minutes
          },
          warming: {
            enabled: false,
            popularDomains: []
          }
        }
    }
  }

  /**
   * Validate cache configuration
   */
  static validateConfig(config: CacheLayerConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate memory configuration
    if (config.memory.maxSizeMB <= 0) {
      errors.push('Memory maxSizeMB must be greater than 0')
    }

    if (config.memory.evictionThreshold <= 0 || config.memory.evictionThreshold > 1) {
      errors.push('Memory evictionThreshold must be between 0 and 1')
    }

    // Validate layer configurations
    for (const [layerName, layerConfig] of Object.entries(config.layers)) {
      if (layerConfig.ttl <= 0) {
        errors.push(`Layer ${layerName} TTL must be greater than 0`)
      }

      if (layerConfig.maxEntries <= 0) {
        errors.push(`Layer ${layerName} maxEntries must be greater than 0`)
      }

      // Check for reasonable TTL values (not too small)
      if (layerConfig.ttl < 60000) { // Less than 1 minute
        errors.push(`Layer ${layerName} TTL is very small (${layerConfig.ttl}ms), consider increasing it`)
      }
    }

    // Validate warming configuration
    if (config.warming.enabled && config.warming.popularDomains.length === 0) {
      errors.push('Cache warming is enabled but no popular domains provided')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Create MemoryCacheOptions for a specific cache layer
   */
  static createMemoryCacheOptions(
    prefix: string,
    layerName: string,
    config: CacheLayerConfig
  ): MemoryCacheOptions {
    const layerConfig = config.layers[layerName]
    
    if (!layerConfig) {
      throw new Error(`Unknown cache layer: ${layerName}`)
    }

    return {
      prefix,
      ttl: layerConfig.ttl,
      maxSize: layerConfig.maxEntries,
      maxMemoryMB: config.memory.maxSizeMB,
      evictionThreshold: config.memory.evictionThreshold,
      enableMemoryTracking: true
    }
  }

  /**
   * Get cache configuration from environment variables
   */
  static getConfigFromEnvironment(): CacheLayerConfig {
    const env = process.env.NODE_ENV || 'development'
    const config = this.getEnvironmentConfig(env)

    // Allow environment variable overrides
    if (process.env.CACHE_MAX_MEMORY_MB) {
      config.memory.maxSizeMB = parseInt(process.env.CACHE_MAX_MEMORY_MB, 10)
    }

    if (process.env.CACHE_EVICTION_THRESHOLD) {
      config.memory.evictionThreshold = parseFloat(process.env.CACHE_EVICTION_THRESHOLD)
    }

    if (process.env.CACHE_WARMING_ENABLED !== undefined) {
      config.warming.enabled = process.env.CACHE_WARMING_ENABLED === 'true'
    }

    // Validate the final configuration
    const validation = this.validateConfig(config)
    if (!validation.valid) {
      throw new Error(`Invalid cache configuration: ${validation.errors.join(', ')}`)
    }

    return config
  }

  /**
   * Get cache statistics configuration
   */
  static getStatsConfig(): {
    enableDetailedStats: boolean
    statsSampleRate: number
    statsRetentionHours: number
  } {
    return {
      enableDetailedStats: process.env.NODE_ENV !== 'production',
      statsSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% sampling in prod
      statsRetentionHours: 24
    }
  }

  /**
   * Create cache key for different data types
   */
  static createCacheKey(type: 'url' | 'domain' | 'reputation' | 'ssl', identifier: string, extra?: string): string {
    const normalizedIdentifier = identifier.toLowerCase().trim()
    const timestamp = Math.floor(Date.now() / (60 * 60 * 1000)) // Hour-based versioning
    
    switch (type) {
      case 'url':
        return `url:${normalizedIdentifier}:${timestamp}`
      case 'domain':
        return `domain:${normalizedIdentifier}:${extra || 'general'}:${timestamp}`
      case 'reputation':
        return `reputation:${normalizedIdentifier}:${extra || 'default'}`
      case 'ssl':
        return `ssl:${normalizedIdentifier}:${extra || '443'}`
      default:
        throw new Error(`Unknown cache key type: ${type}`)
    }
  }
}