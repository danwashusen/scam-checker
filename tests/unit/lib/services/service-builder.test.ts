import { ServiceBuilder } from '../../../../src/lib/services/service-builder'
import { ReputationService } from '../../../../src/lib/analysis/reputation-service'
import { WhoisService } from '../../../../src/lib/analysis/whois-service'
import { SSLService } from '../../../../src/lib/analysis/ssl-service'
import { AIURLAnalyzer } from '../../../../src/lib/analysis/ai-url-analyzer'
import { Logger } from '../../../../src/lib/logger'
import type { ServicesConfig } from '../../../../src/types/services'

describe('ServiceBuilder', () => {
  let builder: ServiceBuilder

  beforeEach(() => {
    builder = new ServiceBuilder()
  })

  describe('fluent API configuration', () => {
    it('should allow chaining configuration methods', () => {
      const result = builder
        .withReputationConfig({ timeout: 5000 })
        .withWhoisConfig({ maxRetries: 2 })
        .withSSLConfig({ enableOCSPCheck: true })
        .withAIConfig({ enabled: true })
        .withLoggerConfig({ level: 'debug' })

      expect(result).toBe(builder) // Should return the same instance for chaining
    })

    it('should accumulate configuration from chained calls', () => {
      builder
        .withReputationConfig({ timeout: 5000, apiKey: 'test-key' })
        .withWhoisConfig({ maxRetries: 2, defaultTimeout: 8000 })

      const config = builder.getConfig()
      
      expect(config.reputation?.timeout).toBe(5000)
      expect(config.reputation?.apiKey).toBe('test-key')
      expect(config.whois?.maxRetries).toBe(2)
      expect(config.whois?.defaultTimeout).toBe(8000)
    })

    it('should merge configurations when called multiple times', () => {
      builder
        .withReputationConfig({ timeout: 5000 })
        .withReputationConfig({ apiKey: 'test-key' })

      const config = builder.getConfig()
      
      expect(config.reputation?.timeout).toBe(5000)
      expect(config.reputation?.apiKey).toBe('test-key')
    })
  })

  describe('environment configuration', () => {
    it('should apply production environment defaults', () => {
      const services = builder
        .withEnvironment('production')
        .build()
      
      expect(services.reputation).toBeInstanceOf(ReputationService)
      expect(services.reputation.config.timeout).toBe(5000)
      expect(services.reputation.config.maxRetries).toBe(3)
      
      expect(services.whois.config.defaultTimeout).toBe(10000)
      expect(services.whois.config.maxRetries).toBe(2)
    })

    it('should apply staging environment defaults', () => {
      const services = builder
        .withEnvironment('staging')
        .build()
      
      expect(services.reputation.config.timeout).toBe(10000)
      expect(services.reputation.config.maxRetries).toBe(2)
      
      expect(services.whois.config.defaultTimeout).toBe(15000)
      expect(services.whois.config.maxRetries).toBe(1)
    })

    it('should apply development environment defaults', () => {
      const services = builder
        .withEnvironment('development')
        .build()
      
      expect(services.reputation.config.timeout).toBe(15000)
      expect(services.reputation.config.maxRetries).toBe(1)
      
      expect(services.whois.config.defaultTimeout).toBe(20000)
      expect(services.whois.config.maxRetries).toBe(1)
    })

    it('should allow overrides after environment configuration', () => {
      const services = builder
        .withEnvironment('production')
        .withReputationConfig({ timeout: 999 })
        .build()
      
      // Override should take precedence
      expect(services.reputation.config.timeout).toBe(999)
      // Environment defaults should remain for other settings
      expect(services.reputation.config.maxRetries).toBe(3)
    })
  })

  describe('default configuration', () => {
    it('should apply default configuration', () => {
      const services = builder
        .withDefaults()
        .build()
      
      expect(services.reputation).toBeInstanceOf(ReputationService)
      expect(services.whois).toBeInstanceOf(WhoisService)
      expect(services.ssl).toBeInstanceOf(SSLService)
      expect(services.aiAnalyzer).toBeInstanceOf(AIURLAnalyzer)
      expect(services.logger).toBeInstanceOf(Logger)
    })

    it('should allow overrides after defaults', () => {
      const services = builder
        .withDefaults()
        .withReputationConfig({ timeout: 999 })
        .build()
      
      expect(services.reputation.config.timeout).toBe(999)
    })
  })

  describe('custom configuration', () => {
    it('should accept custom configuration object', () => {
      const customConfig: ServicesConfig = {
        reputation: {
          timeout: 1500,
          apiKey: 'custom-key'
        },
        whois: {
          defaultTimeout: 7000,
          maxRetries: 3
        }
      }

      const services = builder
        .withConfig(customConfig)
        .build()
      
      expect(services.reputation.config.timeout).toBe(1500)
      expect(services.reputation.config.apiKey).toBe('custom-key')
      expect(services.whois.config.defaultTimeout).toBe(7000)
      expect(services.whois.config.maxRetries).toBe(3)
    })

    it('should merge custom config with existing config', () => {
      const services = builder
        .withReputationConfig({ timeout: 1000 })
        .withConfig({ reputation: { apiKey: 'test-key' } })
        .build()
      
      expect(services.reputation.config.timeout).toBe(1000)
      expect(services.reputation.config.apiKey).toBe('test-key')
    })
  })

  describe('overrides', () => {
    it('should apply overrides to existing configuration', () => {
      const overrides: ServicesConfig = {
        reputation: { timeout: 999 }
      }

      const services = builder
        .withEnvironment('production')
        .withOverrides(overrides)
        .build()
      
      expect(services.reputation.config.timeout).toBe(999)
      expect(services.reputation.config.maxRetries).toBe(3) // Should keep environment default
    })
  })

  describe('buildForEnvironment', () => {
    it('should build services for specific environment', () => {
      const services = builder.buildForEnvironment('production')
      
      expect(services.reputation.config.timeout).toBe(5000)
      expect(services.reputation.config.maxRetries).toBe(3)
    })

    it('should apply overrides when building for environment', () => {
      const overrides: ServicesConfig = {
        reputation: { timeout: 888 }
      }

      const services = builder.buildForEnvironment('production', overrides)
      
      expect(services.reputation.config.timeout).toBe(888)
      expect(services.reputation.config.maxRetries).toBe(3)
    })
  })

  describe('builder state management', () => {
    it('should reset configuration to empty state', () => {
      builder
        .withReputationConfig({ timeout: 5000 })
        .withWhoisConfig({ maxRetries: 2 })
        .reset()

      const config = builder.getConfig()
      
      expect(Object.keys(config)).toHaveLength(0)
    })

    it('should return current configuration', () => {
      builder
        .withReputationConfig({ timeout: 5000 })
        .withWhoisConfig({ maxRetries: 2 })

      const config = builder.getConfig()
      
      expect(config.reputation?.timeout).toBe(5000)
      expect(config.whois?.maxRetries).toBe(2)
    })

    it('should return a copy of configuration (not reference)', () => {
      builder.withReputationConfig({ timeout: 5000 })

      const config1 = builder.getConfig()
      const config2 = builder.getConfig()
      
      expect(config1).not.toBe(config2) // Should be different objects
      expect(config1).toEqual(config2) // But with same content
    })
  })

  describe('service instance isolation', () => {
    it('should create independent service instances from same builder', () => {
      builder.withReputationConfig({ timeout: 5000 })

      const services1 = builder.build()
      const services2 = builder.build()
      
      expect(services1.reputation).not.toBe(services2.reputation)
      expect(services1.reputation.config.timeout).toBe(services2.reputation.config.timeout)
    })

    it('should create independent service instances from different builders', () => {
      const builder1 = new ServiceBuilder()
      const builder2 = new ServiceBuilder()

      builder1.withReputationConfig({ timeout: 1000 })
      builder2.withReputationConfig({ timeout: 2000 })

      const services1 = builder1.build()
      const services2 = builder2.build()
      
      expect(services1.reputation).not.toBe(services2.reputation)
      expect(services1.reputation.config.timeout).toBe(1000)
      expect(services2.reputation.config.timeout).toBe(2000)
    })
  })

  describe('complex configuration scenarios', () => {
    it('should handle complex chaining with environment and overrides', () => {
      const services = builder
        .withEnvironment('production')
        .withReputationConfig({ apiKey: 'custom-key' })
        .withDefaults() // Should not override environment settings
        .withSSLConfig({ enableOCSPCheck: true })
        .withOverrides({ 
          reputation: { timeout: 999 },
          ai: { enabled: false }
        })
        .build()
      
      // Should use override value
      expect(services.reputation.config.timeout).toBe(999)
      // Should use custom config
      expect(services.reputation.config.apiKey).toBe('custom-key')
      // Should use environment default for non-overridden values
      expect(services.reputation.config.maxRetries).toBe(3)
      // Should use SSL config
      expect(services.ssl.config.enableOCSPCheck).toBe(true)
    })
  })
})