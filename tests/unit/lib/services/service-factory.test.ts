import { ServiceFactory } from '../../../../src/lib/services/service-factory'
import { ReputationService } from '../../../../src/lib/analysis/reputation-service'
import { WhoisService } from '../../../../src/lib/analysis/whois-service'
import { SSLService } from '../../../../src/lib/analysis/ssl-service'
import { AIURLAnalyzer } from '../../../../src/lib/analysis/ai-url-analyzer'
import { Logger } from '../../../../src/lib/logger'
import type { ServicesConfig } from '../../../../src/types/services'

describe('ServiceFactory', () => {
  describe('createReputationService', () => {
    it('should create ReputationService with default config', () => {
      const service = ServiceFactory.createReputationService()
      expect(service).toBeInstanceOf(ReputationService)
    })

    it('should create ReputationService with custom config', () => {
      const config = { 
        apiKey: 'test-key', 
        timeout: 1000,
        clientId: 'test-client'
      }
      const service = ServiceFactory.createReputationService(config)
      expect(service).toBeInstanceOf(ReputationService)
      expect(service.config.apiKey).toBe('test-key')
      expect(service.config.timeout).toBe(1000)
      expect(service.config.clientId).toBe('test-client')
    })
  })

  describe('createWhoisService', () => {
    it('should create WhoisService with default config', () => {
      const service = ServiceFactory.createWhoisService()
      expect(service).toBeInstanceOf(WhoisService)
    })

    it('should create WhoisService with custom config', () => {
      const config = { 
        defaultTimeout: 5000, 
        maxRetries: 3,
        cacheEnabled: false
      }
      const service = ServiceFactory.createWhoisService(config)
      expect(service).toBeInstanceOf(WhoisService)
      expect(service.config.defaultTimeout).toBe(5000)
      expect(service.config.maxRetries).toBe(3)
      expect(service.config.cacheEnabled).toBe(false)
    })
  })

  describe('createSSLService', () => {
    it('should create SSLService with default config', () => {
      const service = ServiceFactory.createSSLService()
      expect(service).toBeInstanceOf(SSLService)
    })

    it('should create SSLService with custom config', () => {
      const config = { 
        defaultTimeout: 3000, 
        maxRetries: 1,
        enableOCSPCheck: true
      }
      const service = ServiceFactory.createSSLService(config)
      expect(service).toBeInstanceOf(SSLService)
      expect(service.config.defaultTimeout).toBe(3000)
      expect(service.config.maxRetries).toBe(1)
      expect(service.config.enableOCSPCheck).toBe(true)
    })
  })

  describe('createAIURLAnalyzer', () => {
    it('should create AIURLAnalyzer instance', () => {
      const service = ServiceFactory.createAIURLAnalyzer()
      expect(service).toBeInstanceOf(AIURLAnalyzer)
    })

    it('should create AIURLAnalyzer with config (future enhancement)', () => {
      const config = { 
        enabled: true,
        timeout: 30000
      }
      // Note: AIURLAnalyzer doesn't currently accept constructor config
      // This test documents the intended future behavior
      const service = ServiceFactory.createAIURLAnalyzer(config)
      expect(service).toBeInstanceOf(AIURLAnalyzer)
    })
  })

  describe('createLogger', () => {
    it('should create Logger instance', () => {
      const service = ServiceFactory.createLogger()
      expect(service).toBeInstanceOf(Logger)
    })

    it('should create Logger with config (future enhancement)', () => {
      const config = { 
        level: 'debug' as const
      }
      // Note: Logger doesn't currently accept constructor config
      // This test documents the intended future behavior
      const service = ServiceFactory.createLogger(config)
      expect(service).toBeInstanceOf(Logger)
    })
  })

  describe('createAnalysisServices', () => {
    it('should create complete analysis services bundle', () => {
      const services = ServiceFactory.createAnalysisServices()
      
      expect(services.reputation).toBeInstanceOf(ReputationService)
      expect(services.whois).toBeInstanceOf(WhoisService)
      expect(services.ssl).toBeInstanceOf(SSLService)
      expect(services.aiAnalyzer).toBeInstanceOf(AIURLAnalyzer)
      expect(services.logger).toBeInstanceOf(Logger)
    })

    it('should create services with custom configuration', () => {
      const config: ServicesConfig = {
        reputation: {
          timeout: 2000,
          apiKey: 'custom-key'
        },
        whois: {
          defaultTimeout: 8000,
          maxRetries: 1
        },
        ssl: {
          defaultTimeout: 4000,
          enableOCSPCheck: true
        }
      }

      const services = ServiceFactory.createAnalysisServices(config)
      
      expect(services.reputation).toBeInstanceOf(ReputationService)
      expect(services.reputation.config.timeout).toBe(2000)
      expect(services.reputation.config.apiKey).toBe('custom-key')
      
      expect(services.whois).toBeInstanceOf(WhoisService)
      expect(services.whois.config.defaultTimeout).toBe(8000)
      expect(services.whois.config.maxRetries).toBe(1)
      
      expect(services.ssl).toBeInstanceOf(SSLService)
      expect(services.ssl.config.defaultTimeout).toBe(4000)
      expect(services.ssl.config.enableOCSPCheck).toBe(true)
    })
  })

  describe('createAnalysisServicesForEnvironment', () => {
    it('should create services with production environment defaults', () => {
      const services = ServiceFactory.createAnalysisServicesForEnvironment('production')
      
      expect(services.reputation).toBeInstanceOf(ReputationService)
      expect(services.reputation.config.timeout).toBe(5000)
      expect(services.reputation.config.maxRetries).toBe(3)
      
      expect(services.whois).toBeInstanceOf(WhoisService)
      expect(services.whois.config.defaultTimeout).toBe(10000)
      expect(services.whois.config.maxRetries).toBe(2)
    })

    it('should create services with staging environment defaults', () => {
      const services = ServiceFactory.createAnalysisServicesForEnvironment('staging')
      
      expect(services.reputation.config.timeout).toBe(10000)
      expect(services.reputation.config.maxRetries).toBe(2)
      
      expect(services.whois.config.defaultTimeout).toBe(15000)
      expect(services.whois.config.maxRetries).toBe(1)
    })

    it('should create services with development environment defaults', () => {
      const services = ServiceFactory.createAnalysisServicesForEnvironment('development')
      
      expect(services.reputation.config.timeout).toBe(15000)
      expect(services.reputation.config.maxRetries).toBe(1)
      
      expect(services.whois.config.defaultTimeout).toBe(20000)
      expect(services.whois.config.maxRetries).toBe(1)
    })

    it('should apply overrides to environment defaults', () => {
      const overrides: ServicesConfig = {
        reputation: {
          timeout: 999,
          apiKey: 'override-key'
        }
      }

      const services = ServiceFactory.createAnalysisServicesForEnvironment('production', overrides)
      
      // Should use override values
      expect(services.reputation.config.timeout).toBe(999)
      expect(services.reputation.config.apiKey).toBe('override-key')
      
      // Should keep environment defaults for non-overridden values
      expect(services.reputation.config.maxRetries).toBe(3)
    })
  })

  describe('service isolation', () => {
    it('should create independent service instances', () => {
      const services1 = ServiceFactory.createAnalysisServices()
      const services2 = ServiceFactory.createAnalysisServices()
      
      // Each call should create new instances
      expect(services1.reputation).not.toBe(services2.reputation)
      expect(services1.whois).not.toBe(services2.whois)
      expect(services1.ssl).not.toBe(services2.ssl)
      expect(services1.aiAnalyzer).not.toBe(services2.aiAnalyzer)
      expect(services1.logger).not.toBe(services2.logger)
    })

    it('should allow different configurations per instance', () => {
      const config1: ServicesConfig = {
        reputation: { timeout: 1000 }
      }
      const config2: ServicesConfig = {
        reputation: { timeout: 5000 }
      }

      const services1 = ServiceFactory.createAnalysisServices(config1)
      const services2 = ServiceFactory.createAnalysisServices(config2)
      
      expect(services1.reputation.config.timeout).toBe(1000)
      expect(services2.reputation.config.timeout).toBe(5000)
    })
  })
})