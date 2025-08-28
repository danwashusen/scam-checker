import { ServiceBuilder } from '../../../src/lib/services/service-builder'
import { ServiceFactory } from '../../../src/lib/services/service-factory'
import type { AnalysisServices } from '../../../src/types/services'

describe('Service Integration Tests', () => {
  let services: AnalysisServices

  beforeEach(() => {
    // Create services for testing
    services = new ServiceBuilder()
      .withEnvironment('development')
      .withReputationConfig({ timeout: 5000 })
      .withWhoisConfig({ maxRetries: 1 })
      .build()
  })

  describe('service dependencies', () => {
    it('should create all required services', () => {
      expect(services.reputation).toBeDefined()
      expect(services.whois).toBeDefined()
      expect(services.ssl).toBeDefined()
      expect(services.aiAnalyzer).toBeDefined()
      expect(services.logger).toBeDefined()
    })

    it('should have independent service instances', () => {
      const services2 = new ServiceBuilder()
        .withEnvironment('development')
        .build()

      expect(services.reputation).not.toBe(services2.reputation)
      expect(services.whois).not.toBe(services2.whois)
      expect(services.ssl).not.toBe(services2.ssl)
      expect(services.aiAnalyzer).not.toBe(services2.aiAnalyzer)
      expect(services.logger).not.toBe(services2.logger)
    })
  })

  describe('service configuration consistency', () => {
    it('should apply configuration correctly across services', () => {
      const customServices = new ServiceBuilder()
        .withEnvironment('production')
        .withReputationConfig({ timeout: 3000 })
        .withWhoisConfig({ defaultTimeout: 8000 })
        .withSSLConfig({ enableOCSPCheck: true })
        .build()

      expect(customServices.reputation.config.timeout).toBe(3000)
      expect(customServices.reputation.config.maxRetries).toBe(3) // From environment
      
      expect(customServices.whois.config.defaultTimeout).toBe(8000)
      expect(customServices.whois.config.maxRetries).toBe(2) // From environment
      
      expect(customServices.ssl.config.enableOCSPCheck).toBe(true)
      expect(customServices.ssl.config.maxRetries).toBe(2) // From environment
    })

    it('should maintain service isolation after configuration', () => {
      const services1 = new ServiceBuilder()
        .withReputationConfig({ timeout: 1000 })
        .build()

      const services2 = new ServiceBuilder()
        .withReputationConfig({ timeout: 5000 })
        .build()

      // Services should have different configurations
      expect(services1.reputation.config.timeout).toBe(1000)
      expect(services2.reputation.config.timeout).toBe(5000)

      // But should be independent instances
      expect(services1.reputation).not.toBe(services2.reputation)
    })
  })

  describe('service factory vs builder consistency', () => {
    it('should create equivalent services using factory and builder', () => {
      const config = {
        reputation: { timeout: 2000, maxRetries: 1 },
        whois: { defaultTimeout: 6000, maxRetries: 2 },
        ssl: { defaultTimeout: 4000, enableOCSPCheck: true }
      }

      const factoryServices = ServiceFactory.createAnalysisServices(config)
      const builderServices = new ServiceBuilder()
        .withConfig(config)
        .build()

      // Should create same service types
      expect(factoryServices.reputation.constructor).toBe(builderServices.reputation.constructor)
      expect(factoryServices.whois.constructor).toBe(builderServices.whois.constructor)
      expect(factoryServices.ssl.constructor).toBe(builderServices.ssl.constructor)

      // Should have same configuration
      expect(factoryServices.reputation.config.timeout).toBe(builderServices.reputation.config.timeout)
      expect(factoryServices.whois.config.defaultTimeout).toBe(builderServices.whois.config.defaultTimeout)
      expect(factoryServices.ssl.config.enableOCSPCheck).toBe(builderServices.ssl.config.enableOCSPCheck)
    })
  })

  describe('environment-specific service behavior', () => {
    it('should create production-optimized services', () => {
      const prodServices = ServiceFactory.createAnalysisServicesForEnvironment('production')

      // Production should have more aggressive timeouts and retries
      expect(prodServices.reputation.config.timeout).toBe(5000)
      expect(prodServices.reputation.config.maxRetries).toBe(3)
      
      expect(prodServices.whois.config.defaultTimeout).toBe(10000)
      expect(prodServices.whois.config.maxRetries).toBe(2)
      
      expect(prodServices.ssl.config.defaultTimeout).toBe(5000)
      expect(prodServices.ssl.config.maxRetries).toBe(2)
    })

    it('should create development-friendly services', () => {
      const devServices = ServiceFactory.createAnalysisServicesForEnvironment('development')

      // Development should have more relaxed timeouts for debugging
      expect(devServices.reputation.config.timeout).toBe(15000)
      expect(devServices.reputation.config.maxRetries).toBe(1)
      
      expect(devServices.whois.config.defaultTimeout).toBe(20000)
      expect(devServices.whois.config.maxRetries).toBe(1)
      
      expect(devServices.ssl.config.defaultTimeout).toBe(15000)
      expect(devServices.ssl.config.maxRetries).toBe(1)
    })
  })

  describe('service method availability', () => {
    it('should have all required methods on reputation service', () => {
      expect(typeof services.reputation.analyzeURL).toBe('function')
      expect(typeof services.reputation.checkMultipleURLs).toBe('function')
      expect(typeof services.reputation.clearCache).toBe('function')
      expect(typeof services.reputation.getStats).toBe('function')
    })

    it('should have all required methods on whois service', () => {
      expect(typeof services.whois.analyzeDomain).toBe('function')
      expect(typeof services.whois.getCacheStats).toBe('function')
      expect(typeof services.whois.clearCache).toBe('function')
      expect(typeof services.whois.isCached).toBe('function')
    })

    it('should have all required methods on SSL service', () => {
      expect(typeof services.ssl.analyzeCertificate).toBe('function')
      expect(typeof services.ssl.getCacheStats).toBe('function')
      expect(typeof services.ssl.clearCache).toBe('function')
      expect(typeof services.ssl.isCached).toBe('function')
    })

    it('should have all required methods on AI analyzer', () => {
      expect(typeof services.aiAnalyzer.analyzeURL).toBe('function')
      expect(typeof services.aiAnalyzer.isAvailable).toBe('function')
      expect(typeof services.aiAnalyzer.getConfig).toBe('function')
      expect(typeof services.aiAnalyzer.getCacheStats).toBe('function')
    })

    it('should have all required methods on logger', () => {
      expect(typeof services.logger.debug).toBe('function')
      expect(typeof services.logger.info).toBe('function')
      expect(typeof services.logger.warn).toBe('function')
      expect(typeof services.logger.error).toBe('function')
      expect(typeof services.logger.timer).toBe('function')
    })
  })

  describe('configuration inheritance and overrides', () => {
    it('should properly inherit environment configs and apply overrides', () => {
      const overrides = {
        reputation: { timeout: 999 },
        whois: { maxRetries: 5 }
      }

      const services = ServiceFactory.createAnalysisServicesForEnvironment('production', overrides)

      // Should use overrides
      expect(services.reputation.config.timeout).toBe(999)
      expect(services.whois.config.maxRetries).toBe(5)

      // Should keep environment defaults for non-overridden values
      expect(services.reputation.config.maxRetries).toBe(3)
      expect(services.whois.config.defaultTimeout).toBe(10000)
    })

    it('should handle complex builder configuration chains', () => {
      const services = new ServiceBuilder()
        .withEnvironment('staging')
        .withReputationConfig({ apiKey: 'test-key' })
        .withOverrides({
          reputation: { timeout: 1500 },
          ssl: { enableOCSPCheck: true }
        })
        .build()

      // Should combine environment, custom config, and overrides
      expect(services.reputation.config.timeout).toBe(1500) // from override
      expect(services.reputation.config.maxRetries).toBe(2) // from staging environment
      expect(services.reputation.config.apiKey).toBe('test-key') // from custom config
      expect(services.ssl.config.enableOCSPCheck).toBe(true) // from override
    })
  })

  describe('service state isolation', () => {
    it('should maintain separate cache states between service instances', async () => {
      const services1 = new ServiceBuilder().build()
      const services2 = new ServiceBuilder().build()

      // Each service should have its own cache instance
      expect(services1.reputation.getStats()).not.toBe(services2.reputation.getStats())
      
      // Cache operations on one should not affect the other
      await services1.reputation.clearCache()
      
      // Services should still be independent
      expect(services1.reputation).not.toBe(services2.reputation)
    })
  })
})