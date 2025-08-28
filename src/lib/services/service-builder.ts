import { ServiceFactory } from './service-factory'
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
 * Service Builder with fluent API for configuring and creating analysis services
 * Implements the Builder pattern for complex service configuration
 */
export class ServiceBuilder {
  private config: ServicesConfig = {}

  /**
   * Configure reputation service settings
   */
  withReputationConfig(config: Partial<SafeBrowsingConfig>): ServiceBuilder {
    this.config.reputation = { ...this.config.reputation, ...config }
    return this
  }

  /**
   * Configure WHOIS service settings
   */
  withWhoisConfig(config: Partial<WhoisServiceConfig>): ServiceBuilder {
    this.config.whois = { ...this.config.whois, ...config }
    return this
  }

  /**
   * Configure SSL service settings
   */
  withSSLConfig(config: Partial<SSLServiceConfig>): ServiceBuilder {
    this.config.ssl = { ...this.config.ssl, ...config }
    return this
  }

  /**
   * Configure AI analyzer settings
   */
  withAIConfig(config: Partial<AIAnalyzerConfig>): ServiceBuilder {
    this.config.ai = { ...this.config.ai, ...config }
    return this
  }

  /**
   * Configure logger settings
   */
  withLoggerConfig(config: Partial<LoggerConfig>): ServiceBuilder {
    this.config.logger = { ...this.config.logger, ...config }
    return this
  }

  /**
   * Apply environment-specific default configurations
   */
  withEnvironment(environment: ServiceEnvironment): ServiceBuilder {
    const envDefaults = this.getEnvironmentDefaults(environment)
    this.config = this.mergeConfigurations(envDefaults, this.config)
    return this
  }

  /**
   * Apply default configuration values
   */
  withDefaults(): ServiceBuilder {
    const defaults = this.getDefaultConfig()
    this.config = this.mergeConfigurations(defaults, this.config)
    return this
  }

  /**
   * Apply custom configuration object
   */
  withConfig(config: Partial<ServicesConfig>): ServiceBuilder {
    this.config = this.mergeConfigurations(this.config, config)
    return this
  }

  /**
   * Override specific service configurations
   */
  withOverrides(overrides: Partial<ServicesConfig>): ServiceBuilder {
    this.config = this.mergeConfigurations(this.config, overrides)
    return this
  }

  /**
   * Build and return the configured analysis services
   */
  build(): AnalysisServices {
    return ServiceFactory.createAnalysisServices(this.config)
  }

  /**
   * Build services for a specific environment with optional overrides
   */
  buildForEnvironment(environment: ServiceEnvironment, overrides?: ServicesConfig): AnalysisServices {
    return ServiceFactory.createAnalysisServicesForEnvironment(environment, overrides)
  }

  /**
   * Reset builder configuration to empty state
   */
  reset(): ServiceBuilder {
    this.config = {}
    return this
  }

  /**
   * Get current configuration (useful for debugging)
   */
  getConfig(): ServicesConfig {
    return { ...this.config }
  }

  /**
   * Get environment-specific defaults
   */
  private getEnvironmentDefaults(environment: ServiceEnvironment): ServicesConfig {
    switch (environment) {
      case 'production':
        return {
          reputation: {
            timeout: 5000,
            maxRetries: 3
          },
          whois: {
            defaultTimeout: 10000,
            maxRetries: 2,
            cacheEnabled: true,
            cacheTtl: 24 * 60 * 60 * 1000 // 24 hours
          },
          ssl: {
            defaultTimeout: 5000,
            maxRetries: 2,
            cacheEnabled: true,
            cacheTtl: 6 * 60 * 60 * 1000 // 6 hours
          },
          ai: {
            timeout: 30000,
            maxRetries: 2,
            cacheEnabled: true,
            cacheTtl: 24 * 60 * 60 * 1000, // 24 hours
            enabled: true
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
            maxRetries: 1,
            cacheEnabled: true,
            cacheTtl: 12 * 60 * 60 * 1000 // 12 hours
          },
          ssl: {
            defaultTimeout: 10000,
            maxRetries: 1,
            cacheEnabled: true,
            cacheTtl: 3 * 60 * 60 * 1000 // 3 hours
          },
          ai: {
            timeout: 45000,
            maxRetries: 1,
            cacheEnabled: true,
            cacheTtl: 12 * 60 * 60 * 1000, // 12 hours
            enabled: true
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
            maxRetries: 1,
            cacheEnabled: true,
            cacheTtl: 6 * 60 * 60 * 1000 // 6 hours
          },
          ssl: {
            defaultTimeout: 15000,
            maxRetries: 1,
            cacheEnabled: true,
            cacheTtl: 1 * 60 * 60 * 1000 // 1 hour
          },
          ai: {
            timeout: 60000,
            maxRetries: 1,
            cacheEnabled: true,
            cacheTtl: 6 * 60 * 60 * 1000, // 6 hours
            enabled: true
          },
          logger: {
            level: 'debug'
          }
        }
    }
  }

  /**
   * Get default configuration (equivalent to development)
   */
  private getDefaultConfig(): ServicesConfig {
    return this.getEnvironmentDefaults('development')
  }

  /**
   * Deep merge configuration objects, with overrides taking precedence
   */
  private mergeConfigurations(base: ServicesConfig, overrides?: ServicesConfig): ServicesConfig {
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