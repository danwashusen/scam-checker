import { ReputationService } from '../analysis/reputation-service'
import { WhoisService } from '../analysis/whois-service'
import { SSLService } from '../analysis/ssl-service'
import { AIURLAnalyzer } from '../analysis/ai-url-analyzer'
import { Logger } from '../logger'
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

/**
 * Service Factory for creating service instances with dependency injection
 * Replaces singleton pattern with factory pattern for improved testability and configuration management
 */
export class ServiceFactory {
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
   * Create complete bundle of analysis services with optional configuration
   */
  static createAnalysisServices(config?: ServicesConfig): AnalysisServices {
    return {
      reputation: this.createReputationService(config?.reputation),
      whois: this.createWhoisService(config?.whois),
      ssl: this.createSSLService(config?.ssl),
      aiAnalyzer: this.createAIURLAnalyzer(config?.ai),
      logger: this.createLogger(config?.logger)
    }
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