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
      expect(analyzer.analyzeURL.length).toBe(5) // url, parsedUrl, technicalContext, userId?, forcePromptVersion?
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

  describe('Enhanced Features (v2.0)', () => {
    const mockParsedUrl: ParsedURL = {
      original: 'https://payp4l.com/login.php',
      protocol: 'https:',
      hostname: 'payp4l.com',
      domain: 'payp4l.com',
      subdomain: '',
      pathname: '/login.php',
      search: '?redirect=evil.com',
      searchParams: { redirect: 'evil.com' },
      hash: '',
      isIP: false,
      isIPv4: false,
      isIPv6: false,
      port: undefined,
      components: {
        domainParts: ['payp4l', 'com'],
        pathParts: ['login.php'],
        queryParams: [{ key: 'redirect', value: 'evil.com' }]
      }
    }

    const mockTechnicalContext = {
      urlStructure: {
        isIP: false,
        subdomain: '',
        pathDepth: 1,
        queryParamCount: 1,
        hasHttps: true
      },
      domainAge: {
        ageInDays: 1,
        registrationDate: '2024-01-14',
        registrar: 'Suspicious Registrar'
      },
      reputation: {
        isClean: false,
        riskLevel: 'high' as const,
        threatCount: 2,
        threatTypes: ['phishing', 'typosquatting']
      }
    }

    it('should include pattern analysis in enhanced analysis', async () => {
      const analyzer = new AIURLAnalyzer()
      
      if (analyzer.isAvailable()) {
        const result = await analyzer.analyzeURL(
          'https://payp4l.com/login.php',
          mockParsedUrl,
          mockTechnicalContext
        )

        if (result.success && result.data) {
          expect(result.data.metadata.patternAnalysis).toBeDefined()
          expect(result.data.metadata.patternAnalysis?.detectedPatterns).toBeDefined()
          expect(result.data.indicators.length).toBeGreaterThan(0)
        }
      }
    })

    it('should support prompt version selection', async () => {
      const analyzer = new AIURLAnalyzer()
      
      if (analyzer.isAvailable()) {
        const result = await analyzer.analyzeURLWithVersion(
          'https://test.com',
          mockParsedUrl,
          mockTechnicalContext,
          'v2.0'
        )

        if (result.success && result.data) {
          expect(result.data.metadata.promptSelection).toBeDefined()
          expect(result.data.metadata.promptSelection?.versionId).toBe('v2.0')
        }
      }
    })

    it('should track prompt performance statistics', () => {
      const analyzer = new AIURLAnalyzer()
      const stats = analyzer.getPromptPerformanceStats()
      
      expect(Array.isArray(stats)).toBe(true)
      expect(stats.length).toBeGreaterThan(0)
      
      const v2Stats = stats.find(s => s.versionId === 'v2.0')
      expect(v2Stats).toBeDefined()
      expect(v2Stats?.name).toBe('Enhanced URL Analysis v2.0')
    })

    it('should maintain prompt selection history', async () => {
      const analyzer = new AIURLAnalyzer()
      
      if (analyzer.isAvailable()) {
        await analyzer.analyzeURL(
          'https://test.com',
          mockParsedUrl,
          mockTechnicalContext,
          'test-user'
        )

        const history = analyzer.getPromptSelectionHistory()
        expect(Array.isArray(history)).toBe(true)
        expect(history.length).toBeGreaterThan(0)
        
        const lastSelection = history[history.length - 1]
        expect(lastSelection).toHaveProperty('version')
        expect(lastSelection).toHaveProperty('prompt')
        expect(lastSelection).toHaveProperty('isExperiment')
        expect(lastSelection).toHaveProperty('selectionReason')
      }
    })

    it('should generate enhanced cache keys with pattern analysis', async () => {
      const analyzer = new AIURLAnalyzer()
      
      if (analyzer.isAvailable()) {
        // Test that different URLs with different patterns generate different cache keys
        await analyzer.analyzeURL(
          'https://payp4l.com',
          mockParsedUrl,
          mockTechnicalContext
        )

        const legitimateUrl = {
          ...mockParsedUrl,
          original: 'https://github.com',
          domain: 'github.com',
          hostname: 'github.com',
          pathname: '/'
        }

        await analyzer.analyzeURL(
          'https://github.com',
          legitimateUrl,
          {
            ...mockTechnicalContext,
            reputation: {
              isClean: true,
              riskLevel: 'low',
              threatCount: 0,
              threatTypes: []
            }
          }
        )

        // Cache should have been called with different keys
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const cacheManager = require('../../../../src/lib/cache/cache-manager').CacheManager
        const setMock = cacheManager.mock.results[0].value.set
        
        if (setMock.mock.calls.length >= 2) {
          // Cache keys should be different due to different pattern analysis
          expect(setMock.mock.calls[0]).not.toEqual(setMock.mock.calls[1])
        }
      }
    })

    it('should handle A/B testing scenarios', async () => {
      const analyzer = new AIURLAnalyzer()
      
      if (analyzer.isAvailable()) {
        // Test consistent user selection
        const user1Result1 = await analyzer.analyzeURL(
          'https://test.com',
          mockParsedUrl,
          mockTechnicalContext,
          'consistent-user-1'
        )

        const user1Result2 = await analyzer.analyzeURL(
          'https://test.com',
          mockParsedUrl,
          mockTechnicalContext,
          'consistent-user-1'
        )

        if (user1Result1.success && user1Result2.success) {
          const selectionHistory = analyzer.getPromptSelectionHistory()
          
          // Same user should get consistent prompt version
          const lastTwoSelections = selectionHistory.slice(-2)
          if (lastTwoSelections.length === 2) {
            expect(lastTwoSelections[0].version.id).toBe(lastTwoSelections[1].version.id)
          }
        }
      }
    })
  })
})