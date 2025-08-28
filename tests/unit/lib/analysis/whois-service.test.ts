import { WhoisService } from '../../../../src/lib/analysis/whois-service'
import { CacheManager } from '../../../../src/lib/cache/cache-manager'
import type { ParsedURL } from '../../../../src/lib/validation/url-parser'
import type { WhoisCacheEntry } from '../../../../src/types/whois'

// Mock the whois module
jest.mock('whois', () => ({
  lookup: jest.fn()
}))

import * as whoisModule from 'whois'

interface WhoisModule {
  lookup: (domain: string, options: unknown, callback: (err: Error | null, data?: string) => void) => void
}

const mockWhois = whoisModule as unknown as jest.Mocked<WhoisModule>

describe('WhoisService', () => {
  let whoisService: WhoisService
  let mockCacheManager: jest.Mocked<CacheManager<WhoisCacheEntry>>

  const sampleWhoisResponse = `
Domain Name: example.com
Registry Domain ID: 123456789
Registrar: Example Registrar Inc.
Creation Date: 2020-01-15T00:00:00Z
Registry Expiry Date: 2025-01-15T00:00:00Z
Updated Date: 2023-01-15T00:00:00Z
Name Server: ns1.example.com
Name Server: ns2.example.com
Domain Status: clientTransferProhibited
Registrant Organization: Example Organization
Registrant Country: US
  `.trim()

  const sampleParsedURL: ParsedURL = {
    original: 'https://example.com/path',
    protocol: 'https:',
    hostname: 'example.com',
    domain: 'example.com',
    subdomain: '',
    pathname: '/path',
    search: '',
    searchParams: {},
    hash: '',
    isIP: false,
    isIPv4: false,
    isIPv6: false,
    components: {
      domainParts: ['example', 'com'],
      pathParts: ['path'],
      queryParams: []
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Create mock cache manager
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn(),
      cleanup: jest.fn(),
      getOrSet: jest.fn()
    } as unknown as jest.Mocked<CacheManager<WhoisCacheEntry>>

    // Create service with mock cache
    whoisService = new WhoisService({
      cacheEnabled: true,
      cacheTtl: 24 * 60 * 60 * 1000,
      defaultTimeout: 5000,
      maxRetries: 2,
      enablePrivacyDetection: true
    })

    // Replace the cache manager with our mock
    ;(whoisService as unknown as { cache: CacheManager<WhoisCacheEntry> }).cache = mockCacheManager
  })

  describe('analyzeDomain', () => {
    it('should successfully analyze domain with string input', async () => {
      mockWhois.lookup.mockImplementation((domain: string, options: unknown, callback: (err: Error | null, data?: string) => void) => {
        callback(null, sampleWhoisResponse)
      })
      mockCacheManager.get.mockResolvedValue(null)

      const result = await whoisService.analyzeDomain('example.com')

      expect(result.success).toBe(true)
      expect(result.domain).toBe('example.com')
      expect(result.data).toBeDefined()
      expect(result.data?.registrar).toBe('Example Registrar Inc.')
      expect(result.data?.ageInDays).toBeGreaterThan(0)
      expect(result.fromCache).toBe(false)
      expect(mockCacheManager.set).toHaveBeenCalled()
    })

    it('should successfully analyze domain with ParsedURL input', async () => {
      mockWhois.lookup.mockImplementation((domain: string, options: unknown, callback: (err: Error | null, data?: string) => void) => {
        callback(null, sampleWhoisResponse)
      })
      mockCacheManager.get.mockResolvedValue(null)

      const result = await whoisService.analyzeDomain(sampleParsedURL)

      expect(result.success).toBe(true)
      expect(result.domain).toBe('example.com')
      expect(result.data).toBeDefined()
      expect(result.fromCache).toBe(false)
    })

    it('should return cached result when available', async () => {
      const cachedEntry: WhoisCacheEntry = {
        domain: 'example.com',
        whoisData: { raw: sampleWhoisResponse },
        analysis: {
          ageInDays: 1200,
          registrationDate: new Date('2020-01-15'),
          expirationDate: new Date('2025-01-15'),
          updatedDate: new Date('2023-01-15'),
          registrar: 'Example Registrar Inc.',
          nameservers: ['ns1.example.com', 'ns2.example.com'],
          status: ['clientTransferProhibited'],
          score: 0.2,
          confidence: 0.9,
          privacyProtected: false,
          registrantCountry: 'US',
          riskFactors: []
        },
        timestamp: new Date().toISOString(),
        ttl: 24 * 60 * 60 * 1000
      }

      mockCacheManager.get.mockResolvedValue(cachedEntry)

      const result = await whoisService.analyzeDomain('example.com')

      expect(result.success).toBe(true)
      expect(result.fromCache).toBe(true)
      expect(result.data).toEqual(cachedEntry.analysis)
      expect(mockWhois.lookup).not.toHaveBeenCalled()
    })

    it('should handle WHOIS lookup timeout', async () => {
      mockWhois.lookup.mockImplementation((domain: string, options: unknown, callback: (err: Error | null, data?: string) => void) => {
        const error = new Error('Timeout') as Error & { code: string }
        error.code = 'ETIMEDOUT'
        callback(error)
      })
      mockCacheManager.get.mockResolvedValue(null)

      const result = await whoisService.analyzeDomain('example.com')

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('timeout')
      expect(result.error?.retryable).toBe(true)
    })

    it('should handle domain not found', async () => {
      mockWhois.lookup.mockImplementation((domain: string, options: unknown, callback: (err: Error | null, data?: string) => void) => {
        const error = new Error('Domain not found') as Error & { code: string }
        error.code = 'ENOTFOUND'
        callback(error)
      })
      mockCacheManager.get.mockResolvedValue(null)

      const result = await whoisService.analyzeDomain('nonexistent.com')

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('not_found')
      expect(result.error?.retryable).toBe(false)
    })

    it('should handle network connection errors', async () => {
      mockWhois.lookup.mockImplementation((domain: string, options: unknown, callback: (err: Error | null, data?: string) => void) => {
        const error = new Error('Connection refused') as Error & { code: string }
        error.code = 'ECONNREFUSED'
        callback(error)
      })
      mockCacheManager.get.mockResolvedValue(null)

      const result = await whoisService.analyzeDomain('example.com')

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('network')
      expect(result.error?.retryable).toBe(true)
    })

    it('should handle rate limiting', async () => {
      mockWhois.lookup.mockImplementation((domain: string, options: unknown, callback: (err: Error | null, data?: string) => void) => {
        const error = new Error('Rate limit exceeded')
        callback(error)
      })
      mockCacheManager.get.mockResolvedValue(null)

      const result = await whoisService.analyzeDomain('example.com')

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('rate_limit')
      expect(result.error?.retryable).toBe(true)
    })

    it('should retry on retryable errors', async () => {
      let attempt = 0
      mockWhois.lookup.mockImplementation((domain: string, options: unknown, callback: (err: Error | null, data?: string) => void) => {
        attempt++
        if (attempt < 2) {
          const error = new Error('Timeout') as Error & { code: string }
          error.code = 'ETIMEDOUT'
          callback(error)
        } else {
          callback(null, sampleWhoisResponse)
        }
      })
      mockCacheManager.get.mockResolvedValue(null)

      const result = await whoisService.analyzeDomain('example.com')

      expect(result.success).toBe(true)
      expect(mockWhois.lookup).toHaveBeenCalledTimes(2)
    })

    it('should fail after max retries', async () => {
      mockWhois.lookup.mockImplementation((domain: string, options: unknown, callback: (err: Error | null, data?: string) => void) => {
        const error = new Error('Timeout') as Error & { code: string }
        error.code = 'ETIMEDOUT'
        callback(error)
      })
      mockCacheManager.get.mockResolvedValue(null)

      const result = await whoisService.analyzeDomain('example.com')

      expect(result.success).toBe(false)
      expect(mockWhois.lookup).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should handle invalid domain input', async () => {
      const result = await whoisService.analyzeDomain('')

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('invalid_domain')
      expect(result.error?.retryable).toBe(false)
    })

    it('should extract domain from URL string', async () => {
      mockWhois.lookup.mockImplementation((domain: string, options: unknown, callback: (err: Error | null, data?: string) => void) => {
        expect(domain).toBe('example.com')
        callback(null, sampleWhoisResponse)
      })
      mockCacheManager.get.mockResolvedValue(null)

      const result = await whoisService.analyzeDomain('https://example.com/path?param=value')

      expect(result.success).toBe(true)
      expect(result.domain).toBe('example.com')
    })

    it('should handle URL with port number', async () => {
      mockWhois.lookup.mockImplementation((domain: string, options: unknown, callback: (err: Error | null, data?: string) => void) => {
        expect(domain).toBe('example.com')
        callback(null, sampleWhoisResponse)
      })
      mockCacheManager.get.mockResolvedValue(null)

      const result = await whoisService.analyzeDomain('https://example.com:8080/path')

      expect(result.success).toBe(true)
      expect(result.domain).toBe('example.com')
    })

    it('should work with cache disabled', async () => {
      const noCacheService = new WhoisService({ cacheEnabled: false })
      mockWhois.lookup.mockImplementation((domain: string, options: unknown, callback: (err: Error | null, data?: string) => void) => {
        callback(null, sampleWhoisResponse)
      })

      const result = await noCacheService.analyzeDomain('example.com')

      expect(result.success).toBe(true)
      expect(result.fromCache).toBe(false)
    })

    it('should handle custom lookup options', async () => {
      mockWhois.lookup.mockImplementation((domain: string, options: unknown, callback: (err: Error | null, data?: string) => void) => {
        const opts = options as { timeout: number; follow: number; server: string }
        expect(opts.timeout).toBe(10000)
        expect(opts.follow).toBe(3)
        expect(opts.server).toBe('custom.whois.server')
        callback(null, sampleWhoisResponse)
      })
      mockCacheManager.get.mockResolvedValue(null)

      const result = await whoisService.analyzeDomain('example.com', {
        timeout: 10000,
        follow: 3,
        server: 'custom.whois.server',
        retries: 1
      })

      expect(result.success).toBe(true)
    })
  })

  describe('cache operations', () => {
    it('should get cache statistics', () => {
      const mockStats = {
        hits: 10,
        misses: 5,
        hitRate: 0.67,
        size: 15,
        maxSize: 1000
      }
      mockCacheManager.getStats.mockReturnValue(mockStats)

      const stats = whoisService.getCacheStats()
      expect(stats).toEqual(mockStats)
    })

    it('should clear cache', async () => {
      await whoisService.clearCache()
      expect(mockCacheManager.clear).toHaveBeenCalled()
    })

    it('should check if domain is cached', async () => {
      mockCacheManager.has.mockResolvedValue(true)

      const isCached = await whoisService.isCached('example.com')
      expect(isCached).toBe(true)
      expect(mockCacheManager.has).toHaveBeenCalledWith('example.com')
    })

    it('should handle cache errors gracefully during lookup', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'))
      mockCacheManager.set.mockRejectedValue(new Error('Cache error'))
      mockWhois.lookup.mockImplementation((domain: string, options: unknown, callback: (err: Error | null, data?: string) => void) => {
        callback(null, sampleWhoisResponse)
      })

      const result = await whoisService.analyzeDomain('example.com')

      expect(result.success).toBe(true)
      expect(result.fromCache).toBe(false)
      // Should not throw despite cache errors
    })
  })

  describe('domain extraction', () => {
    const testCases = [
      { input: 'example.com', expected: 'example.com' },
      { input: 'https://example.com', expected: 'example.com' },
      { input: 'http://example.com/path', expected: 'example.com' },
      { input: 'https://example.com:8080/path?param=value', expected: 'example.com' },
      { input: 'subdomain.example.com', expected: 'example.com' }, // Extract root domain for WHOIS
      { input: 'invalid-domain', expected: null },
      { input: '192.168.1.1', expected: null }, // IP addresses should return null
      { input: '', expected: null },
    ]

    testCases.forEach(({ input, expected }) => {
      it(`should extract domain "${expected}" from input "${input}"`, async () => {
        const extractDomain = (whoisService as unknown as { extractDomain: (input: string) => string | null }).extractDomain.bind(whoisService)
        const result = extractDomain(input)
        expect(result).toBe(expected)
      })
    })
  })

  describe('error categorization', () => {
    const errorTestCases = [
      {
        error: { code: 'ENOTFOUND' },
        expectedType: 'not_found',
        expectedRetryable: false
      },
      {
        error: { code: 'ETIMEDOUT' },
        expectedType: 'timeout',
        expectedRetryable: true
      },
      {
        error: { code: 'ECONNREFUSED' },
        expectedType: 'network',
        expectedRetryable: true
      },
      {
        error: { message: 'rate limit exceeded' },
        expectedType: 'rate_limit',
        expectedRetryable: true
      },
      {
        error: { message: 'unknown error' },
        expectedType: 'unknown',
        expectedRetryable: false
      }
    ]

    errorTestCases.forEach(({ error, expectedType, expectedRetryable }) => {
      it(`should categorize error with code/message as ${expectedType}`, () => {
        const categorizeError = (whoisService as unknown as { categorizeError: (domain: string, error: unknown) => { type: string; retryable: boolean; domain: string; timestamp: string } }).categorizeError.bind(whoisService)
        const result = categorizeError('test.com', error)
        
        expect(result.type).toBe(expectedType)
        expect(result.retryable).toBe(expectedRetryable)
        expect(result.domain).toBe('test.com')
        expect(result.timestamp).toBeDefined()
      })
    })
  })
})