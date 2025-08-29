import { ReputationService } from '../analysis/reputation-service'
import { WhoisService } from '../analysis/whois-service'
import { SSLService } from '../analysis/ssl-service'
import { AIURLAnalyzer } from '../analysis/ai-url-analyzer'
import { ScoringCalculator } from '../scoring/scoring-calculator'
import { AnalysisOrchestrator } from '../orchestration/analysis-orchestrator'
import { Logger } from '../logger'
import { CacheManager } from '../cache/cache-manager'
import { MemoryCache } from '../cache/memory-cache'
import { CacheConfig } from '../cache/cache-config'
import type {
  SafeBrowsingConfig,
  WhoisServiceConfig,
  SSLServiceConfig,
  AIAnalyzerConfig,
  LoggerConfig,
  ServicesConfig,
  AnalysisServices,
  ServiceEnvironment
} from '../../types/services'
import type { MemoryCacheOptions, CacheEntry } from '../cache/cache-types'
import type { ScoringConfig } from '../../types/scoring'
import type { OrchestrationConfig } from '../orchestration/analysis-orchestrator'

/**
 * Service Factory for creating service instances with dependency injection
 * Replaces singleton pattern with factory pattern for improved testability and configuration management
 */
export class ServiceFactory {
  /**
   * Create MemoryCache instance with configuration
   */
  static createMemoryCache<T>(options: MemoryCacheOptions): CacheManager<T> {
    const memoryCache = new MemoryCache<CacheEntry<T>>(options)
    return new CacheManager<T>(options, memoryCache)
  }

  /**
   * Create cache instances for different service types based on environment
   */
  static createServiceCaches(environment: ServiceEnvironment = 'development'): {
    reputation: CacheManager<unknown>
    whois: CacheManager<unknown>
    ssl: CacheManager<unknown>
    ai: CacheManager<unknown>
  } {
    const config = CacheConfig.getEnvironmentConfig(environment)
    
    return {
      reputation: this.createMemoryCache(
        CacheConfig.createMemoryCacheOptions('reputation', 'reputation', config)
      ),
      whois: this.createMemoryCache(
        CacheConfig.createMemoryCacheOptions('whois', 'l2', config)
      ),
      ssl: this.createMemoryCache(
        CacheConfig.createMemoryCacheOptions('ssl', 'l3', config)
      ),
      ai: this.createMemoryCache(
        CacheConfig.createMemoryCacheOptions('ai', 'l1', config)
      )
    }
  }
  /**
   * Create ReputationService instance with optional configuration
   */
  static createReputationService(config?: Partial<SafeBrowsingConfig>): ReputationService {
    return new ReputationService(config)
  }

  /**
   * Create WhoisService instance with optional configuration
   */
  static createWhoisService(config?: Partial<WhoisServiceConfig>): WhoisService {
    return new WhoisService(config)
  }

  /**
   * Create SSLService instance with optional configuration
   */
  static createSSLService(config?: Partial<SSLServiceConfig>): SSLService {
    return new SSLService(config)
  }

  /**
   * Create AIURLAnalyzer instance with optional configuration
   */
  static createAIURLAnalyzer(_config?: Partial<AIAnalyzerConfig>): AIURLAnalyzer {
    // AIURLAnalyzer doesn't currently accept config in constructor
    // We'll need to modify it or pass config differently
    const analyzer = new AIURLAnalyzer()
    return analyzer
  }

  /**
   * Create Logger instance with optional configuration
   */
  static createLogger(_config?: Partial<LoggerConfig>): Logger {
    // Logger doesn't currently accept config in constructor
    // For now, return a new instance - this will need to be enhanced
    return new Logger()
  }

  /**
   * Create ScoringCalculator instance with optional configuration
   */
  static createScoringCalculator(config?: Partial<ScoringConfig>): ScoringCalculator {
    return new ScoringCalculator(config)
  }

  /**
   * Create AnalysisOrchestrator instance with optional configuration
   */
  static createAnalysisOrchestrator(config?: Partial<OrchestrationConfig>): AnalysisOrchestrator {
    return new AnalysisOrchestrator(config)
  }

  /**
   * Create complete bundle of analysis services with optional configuration and caching
   */
  static createAnalysisServices(config?: ServicesConfig, enableCaching = true): AnalysisServices {
    const services = {
      reputation: this.createReputationService(config?.reputation),
      whois: this.createWhoisService(config?.whois),
      ssl: this.createSSLService(config?.ssl),
      aiAnalyzer: this.createAIURLAnalyzer(config?.ai),
      logger: this.createLogger(config?.logger)
    }

    // Add caching support if enabled and services support it
    if (enableCaching) {
      const environment = process.env.NODE_ENV as ServiceEnvironment || 'development'
      const _caches = this.createServiceCaches(environment)
      
      // Note: Individual services would need to be modified to accept cache managers
      // This is a placeholder for future service cache integration
      // For now, we return the services without cache injection
    }

    return services
  }

  /**
   * Create analysis services with environment-specific defaults
   */
  static createAnalysisServicesForEnvironment(
    environment: ServiceEnvironment,
    overrides?: ServicesConfig
  ): AnalysisServices {
    const envConfig = this.getEnvironmentDefaults(environment)
    const mergedConfig = this.mergeConfigurations(envConfig, overrides)
    return this.createAnalysisServices(mergedConfig)
  }

  /**
   * Get environment-specific default configurations
   */
  private static getEnvironmentDefaults(environment: ServiceEnvironment): ServicesConfig {
    switch (environment) {
      case 'production':
        return {
          reputation: {
            timeout: 5000,
            maxRetries: 3
          },
          whois: {
            defaultTimeout: 10000,
            maxRetries: 2
          },
          ssl: {
            defaultTimeout: 5000,
            maxRetries: 2
          },
          ai: {
            timeout: 30000,
            maxRetries: 2,
            cacheEnabled: true,
            cacheTtl: 24 * 60 * 60 * 1000 // 24 hours
          },
          logger: {
            level: 'info'
          },
          scoring: {
            missingDataStrategy: 'redistribute',
            normalization: {
              method: 'linear'
            }
          },
          orchestration: {
            timeouts: {
              totalAnalysisTimeout: 45000,
              serviceTimeout: 25000,
              scoringTimeout: 3000
            },
            parallelExecution: {
              enabled: true,
              maxConcurrency: 4
            }
          }
        }
      case 'staging':
        return {
          reputation: {
            timeout: 10000,
            maxRetries: 2
          },
          whois: {
            defaultTimeout: 15000,
            maxRetries: 1
          },
          ssl: {
            defaultTimeout: 10000,
            maxRetries: 1
          },
          ai: {
            timeout: 45000,
            maxRetries: 1,
            cacheEnabled: true,
            cacheTtl: 12 * 60 * 60 * 1000 // 12 hours
          },
          logger: {
            level: 'debug'
          }
        }
      case 'development':
      default:
        return {
          reputation: {
            timeout: 15000,
            maxRetries: 1
          },
          whois: {
            defaultTimeout: 20000,
            maxRetries: 1
          },
          ssl: {
            defaultTimeout: 15000,
            maxRetries: 1
          },
          ai: {
            timeout: 60000,
            maxRetries: 1,
            cacheEnabled: true,
            cacheTtl: 6 * 60 * 60 * 1000 // 6 hours
          },
          logger: {
            level: 'debug'
          }
        }
    }
  }

  /**
   * Deep merge configuration objects, with overrides taking precedence
   */
  private static mergeConfigurations(base: ServicesConfig, overrides?: ServicesConfig): ServicesConfig {
    if (!overrides) return base

    return {
      reputation: { ...base.reputation, ...overrides.reputation },
      whois: { ...base.whois, ...overrides.whois },
      ssl: { ...base.ssl, ...overrides.ssl },
      ai: { ...base.ai, ...overrides.ai },
      logger: { ...base.logger, ...overrides.logger }
    }
  }
}