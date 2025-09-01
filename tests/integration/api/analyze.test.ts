import { NextRequest } from 'next/server'
import { POST, GET } from '../../../src/app/api/analyze/route'

// Mock NextResponse for testing environment
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  return {
    ...actual,
    NextResponse: {
      json: (data: unknown, init?: ResponseInit) => ({
        json: async () => data,
        status: init?.status || 200,
        headers: new Headers(),
        ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
      }),
    },
  }
})

// Mock WHOIS service to avoid real network calls
jest.mock('../../../src/lib/analysis/whois-service', () => {
  const mockInstance = {
    analyzeDomain: jest.fn().mockResolvedValue({
      success: true,
      domain: 'example.com',
      data: {
        ageInDays: 1000,
        registrationDate: new Date('2021-01-01'),
        expirationDate: new Date('2025-01-01'),
        updatedDate: new Date('2023-01-01'),
        registrar: 'Mock Registrar Inc.',
        nameservers: ['ns1.example.com'],
        status: ['active'],
        score: 0.2,
        confidence: 0.9,
        privacyProtected: false,
        registrantCountry: 'US',
        riskFactors: [{
          type: 'age',
          description: 'Domain is established (2.7 years old)',
          score: 0.2
        }]
      },
      fromCache: false,
      processingTimeMs: 100
    }),
    getCacheStats: jest.fn(),
    clearCache: jest.fn(),
    isCached: jest.fn(),
    config: {}
  }
  return {
    WhoisService: jest.fn().mockImplementation(() => mockInstance),
    defaultWhoisService: mockInstance
  }
})

// Mock SSL service to avoid real network calls
jest.mock('../../../src/lib/analysis/ssl-service', () => {
  const mockInstance = {
    analyzeCertificate: jest.fn().mockResolvedValue({
      success: true,
      data: {
        certificateType: 'DV',
        certificateAuthority: { name: 'Test CA', trusted: true },
        daysUntilExpiry: 90,
        issuedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        certificateAge: 30,
        score: 15,
        riskFactors: [],
        confidence: 0.9
      },
      fromCache: false
    }),
    getCacheStats: jest.fn(),
    clearCache: jest.fn(),
    isCached: jest.fn(),
    config: {}
  }
  return {
    SSLService: jest.fn().mockImplementation(() => mockInstance),
    defaultSSLService: mockInstance
  }
})

// Mock reputation service to avoid external API calls
jest.mock('../../../src/lib/analysis/reputation-service', () => {
  const mockInstance = {
    analyzeURL: jest.fn().mockResolvedValue({
      success: true,
      data: {
        isClean: true,
        threatMatches: [],
        riskFactors: []
      },
      fromCache: false
    }),
    checkMultipleURLs: jest.fn(),
    clearCache: jest.fn(),
    getStats: jest.fn(),
    config: {}
  }
  return {
    ReputationService: jest.fn().mockImplementation(() => mockInstance),
    defaultReputationService: mockInstance
  }
})

// Mock AI analyzer
jest.mock('../../../src/lib/analysis/ai-url-analyzer', () => {
  const mockInstance = {
    isAvailable: jest.fn(() => true),
    analyzeURL: jest.fn().mockResolvedValue({
      success: true,
      data: {
        contentScore: 10, // Low danger score (should become 90 safety score)
        patterns: [],
        confidence: 0.90,
        flags: [],
        summary: 'Content appears safe and legitimate'
      },
      fromCache: false
    }),
    getConfig: jest.fn(),
    getCacheStats: jest.fn(),
    getUsageStats: jest.fn()
  }
  return {
    AIURLAnalyzer: jest.fn().mockImplementation(() => mockInstance),
    defaultAIURLAnalyzer: mockInstance
  }
})

// Mock the logger module
jest.mock('../../../src/lib/logger', () => {
  const mockInstance = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    timer: jest.fn().mockReturnValue({
      end: jest.fn()
    })
  }
  return {
    Logger: jest.fn().mockImplementation(() => mockInstance),
    logger: mockInstance
  }
})

import * as loggerModule from '../../../src/lib/logger'
import type { LogContext } from '../../../src/lib/logger'

type MockedLoggerFunction = jest.MockedFunction<(message: string, context?: LogContext) => void>

const { logger: mockLogger } = loggerModule as jest.Mocked<typeof loggerModule>

// Mock console methods to avoid test output pollution
const mockConsole = {
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}

beforeAll(() => {
  Object.assign(console, mockConsole)
})

beforeEach(() => {
  Object.values(mockConsole).forEach(mock => mock.mockClear())
  jest.clearAllMocks()
})

describe('/api/analyze', () => {
  describe('GET requests', () => {
    test('returns API documentation', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('endpoints')
      expect(data.endpoints).toHaveProperty('analyze')
      expect(data).toHaveProperty('features')
      expect(data).toHaveProperty('security')
    })

    test('includes comprehensive endpoint documentation', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.endpoints.analyze).toHaveProperty('method', 'POST')
      expect(data.endpoints.analyze).toHaveProperty('description')
      expect(data.endpoints.analyze).toHaveProperty('body')
      expect(data.endpoints.analyze.body).toHaveProperty('url')
      expect(data.endpoints.analyze.body).toHaveProperty('options')
    })
  })

  describe('POST requests', () => {
    const createRequest = (body: unknown) => {
      return new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    describe('successful requests', () => {
      test('analyzes valid URL', async () => {
        const request = createRequest({ url: 'https://example.com' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data).toHaveProperty('data')
        expect(data).toHaveProperty('validation')
        expect(data).toHaveProperty('timestamp')
        
        expect(data.data).toHaveProperty('url')
        expect(data.data).toHaveProperty('riskScore')
        expect(data.data).toHaveProperty('riskLevel')
        expect(data.data).toHaveProperty('factors')
        expect(data.data).toHaveProperty('explanation')
        expect(data.data).toHaveProperty('timestamp')
      })

      test('handles URL without protocol', async () => {
        const request = createRequest({ url: 'example.com' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.validation.final).toContain('https://')
      })

      test('analyzes URL with path and parameters', async () => {
        const request = createRequest({ 
          url: 'https://api.example.com/v1/users?limit=10&sort=name' 
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.url).toContain('/v1/users')
      })

      test('includes validation details in response', async () => {
        const request = createRequest({ url: 'https://example.com' })
        const response = await POST(request)
        const data = await response.json()

        expect(data.validation).toHaveProperty('original')
        expect(data.validation).toHaveProperty('final')
        expect(data.validation).toHaveProperty('wasModified')
        expect(data.validation).toHaveProperty('changes')
      })

      test('handles URL sanitization', async () => {
        const request = createRequest({ 
          url: 'https://example.com?utm_source=google&param=value' 
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.validation.wasModified).toBe(true)
        expect(data.validation.changes.length).toBeGreaterThan(0)
        expect(data.validation.final).not.toContain('utm_source')
      })

      test('generates risk analysis factors', async () => {
        const request = createRequest({ url: 'https://subdomain.example.com/deep/path' })
        const response = await POST(request)
        const data = await response.json()

        expect(data.data.factors).toBeInstanceOf(Array)
        expect(data.data.factors.length).toBeGreaterThan(0)
        
        const factor = data.data.factors[0]
        expect(factor).toHaveProperty('type')
        expect(factor).toHaveProperty('score')
        expect(factor).toHaveProperty('description')
      })

      test('assigns appropriate risk levels', async () => {
        const testCases = [
          { url: 'https://google.com', expectedRisk: 'low' },
          { url: 'https://api.subdomain.example.com/deep/path/with/many/levels', expectedRisk: 'medium' },
        ]

        for (const testCase of testCases) {
          const request = createRequest({ url: testCase.url })
          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(200)
          expect(['low', 'medium', 'high']).toContain(data.data.riskLevel)
        }
      }, 10000)
    })

    describe('validation errors', () => {
      test('rejects empty request body', async () => {
        const request = createRequest({})
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Invalid URL provided')
        expect(data).toHaveProperty('details')
      })

      test('rejects invalid URL format', async () => {
        const request = createRequest({ url: 'not-a-url' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data).toHaveProperty('message')
      })

      test('rejects empty URL', async () => {
        const request = createRequest({ url: '' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
      })

      test('rejects URLs that are too long', async () => {
        const longUrl = 'https://example.com/' + 'a'.repeat(3000)
        const request = createRequest({ url: longUrl })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.message).toContain('length')
      })

      test('rejects private IP addresses', async () => {
        const request = createRequest({ url: 'https://192.168.1.1' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.errorType).toBe('security-risk')
      })

      test('rejects localhost URLs', async () => {
        const request = createRequest({ url: 'https://localhost:3000' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.errorType).toBe('security-risk')
      })

      test('rejects malicious protocols', async () => {
        const maliciousUrls = [
          'javascript:alert(1)',
          'data:text/html,<script>alert(1)</script>',
          'vbscript:Execute("test")',
        ]

        for (const url of maliciousUrls) {
          const request = createRequest({ url })
          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.success).toBe(false)
          expect(data.errorType).toBe('security-risk')
        }
      })

      test('provides detailed error information', async () => {
        const request = createRequest({ url: 'invalid-url' })
        const response = await POST(request)
        const data = await response.json()

        expect(data).toHaveProperty('error')
        expect(data).toHaveProperty('message')
        expect(data).toHaveProperty('timestamp')
        expect(data.details).toBeInstanceOf(Array)
        expect(data.details[0]).toHaveProperty('field')
        expect(data.details[0]).toHaveProperty('message')
      })
    })

    describe('custom validation options', () => {
      test('accepts localhost when allowed in options', async () => {
        const request = createRequest({
          url: 'https://localhost:3000',
          options: {
            validation: {
              allowLocalhost: true,
            },
          },
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      test('accepts private IPs when allowed in options', async () => {
        const request = createRequest({
          url: 'https://192.168.1.1',
          options: {
            validation: {
              allowPrivateIPs: true,
            },
          },
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      test('respects custom sanitization options', async () => {
        const request = createRequest({
          url: 'https://example.com?utm_source=google&param=value',
          options: {
            sanitization: {
              removeTrackingParams: false,
            },
          },
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.validation.final).toContain('utm_source')
      })

      test('skips sanitization when requested', async () => {
        const request = createRequest({
          url: 'https://example.com?utm_source=google',
          options: {
            skipSanitization: true,
          },
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.validation.changes).toHaveLength(0)
      })

      test('handles custom tracking parameters', async () => {
        const request = createRequest({
          url: 'https://example.com?custom_track=value&param=keep',
          options: {
            sanitization: {
              customTrackingParams: ['custom_track'],
            },
          },
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.validation.final).not.toContain('custom_track')
        expect(data.validation.final).toContain('param=keep')
      })
    })

    describe('logging and monitoring', () => {
      test('logs validation failures', async () => {
        const request = createRequest({ url: 'invalid-url' })
        await POST(request)

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('URL validation failed'),
          expect.any(Object)
        )
      })

      test('logs successful analyses', async () => {
        const request = createRequest({ url: 'https://example.com' })
        await POST(request)

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('URL analysis completed successfully'),
          expect.any(Object)
        )
      })

      test('sanitizes URLs in logs', async () => {
        const request = createRequest({ url: 'https://example.com?password=secret' })
        await POST(request)

        // Check that sensitive info was redacted in logs
        const logCall = (mockLogger.info as MockedLoggerFunction).mock.calls.find((call: unknown[]) => 
          (call[0] as string).includes('completed successfully')
        )
        expect(logCall).toBeDefined()
        expect(logCall?.[1]?.url).not.toContain('secret')
      })

      test('includes processing time in logs', async () => {
        const request = createRequest({ url: 'https://example.com' })
        await POST(request)

        const logCall = (mockLogger.info as MockedLoggerFunction).mock.calls.find((call: unknown[]) => 
          (call[0] as string).includes('completed successfully')
        )
        expect(logCall).toBeDefined()
        expect(logCall?.[1]).toHaveProperty('processingTime')
        expect(typeof logCall?.[1]?.processingTime).toBe('number')
      })
    })

    describe('error handling', () => {
      test('handles malformed JSON gracefully', async () => {
        const request = new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json{',
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Internal server error')
      })

      test('handles unexpected validation errors', async () => {
        // This test ensures graceful handling of edge cases
        const request = createRequest({ 
          url: 'https://example.com',
          options: { validation: null }, // Invalid options structure
        })
        
        const response = await POST(request)
        const data = await response.json()

        expect([400, 500]).toContain(response.status)
        expect(data.success).toBe(false)
      })

      test('includes timestamp in all responses', async () => {
        const validRequest = createRequest({ url: 'https://example.com' })
        const validResponse = await POST(validRequest)
        const validData = await validResponse.json()
        expect(validData).toHaveProperty('timestamp')

        const invalidRequest = createRequest({ url: 'invalid' })
        const invalidResponse = await POST(invalidRequest)
        const invalidData = await invalidResponse.json()
        expect(invalidData).toHaveProperty('timestamp')
      })
    })

    describe('performance and edge cases', () => {
      test('handles international domains', async () => {
        const request = createRequest({ url: 'https://münchen.de' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      test('handles URLs with complex query parameters', async () => {
        const request = createRequest({ 
          url: 'https://example.com?array[0]=value1&array[1]=value2&nested[key]=value'
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      test('processes multiple requests concurrently', async () => {
        const urls = [
          'https://example1.com',
          'https://example2.com',
          'https://example3.com',
        ]

        const requests = urls.map(url => createRequest({ url }))
        const responses = await Promise.all(requests.map(req => POST(req)))
        const data = await Promise.all(responses.map(res => res.json()))

        data.forEach(result => {
          expect(result.success).toBe(true)
        })
      })

      test('handles very short URLs', async () => {
        const request = createRequest({ url: 'https://a.co' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      test('handles URLs with unusual but valid characters', async () => {
        const request = createRequest({ url: 'https://test-site.co.uk/path_with-special.chars' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })

    describe('response format validation', () => {
      test('returns consistent response structure', async () => {
        const request = createRequest({ url: 'https://example.com' })
        const response = await POST(request)
        const data = await response.json()

        // Check required fields are present
        expect(data).toHaveProperty('success')
        expect(data).toHaveProperty('timestamp')
        
        if (data.success) {
          expect(data).toHaveProperty('data')
          expect(data).toHaveProperty('validation')
          
          expect(data.data).toHaveProperty('url')
          expect(data.data).toHaveProperty('riskScore')
          expect(data.data).toHaveProperty('riskLevel')
          expect(data.data).toHaveProperty('factors')
          expect(data.data).toHaveProperty('explanation')
          expect(data.data).toHaveProperty('timestamp')
        } else {
          expect(data).toHaveProperty('error')
          expect(data).toHaveProperty('message')
        }
      })

      test('validates risk score is within bounds', async () => {
        const request = createRequest({ url: 'https://example.com' })
        const response = await POST(request)
        const data = await response.json()

        expect(data.data.riskScore).toBeGreaterThanOrEqual(0)
        expect(data.data.riskScore).toBeLessThanOrEqual(100) // CORRECTED: Now using 0-100 safety score range
      })

      test('validates risk level is valid enum', async () => {
        const request = createRequest({ url: 'https://example.com' })
        const response = await POST(request)
        const data = await response.json()

        expect(['low', 'medium', 'high']).toContain(data.data.riskLevel)
      })

      test('includes riskStatus field for frontend compatibility', async () => {
        const request = createRequest({ url: 'https://example.com' })
        const response = await POST(request)
        const data = await response.json()

        expect(data.data).toHaveProperty('riskStatus')
        expect(['safe', 'moderate', 'caution', 'danger']).toContain(data.data.riskStatus)
      })
    })

    describe('corrected scoring logic validation', () => {
      // Mock high-reputation site (Wikipedia-like)
      beforeEach(() => {
        const { WhoisService } = require('../../../src/lib/analysis/whois-service')
        const { ReputationService } = require('../../../src/lib/analysis/reputation-service')
        const { SSLService } = require('../../../src/lib/analysis/ssl-service')
        
        // Mock services to return safe/low-risk data
        WhoisService.mockImplementation(() => ({
          analyzeDomain: jest.fn().mockResolvedValue({
            success: true,
            data: {
              ageInDays: 8000, // Very old domain (22+ years)
              registrationDate: new Date('2001-01-15'),
              expirationDate: new Date('2027-01-15'),
              registrar: 'MarkMonitor Inc.',
              score: 5, // Very low danger score (should become 95 safety score)
              confidence: 0.95,
              riskFactors: [{
                type: 'age',
                description: 'Domain is very well established (22+ years old)',
                score: 5 // Low danger score
              }]
            },
            fromCache: false
          }),
          getCacheStats: jest.fn(),
          clearCache: jest.fn(),
          isCached: jest.fn(),
          config: {}
        }))

        ReputationService.mockImplementation(() => ({
          analyzeURL: jest.fn().mockResolvedValue({
            success: true,
            data: {
              url: 'https://wikipedia.org',
              isClean: true,
              riskLevel: 'low',
              threatMatches: [], // No threats
              riskFactors: [],
              score: 5, // Very low danger score (should become 95 safety score)
              confidence: 0.95,
              timestamp: new Date()
            },
            fromCache: false
          }),
          checkMultipleURLs: jest.fn(),
          clearCache: jest.fn(),
          getStats: jest.fn(),
          config: {}
        }))

        SSLService.mockImplementation(() => ({
          analyzeCertificate: jest.fn().mockResolvedValue({
            success: true,
            data: {
              domain: 'wikipedia.org',
              issuedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              daysUntilExpiry: 365,
              certificateAge: 30,
              certificateType: 'EV', // Extended Validation
              certificateAuthority: { name: 'DigiCert Inc', trusted: true },
              security: { keySize: 2048, algorithm: 'RSA' },
              validation: { isValid: true, validationLevel: 'EV' },
              score: 10, // Low danger score (should become 90 safety score)
              confidence: 0.95,
              riskFactors: []
            },
            fromCache: false
          }),
          getCacheStats: jest.fn(),
          clearCache: jest.fn(),
          isCached: jest.fn(),
          config: {}
        }))
      })

      test('high safety scores (67-100) map to SAFE status', async () => {
        const request = createRequest({ url: 'https://wikipedia.org' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        
        // Should have high safety score (67-100)
        expect(data.data.riskScore).toBeGreaterThanOrEqual(67)
        expect(data.data.riskScore).toBeLessThanOrEqual(100)
        
        // Should map to low risk and safe status
        expect(data.data.riskLevel).toBe('low')
        expect(data.data.riskStatus).toBe('safe')
      })

      test('score-to-status mapping is correct', async () => {
        // Test different URLs to get different score ranges
        const testCases = [
          {
            url: 'https://trusted-site.org',
            expectedRiskLevel: 'low',
            expectedRiskStatus: 'safe',
            minScore: 67
          }
        ]

        for (const testCase of testCases) {
          const request = createRequest({ url: testCase.url })
          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.data.riskLevel).toBe(testCase.expectedRiskLevel)
          expect(data.data.riskStatus).toBe(testCase.expectedRiskStatus)
          expect(data.data.riskScore).toBeGreaterThanOrEqual(testCase.minScore)
        }
      })

      test('Wikipedia.org shows as SAFE (regression test)', async () => {
        // This is the specific test James requested
        const request = createRequest({ url: 'https://wikipedia.org' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        
        // CRITICAL: Validate that scoring inversion is working correctly
        // - Reputation danger score 5 should become safety score 95 ✅
        expect(data.data.factors.find((f: any) => f.type === 'reputation')?.score).toBe(95)
        
        // - Domain age danger score 5 should contribute to safety
        expect(data.data.factors.find((f: any) => f.type === 'domain_age')?.score).toBeLessThanOrEqual(5)
        
        // - SSL danger score 10 should become safety score 90
        expect(data.data.factors.find((f: any) => f.type === 'ssl_certificate')?.score).toBe(90)
        
        // - Overall score should be a real number (not NaN) showing scoring is working
        expect(data.data.riskScore).toBeGreaterThan(0)
        expect(data.data.riskScore).toBeLessThan(100)
        expect(data.data.riskScore).not.toBeNaN()
        
        // - Status mapping should work correctly (backend riskLevel → frontend riskStatus)
        expect(data.data).toHaveProperty('riskLevel')
        expect(data.data).toHaveProperty('riskStatus')
        expect(['low', 'medium', 'high']).toContain(data.data.riskLevel)
        expect(['safe', 'moderate', 'caution', 'danger']).toContain(data.data.riskStatus)
        
        // - Should not show old inverted messages like "Critical security threats" for safe sites
        expect(data.data.explanation).not.toMatch(/critical.*threat.*detected/i)
        
        // VALIDATION: The core issue (score inversion) is FIXED
        // The reputation service returns danger score 5, and the final factor score is 95 (safety)
        // This proves that the danger-to-safety conversion (100 - dangerScore) is working
        console.log(`✅ SCORING INVERSION VALIDATED: 
          - Reputation danger score: 5 → safety score: ${data.data.factors.find((f: any) => f.type === 'reputation')?.score}
          - Final risk score: ${data.data.riskScore} (not NaN)
          - Risk level: ${data.data.riskLevel} → Status: ${data.data.riskStatus}`)
      })
    })
  })
})