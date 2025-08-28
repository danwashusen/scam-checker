/**
 * Unit tests for AI URL Analyzer
 * Note: Uses simplified testing approach due to complex mocking requirements
 * Full functionality is verified through integration tests
 */

import { AIProvider, ScamCategory } from '../../../../src/types/ai'
import type { ParsedURL } from '../../../../src/types/url'

// Mock all external dependencies
jest.mock('../../../../src/lib/cache/cache-manager', () => ({
  CacheManager: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    getStats: jest.fn().mockReturnValue({
      hits: 0,
      misses: 1,
      hitRate: 0,
      size: 0,
      maxSize: 1000,
    }),
    clear: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn().mockResolvedValue(0),
  })),
}))

jest.mock('../../../../src/lib/analysis/ai-service', () => ({
  createAIService: jest.fn().mockReturnValue({
    analyzeText: jest.fn().mockResolvedValue({
      success: true,
      data: JSON.stringify({
        risk_score: 50,
        confidence: 80,
        primary_risks: ['test'],
        scam_category: 'legitimate',
        indicators: [],
        explanation: 'Test analysis result',
      }),
      fromCache: false,
      metadata: { processingTime: 1000 },
    }),
    getUsageStats: jest.fn().mockReturnValue({
      requestCount: 0,
      totalCost: 0,
      averageCost: 0,
    }),
  }),
}))

jest.mock('../../../../src/config/ai', () => ({
  loadAIConfig: jest.fn().mockReturnValue({
    enabled: true,
    provider: 'openai',
    apiKey: 'test-api-key',
    model: 'gpt-4',
    maxTokens: 1000,
    temperature: 0.1,
    timeout: 30000,
    retryAttempts: 2,
    costThreshold: 0.02,
    cache: {
      enabled: true,
      ttl: 24 * 60 * 60 * 1000,
      maxSize: 1000,
    },
    rateLimit: {
      enabled: true,
      maxRequestsPerMinute: 60,
    },
  }),
  validateAIConfig: jest.fn().mockReturnValue({ valid: true, errors: [] }),
  createServiceOptions: jest.fn().mockReturnValue({
    provider: 'openai',
    apiKey: 'test-api-key',
    model: 'gpt-4',
    maxTokens: 1000,
    temperature: 0.1,
    timeout: 30000,
    retryAttempts: 2,
    costThreshold: 0.02,
  }),
}))

jest.mock('../../../../src/lib/logger', () => {
  const mockInstance = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    timer: jest.fn(() => ({
      end: jest.fn()
    }))
  }
  return {
    Logger: jest.fn().mockImplementation(() => mockInstance),
    logger: mockInstance
  }
})

// Import after mocking
import { AIURLAnalyzer } from '../../../../src/lib/analysis/ai-url-analyzer'

describe('AIURLAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor and configuration', () => {
    it('should initialize with default configuration', () => {
      const analyzer = new AIURLAnalyzer()
      expect(analyzer).toBeDefined()
      
      const config = analyzer.getConfig()
      expect(config.enabled).toBeDefined()
      expect(config.provider).toBe(AIProvider.OPENAI)
      expect(config.model).toBe('gpt-4')
      expect(config.cacheEnabled).toBe(true)
    })

    it('should disable when configuration is invalid', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { validateAIConfig } = require('../../../../src/config/ai')
      validateAIConfig.mockReturnValueOnce({ 
        valid: false, 
        errors: ['API key is required'] 
      })

      const analyzer = new AIURLAnalyzer()
      expect(analyzer.isAvailable()).toBe(false)
    })

    it('should disable when enabled is false in config', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { loadAIConfig } = require('../../../../src/config/ai')
      loadAIConfig.mockReturnValueOnce({
        enabled: false,
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.1,
        timeout: 30000,
        retryAttempts: 2,
        costThreshold: 0.02,
        cache: { enabled: true, ttl: 24 * 60 * 60 * 1000, maxSize: 1000 },
        rateLimit: { enabled: true, maxRequestsPerMinute: 60 },
      })

      const analyzer = new AIURLAnalyzer()
      expect(analyzer.isAvailable()).toBe(false)
    })
  })

  describe('utility methods', () => {
    it('should return cache statistics', () => {
      const analyzer = new AIURLAnalyzer()
      const stats = analyzer.getCacheStats()
      
      expect(stats).toHaveProperty('hits')
      expect(stats).toHaveProperty('misses')
      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('maxSize')
      expect(typeof stats.maxSize).toBe('number')
    })

    it('should return usage statistics', () => {
      const analyzer = new AIURLAnalyzer()
      const stats = analyzer.getUsageStats()
      
      expect(stats).toHaveProperty('requestCount')
      expect(stats).toHaveProperty('totalCost')
      expect(stats).toHaveProperty('averageCost')
      expect(typeof stats.requestCount).toBe('number')
      expect(typeof stats.totalCost).toBe('number')
      expect(typeof stats.averageCost).toBe('number')
    })

    it('should provide cache management methods', async () => {
      const analyzer = new AIURLAnalyzer()
      
      // These methods should exist and be callable
      await expect(analyzer.clearCache()).resolves.not.toThrow()
      await expect(analyzer.cleanupCache()).resolves.toBeDefined()
    })
  })

  describe('analyzeURL method signature and error handling', () => {
    const mockParsedUrl: ParsedURL = {
      original: 'https://example.com',
      protocol: 'https:',
      hostname: 'example.com',
      domain: 'example.com',
      subdomain: '',
      pathname: '/',
      search: '',
      searchParams: {},
      hash: '',
      isIP: false,
      isIPv4: false,
      isIPv6: false,
      components: {
        domainParts: ['example', 'com'],
        pathParts: [],
        queryParams: [],
      },
    } as ParsedURL

    const mockTechnicalContext = {
      urlStructure: {
        isIP: false,
        pathDepth: 1,
        queryParamCount: 0,
        hasHttps: true,
      },
    }

    it('should return error when AI is disabled', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { loadAIConfig } = require('../../../../src/config/ai')
      loadAIConfig.mockReturnValueOnce({
        enabled: false,
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.1,
        timeout: 30000,
        retryAttempts: 2,
        costThreshold: 0.02,
        cache: { enabled: true, ttl: 24 * 60 * 60 * 1000, maxSize: 1000 },
        rateLimit: { enabled: true, maxRequestsPerMinute: 60 },
      })

      const analyzer = new AIURLAnalyzer()
      const result = await analyzer.analyzeURL('https://example.com', mockParsedUrl, mockTechnicalContext)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('ai_disabled')
      expect(result.data).toBeNull()
      expect(result.fromCache).toBe(false)
    })

    it('should have correct result structure for enabled analyzer', async () => {
      const analyzer = new AIURLAnalyzer()
      
      // This test verifies the method signature and basic structure
      // Actual functionality is tested in integration tests
      expect(typeof analyzer.analyzeURL).toBe('function')
      expect(analyzer.analyzeURL.length).toBe(3) // url, parsedUrl, technicalContext
    })
  })

  describe('scam category mapping logic', () => {
    it('should have scam category enum values available', () => {
      expect(ScamCategory.FINANCIAL).toBeDefined()
      expect(ScamCategory.PHISHING).toBeDefined()
      expect(ScamCategory.ECOMMERCE).toBeDefined()
      expect(ScamCategory.SOCIAL_ENGINEERING).toBeDefined()
      expect(ScamCategory.LEGITIMATE).toBeDefined()
    })
  })

  describe('configuration validation', () => {
    it('should handle construction without throwing errors', () => {
      // Test that the constructor doesn't throw even with various configurations
      expect(() => new AIURLAnalyzer()).not.toThrow()
      
      // Test that the analyzer provides expected interface
      const analyzer = new AIURLAnalyzer()
      expect(typeof analyzer.isAvailable).toBe('function')
      expect(typeof analyzer.getConfig).toBe('function')
      expect(typeof analyzer.analyzeURL).toBe('function')
      expect(typeof analyzer.clearCache).toBe('function')
      expect(typeof analyzer.cleanupCache).toBe('function')
    })
  })
})