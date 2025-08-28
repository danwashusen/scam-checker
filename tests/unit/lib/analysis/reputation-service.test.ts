import { ReputationService } from '../../../../src/lib/analysis/reputation-service'
import { CacheManager } from '../../../../src/lib/cache/cache-manager'
import type {
  SafeBrowsingResponse,
  ReputationAnalysis
} from '../../../../src/types/reputation'
import {
  ThreatType,
  PlatformType,
  ThreatEntryType
} from '../../../../src/types/reputation'

// Mock dependencies
jest.mock('../../../../src/lib/cache/cache-manager')
jest.mock('../../../../src/lib/logger', () => {
  const mockInstance = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
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

// Mock fetch globally
global.fetch = jest.fn()

describe('ReputationService', () => {
  let reputationService: ReputationService
  let mockCache: jest.Mocked<CacheManager<ReputationAnalysis>>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock CacheManager
    mockCache = {
      getOrSet: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(),
      clear: jest.fn(),
      cleanup: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
        maxSize: 1000
      })
    } as unknown as jest.Mocked<CacheManager<ReputationAnalysis>>

    // Mock constructor to return our mock cache
    ;(CacheManager as jest.Mock).mockImplementation(() => mockCache)

    // Set environment variable for API key
    process.env.GOOGLE_SAFE_BROWSING_API_KEY = 'test-api-key'

    reputationService = new ReputationService()
  })

  afterEach(() => {
    delete process.env.GOOGLE_SAFE_BROWSING_API_KEY
  })

  describe('analyzeURL', () => {
    const testUrl = 'https://example.com'

    it('should return error when API key is not configured', async () => {
      delete process.env.GOOGLE_SAFE_BROWSING_API_KEY
      const service = new ReputationService()

      const result = await service.analyzeURL(testUrl)

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('auth_error')
      expect(result.error?.message).toContain('API key not configured')
    })

    it('should return clean result for URL with no threats', async () => {
      const mockResponse: SafeBrowsingResponse = {}
      
      const expectedAnalysis: ReputationAnalysis = {
        url: testUrl,
        isClean: true,
        threatMatches: [],
        riskFactors: [{
          type: 'reputation-clean',
          score: 0,
          description: 'URL is clean according to Google Safe Browsing'
        }],
        score: 0,
        riskLevel: 'low',
        confidence: 0.95,
        timestamp: expect.any(Date)
      }

      mockCache.getOrSet.mockResolvedValue(expectedAnalysis)
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await reputationService.analyzeURL(testUrl)

      expect(result.success).toBe(true)
      expect(result.data?.isClean).toBe(true)
      expect(result.data?.riskLevel).toBe('low')
      expect(result.data?.score).toBe(0)
      expect(mockCache.getOrSet).toHaveBeenCalled()
    })

    it('should return high risk for malware threat', async () => {
      const mockResponse: SafeBrowsingResponse = {
        matches: [{
          threatType: ThreatType.MALWARE,
          platformType: PlatformType.ANY_PLATFORM,
          threatEntryType: ThreatEntryType.URL,
          threat: { url: testUrl },
          cacheDuration: '300s'
        }]
      }

      const expectedAnalysis: ReputationAnalysis = {
        url: testUrl,
        isClean: false,
        threatMatches: mockResponse.matches!,
        riskFactors: [{
          type: 'reputation-malware',
          score: 100,
          description: 'Google Safe Browsing detected malware threat for all platforms',
          threatType: ThreatType.MALWARE,
          platformType: PlatformType.ANY_PLATFORM
        }],
        score: 100,
        riskLevel: 'high',
        confidence: 0.98,
        timestamp: expect.any(Date)
      }

      mockCache.getOrSet.mockResolvedValue(expectedAnalysis)
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await reputationService.analyzeURL(testUrl)

      expect(result.success).toBe(true)
      expect(result.data?.isClean).toBe(false)
      expect(result.data?.riskLevel).toBe('high')
      expect(result.data?.score).toBe(100)
      expect(result.data?.threatMatches).toHaveLength(1)
      expect(result.data?.threatMatches[0].threatType).toBe(ThreatType.MALWARE)
    })

    it('should return medium risk for potentially harmful application', async () => {
      const mockResponse: SafeBrowsingResponse = {
        matches: [{
          threatType: ThreatType.POTENTIALLY_HARMFUL_APPLICATION,
          platformType: PlatformType.ANDROID,
          threatEntryType: ThreatEntryType.URL,
          threat: { url: testUrl },
          cacheDuration: '300s'
        }]
      }

      const expectedAnalysis: ReputationAnalysis = {
        url: testUrl,
        isClean: false,
        threatMatches: mockResponse.matches!,
        riskFactors: [{
          type: 'reputation-potentially_harmful_application',
          score: 48, // 60 * 0.8 (Android multiplier)
          description: 'Google Safe Browsing detected potentially harmful application for android',
          threatType: ThreatType.POTENTIALLY_HARMFUL_APPLICATION,
          platformType: PlatformType.ANDROID
        }],
        score: 48,
        riskLevel: 'medium',
        confidence: 0.98,
        timestamp: expect.any(Date)
      }

      mockCache.getOrSet.mockResolvedValue(expectedAnalysis)

      const result = await reputationService.analyzeURL(testUrl)

      expect(result.success).toBe(true)
      expect(result.data?.riskLevel).toBe('medium')
      expect(result.data?.score).toBe(48)
    })

    it('should handle API errors gracefully', async () => {
      mockCache.getOrSet.mockRejectedValue(new Error('Network error'))

      const result = await reputationService.analyzeURL(testUrl)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Network error')
    })

    it('should handle API rate limiting', async () => {
      mockCache.getOrSet.mockRejectedValue(new Error('Rate limit exceeded: Too Many Requests'))

      const result = await reputationService.analyzeURL(testUrl)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Rate limit exceeded')
    })

    it('should handle authentication errors', async () => {
      mockCache.getOrSet.mockRejectedValue(new Error('Authentication failed: Forbidden'))

      const result = await reputationService.analyzeURL(testUrl)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Authentication failed')
    })

    it('should use cache for repeated requests', async () => {
      const mockAnalysis: ReputationAnalysis = {
        url: testUrl,
        isClean: true,
        threatMatches: [],
        riskFactors: [],
        score: 0,
        riskLevel: 'low',
        confidence: 0.95,
        timestamp: new Date(Date.now() - 5000) // 5 seconds ago = from cache
      }

      mockCache.getOrSet.mockResolvedValue(mockAnalysis)

      const result = await reputationService.analyzeURL(testUrl)

      expect(result.success).toBe(true)
      expect(result.fromCache).toBe(true)
      expect(mockCache.getOrSet).toHaveBeenCalledWith(
        expect.stringContaining(testUrl),
        expect.any(Function)
      )
    })
  })

  describe('checkMultipleURLs', () => {
    it('should analyze multiple URLs in parallel', async () => {
      const urls = ['https://example.com', 'https://test.com']
      
      const mockAnalysis: ReputationAnalysis = {
        url: '',
        isClean: true,
        threatMatches: [],
        riskFactors: [],
        score: 0,
        riskLevel: 'low',
        confidence: 0.95,
        timestamp: new Date()
      }

      mockCache.getOrSet.mockResolvedValue(mockAnalysis)

      const results = await reputationService.checkMultipleURLs(urls)

      expect(results).toHaveLength(2)
      expect(results.every(r => r.success)).toBe(true)
    })

    it('should handle partial failures in batch processing', async () => {
      const urls = ['https://example.com', 'invalid-url']
      
      mockCache.getOrSet
        .mockResolvedValueOnce({
          url: urls[0],
          isClean: true,
          threatMatches: [],
          riskFactors: [],
          score: 0,
          riskLevel: 'low',
          confidence: 0.95,
          timestamp: new Date()
        } as ReputationAnalysis)
        .mockRejectedValueOnce(new Error('Invalid URL'))

      const results = await reputationService.checkMultipleURLs(urls)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
    })
  })

  describe('cache management', () => {
    it('should clear cache', async () => {
      await reputationService.clearCache()
      expect(mockCache.clear).toHaveBeenCalled()
    })

    it('should return statistics', () => {
      const stats = reputationService.getStats()
      
      expect(stats).toHaveProperty('cacheHitRate')
      expect(stats).toHaveProperty('totalRequests')
      expect(stats).toHaveProperty('apiCalls')
    })
  })

  describe('URL normalization', () => {
    it('should normalize URLs for consistent caching', async () => {
      const url1 = 'https://example.com/path?param=1'
      const url2 = 'https://example.com/path?param=1#fragment'
      
      const mockAnalysis: ReputationAnalysis = {
        url: url1,
        isClean: true,
        threatMatches: [],
        riskFactors: [],
        score: 0,
        riskLevel: 'low',
        confidence: 0.95,
        timestamp: new Date()
      }

      mockCache.getOrSet.mockResolvedValue(mockAnalysis)

      await reputationService.analyzeURL(url1)
      await reputationService.analyzeURL(url2)

      // Both URLs should use the same cache key (without fragment)
      expect(mockCache.getOrSet).toHaveBeenCalledTimes(2)
      const [call1] = mockCache.getOrSet.mock.calls[0]
      const [call2] = mockCache.getOrSet.mock.calls[1]
      expect(call1).toBe(call2) // Same cache key
    })
  })

  describe('threat type descriptions', () => {
    it('should generate appropriate threat descriptions', async () => {
      const mockResponse: SafeBrowsingResponse = {
        matches: [
          {
            threatType: ThreatType.SOCIAL_ENGINEERING,
            platformType: PlatformType.CHROME,
            threatEntryType: ThreatEntryType.URL,
            threat: { url: 'https://phishing.com' },
            cacheDuration: '300s'
          },
          {
            threatType: ThreatType.UNWANTED_SOFTWARE,
            platformType: PlatformType.WINDOWS,
            threatEntryType: ThreatEntryType.URL,
            threat: { url: 'https://unwanted.com' },
            cacheDuration: '300s'
          }
        ]
      }

      const expectedAnalysis: ReputationAnalysis = {
        url: 'https://test.com',
        isClean: false,
        threatMatches: mockResponse.matches!,
        riskFactors: [
          expect.objectContaining({
            description: 'Google Safe Browsing detected phishing/social engineering threat for chrome'
          }),
          expect.objectContaining({
            description: 'Google Safe Browsing detected unwanted software for windows'
          })
        ],
        score: expect.any(Number),
        riskLevel: 'high',
        confidence: 0.98,
        timestamp: expect.any(Date)
      }

      mockCache.getOrSet.mockResolvedValue(expectedAnalysis)

      const result = await reputationService.analyzeURL('https://test.com')

      expect(result.data?.riskFactors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            description: expect.stringContaining('phishing/social engineering')
          }),
          expect.objectContaining({
            description: expect.stringContaining('unwanted software')
          })
        ])
      )
    })
  })
})