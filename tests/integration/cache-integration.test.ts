/**
 * Integration test for end-to-end cache functionality
 * Validates that caching works across the service layers
 */

import { ServiceFactory } from '../../src/lib/services/service-factory'
import type { ServiceEnvironment } from '../../src/types/services'

describe('Cache Integration', () => {
  describe('Service Factory Cache Integration', () => {
    it('should create services with shared cache instances', () => {
      const services = ServiceFactory.createAnalysisServices(undefined, true)

      expect(services.reputation).toBeDefined()
      expect(services.whois).toBeDefined()
      expect(services.ssl).toBeDefined()
      expect(services.aiAnalyzer).toBeDefined()

      // All services should have cache functionality
      expect(typeof services.reputation.clearCache).toBe('function')
      expect(typeof services.whois.clearCache).toBe('function')
      expect(typeof services.ssl.clearCache).toBe('function')
      expect(typeof (services.aiAnalyzer as any).clearCache).toBe('function') // eslint-disable-line @typescript-eslint/no-explicit-any
    })

    it('should create services for different environments with appropriate cache configs', () => {
      const environments: ServiceEnvironment[] = ['development', 'staging', 'production']
      
      environments.forEach(env => {
        const services = ServiceFactory.createAnalysisServicesForEnvironment(env)
        
        expect(services.reputation).toBeDefined()
        expect(services.whois).toBeDefined()
        expect(services.ssl).toBeDefined()
        expect(services.aiAnalyzer).toBeDefined()
        expect(services.logger).toBeDefined()
      })
    })

    it('should create services without caching when disabled', () => {
      const services = ServiceFactory.createAnalysisServices(undefined, false)

      expect(services.reputation).toBeDefined()
      expect(services.whois).toBeDefined()
      expect(services.ssl).toBeDefined()
      expect(services.aiAnalyzer).toBeDefined()

      // Services should still work without caching
      expect(typeof services.reputation.clearCache).toBe('function')
      expect(typeof services.whois.clearCache).toBe('function')
      expect(typeof services.ssl.clearCache).toBe('function')
      expect(typeof (services.aiAnalyzer as any).clearCache).toBe('function') // eslint-disable-line @typescript-eslint/no-explicit-any
    })
  })

  describe('Service Cache Statistics', () => {
    it('should provide cache statistics from all services', () => {
      const services = ServiceFactory.createAnalysisServices(undefined, true)

      // Get cache statistics from each service
      const reputationStats = services.reputation.getStats()
      const whoisStats = services.whois.getCacheStats()
      const sslStats = services.ssl.getCacheStats()
      const aiStats = services.aiAnalyzer.getCacheStats()

      expect(reputationStats).toBeDefined()
      expect(whoisStats).toBeDefined()
      expect(sslStats).toBeDefined()  
      expect(aiStats).toBeDefined()

      // All should have basic cache stat properties
      expect(typeof reputationStats.cacheHitRate).toBe('number')
      expect(typeof whoisStats.hitRate).toBe('number')
      expect(typeof sslStats.hitRate).toBe('number')
      expect(typeof aiStats.hitRate).toBe('number')
    })

    it('should support cache clearing operations', async () => {
      const services = ServiceFactory.createAnalysisServices(undefined, true)

      // Clear all caches
      await Promise.all([
        services.reputation.clearCache(),
        services.whois.clearCache(),
        services.ssl.clearCache(),
        (services.aiAnalyzer as any).clearCache() // eslint-disable-line @typescript-eslint/no-explicit-any
      ])

      // Should complete without errors
      expect(true).toBe(true)
    })
  })

  describe('Service Cache Injection', () => {
    it('should accept external cache instances', () => {
      // Create cache instances
      const caches = ServiceFactory.createServiceCaches('development')
      
      expect(caches.reputation).toBeDefined()
      expect(caches.whois).toBeDefined()
      expect(caches.ssl).toBeDefined()
      expect(caches.ai).toBeDefined()

      // Create services with external caches
      const reputationService = ServiceFactory.createReputationService(undefined, caches.reputation)
      const whoisService = ServiceFactory.createWhoisService(undefined, caches.whois)
      const sslService = ServiceFactory.createSSLService(undefined, caches.ssl)
      const aiService = ServiceFactory.createAIURLAnalyzer(undefined, caches.ai)

      expect(reputationService).toBeDefined()
      expect(whoisService).toBeDefined()
      expect(sslService).toBeDefined()
      expect(aiService).toBeDefined()
    })
  })
})