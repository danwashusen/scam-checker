/**
 * Integration tests for WHOIS domain age analysis in the analyze API endpoint
 * These tests verify the end-to-end WHOIS analysis functionality
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '../../../src/app/api/analyze/route'

// Mock NextResponse to avoid Next.js runtime issues in tests
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data: unknown, options?: { status?: number }) => ({
      json: async () => data,
      status: options?.status || 200
    }))
  }
}))

// Mock the WHOIS service to avoid actual network calls
jest.mock('../../../src/lib/analysis/whois-service', () => ({
  defaultWhoisService: {
    analyzeDomain: jest.fn()
  }
}))

// Mock the SSL service to isolate WHOIS testing  
jest.mock('../../../src/lib/analysis/ssl-service', () => ({
  defaultSSLService: {
    analyzeCertificate: jest.fn()
  }
}))

// Import the mocked modules
import * as whoisServiceModule from '../../../src/lib/analysis/whois-service'
import * as sslServiceModule from '../../../src/lib/analysis/ssl-service'
import type { 
  WhoisLookupResult, 
  WhoisLookupOptions, 
  DomainAgeAnalysis 
} from '../../../src/types/whois'
import type { 
  SSLAnalysisResult, 
  SSLConnectionOptions,
  SSLCertificateAnalysis,
  SSLSecurityAssessment,
  SSLValidationResult,
  CertificateAuthorityInfo
} from '../../../src/types/ssl'
import type { ParsedURL } from '../../../src/lib/validation/url-parser'

type MockedWhoisFunction = jest.MockedFunction<(domainInput: string | ParsedURL, options?: WhoisLookupOptions) => Promise<WhoisLookupResult>>
type MockedSSLFunction = jest.MockedFunction<(domainInput: string | ParsedURL, options?: SSLConnectionOptions) => Promise<SSLAnalysisResult>>

const { defaultWhoisService } = whoisServiceModule as jest.Mocked<typeof whoisServiceModule>
const { defaultSSLService } = sslServiceModule as jest.Mocked<typeof sslServiceModule>

// Helper function to create a mock NextRequest
function createMockRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
    method: 'POST',
    url: 'http://localhost/api/analyze',
    headers: new Headers(),
    cookies: {} as NextRequest['cookies'],
    nextUrl: new URL('http://localhost/api/analyze'),
    page: {},
    ua: {},
  } as unknown as NextRequest
}

describe('/api/analyze Integration Tests with WHOIS', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default WHOIS mock
    const defaultWhoisData: DomainAgeAnalysis = {
      ageInDays: 1000,
      registrationDate: new Date('2021-01-01'),
      expirationDate: new Date('2025-01-01'),
      updatedDate: new Date('2023-01-01'),
      registrar: 'Test Registrar',
      nameservers: ['ns1.example.com', 'ns2.example.com'],
      status: ['active'],
      score: 0.2,
      confidence: 0.9,
      privacyProtected: false,
      registrantCountry: 'US',
      riskFactors: []
    };
    
    (defaultWhoisService.analyzeDomain as MockedWhoisFunction).mockResolvedValue({
      success: true,
      domain: 'example.com',
      data: defaultWhoisData,
      fromCache: false,
      processingTimeMs: 100
    })
    
    // Setup default SSL mock to avoid interference
    const certificateAuthority: CertificateAuthorityInfo = {
      name: 'Let\'s Encrypt',
      normalized: 'letsencrypt',
      trustScore: 0.8,
      isWellKnown: true,
      knownForIssues: false,
      validationLevel: 'DV'
    }

    const security: SSLSecurityAssessment = {
      encryptionStrength: 'strong',
      keySize: 2048,
      keyAlgorithm: 'RSA',
      signatureAlgorithm: 'SHA-256 with RSA',
      isModernCrypto: true,
      hasWeakCrypto: false,
      supportsModernTLS: true,
      vulnerabilities: []
    }

    const validation: SSLValidationResult = {
      isValid: true,
      isExpired: false,
      isSelfSigned: false,
      isRevoked: null,
      chainValid: true,
      domainMatch: true,
      sanMatch: true,
      validationErrors: []
    }

    const sslData: SSLCertificateAnalysis = {
      domain: 'example.com',
      issuedDate: new Date('2023-01-15'),
      expirationDate: new Date('2024-01-15'),
      daysUntilExpiry: 200,
      certificateAge: 150,
      certificateType: 'DV',
      certificateAuthority,
      security,
      validation,
      score: 10,
      confidence: 0.9,
      riskFactors: [],
      subjectAlternativeNames: ['example.com'],
      commonName: 'example.com'
    };
    
    (defaultSSLService.analyzeCertificate as MockedSSLFunction).mockResolvedValue({
      success: true,
      domain: 'example.com',
      port: 443,
      data: sslData,
      fromCache: false,
      processingTimeMs: 100
    })
  })

  describe('POST /api/analyze with WHOIS integration', () => {
    it('should successfully analyze URL with WHOIS data', async () => {
      // Mock successful WHOIS lookup
      const mockWhoisAnalysis: DomainAgeAnalysis = {
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
        riskFactors: [
          {
            type: 'age',
            description: 'Domain is mature (3.3 years old)',
            score: 0.1
          },
          {
            type: 'registrar',
            description: 'Registered with Example Registrar Inc. (trust score: 0.8)',
            score: 0.04
          }
        ]
      };

      (defaultWhoisService.analyzeDomain as MockedWhoisFunction).mockResolvedValueOnce({
        success: true,
        domain: 'example.com',
        data: mockWhoisAnalysis,
        fromCache: false,
        processingTimeMs: 1500
      })

      const request = createMockRequest({
        url: 'https://example.com/test-path'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.domainAge).toBeDefined()
      expect(data.data.domainAge.ageInDays).toBe(1200)
      expect(data.data.domainAge.registrar).toBe('Example Registrar Inc.')
      expect(data.data.domainAge.analysis).toEqual(mockWhoisAnalysis)
      expect(data.data.domainAge.fromCache).toBe(false)
      
      // Should include WHOIS risk factors in the overall analysis
      expect(data.data.factors.some((f: { type: string }) => f.type === 'age')).toBe(true)
      expect(data.data.factors.some((f: { type: string }) => f.type === 'registrar')).toBe(true)
    })

    it('should handle WHOIS lookup failure gracefully', async () => {
      // Mock failed WHOIS lookup
      (defaultWhoisService.analyzeDomain as MockedWhoisFunction).mockResolvedValue({
        success: false,
        domain: 'example.com',
        error: {
          type: 'timeout',
          message: 'WHOIS query timed out',
          domain: 'example.com',
          retryable: true,
          timestamp: new Date().toISOString()
        },
        fromCache: false,
        processingTimeMs: 5000
      })

      const request = createMockRequest({
        url: 'https://example.com/test-path'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.domainAge).toBeDefined()
      expect(data.data.domainAge.ageInDays).toBeNull()
      expect(data.data.domainAge.error).toBe('WHOIS query timed out')
      
      // Should include fallback risk factor
      expect(data.data.factors.some((f: { type: string }) => f.type === 'domain-age-unknown')).toBe(true)
    })

    it('should handle WHOIS service exceptions', async () => {
      // Mock WHOIS service throwing an exception
      (defaultWhoisService.analyzeDomain as MockedWhoisFunction).mockRejectedValue(
        new Error('Unexpected WHOIS service error')
      )

      const request = createMockRequest({
        url: 'https://example.com/test-path'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.domainAge).toBeDefined()
      expect(data.data.domainAge.error).toBe('Unexpected WHOIS service error')
      
      // Should include error-based risk factor
      expect(data.data.factors.some((f: { type: string }) => f.type === 'domain-age-error')).toBe(true)
    })

    it('should not perform WHOIS lookup for IP addresses', async () => {
      const request = createMockRequest({
        url: 'http://8.8.8.8/path', // Use public IP that's allowed
        options: {
          validation: {
            allowPrivateIPs: false // Ensure we don't allow private IPs
          }
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.domainAge).toBeUndefined()
      expect(defaultWhoisService.analyzeDomain).not.toHaveBeenCalled()
      
      // Should still have IP-based risk factor
      expect(data.data.factors.some((f: { type: string }) => f.type === 'domain')).toBe(true)
    })

    it('should include WHOIS data from cache', async () => {
      const mockWhoisAnalysis: DomainAgeAnalysis = {
        ageInDays: 500,
        registrationDate: new Date('2022-06-01'),
        expirationDate: new Date('2025-06-01'),
        updatedDate: new Date('2023-06-01'),
        registrar: 'Cached Registrar LLC',
        nameservers: ['ns1.cached.com'],
        status: ['active'],
        score: 0.3,
        confidence: 0.8,
        privacyProtected: true,
        registrantCountry: null,
        riskFactors: [
          {
            type: 'age',
            description: 'Domain is established (1.4 years old)',
            score: 0.2
          },
          {
            type: 'privacy',
            description: 'Domain registration uses privacy protection',
            score: 0.3
          }
        ]
      };

      (defaultWhoisService.analyzeDomain as MockedWhoisFunction).mockResolvedValue({
        success: true,
        domain: 'cached.com',
        data: mockWhoisAnalysis,
        fromCache: true, // Cached result
        processingTimeMs: 50
      })

      const request = createMockRequest({
        url: 'https://cached.com'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.domainAge.fromCache).toBe(true)
      expect(data.data.domainAge.analysis.privacyProtected).toBe(true)
      
      // Should include privacy protection risk factor
      expect(data.data.factors.some((f: { type: string }) => f.type === 'privacy')).toBe(true)
    })

    it('should analyze very new domain with high risk score', async () => {
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 10) // 10 days ago

      const mockWhoisAnalysis: DomainAgeAnalysis = {
        ageInDays: 10,
        registrationDate: recentDate,
        expirationDate: new Date('2025-01-01'),
        updatedDate: recentDate,
        registrar: 'Sketchy Registrar',
        nameservers: ['ns1.sketchy.com'],
        status: ['active'],
        score: 0.9, // High risk
        confidence: 0.9,
        privacyProtected: true,
        registrantCountry: null,
        riskFactors: [
          {
            type: 'age',
            description: 'Domain is very new (10 days old)',
            score: 0.8
          },
          {
            type: 'privacy',
            description: 'Domain registration uses privacy protection',
            score: 0.3
          },
          {
            type: 'registrar',
            description: 'Unknown or less common registrar',
            score: 0.2
          }
        ]
      };

      (defaultWhoisService.analyzeDomain as MockedWhoisFunction).mockResolvedValue({
        success: true,
        domain: 'suspicious.com',
        data: mockWhoisAnalysis,
        fromCache: false,
        processingTimeMs: 2000
      })

      const request = createMockRequest({
        url: 'https://suspicious.com'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.riskLevel).toBe('high')
      expect(data.data.riskScore).toBeGreaterThan(0.7)
      expect(data.data.domainAge.ageInDays).toBe(10)
      expect(data.data.explanation).toContain('very recently')
    })

    it('should analyze mature domain with low risk score', async () => {
      const oldDate = new Date('2018-01-01')

      const mockWhoisAnalysis: DomainAgeAnalysis = {
        ageInDays: 2100, // About 5.7 years
        registrationDate: oldDate,
        expirationDate: new Date('2025-01-01'),
        updatedDate: new Date('2023-01-01'),
        registrar: 'Trusted Registrar Inc.',
        nameservers: ['ns1.trusted.com', 'ns2.trusted.com'],
        status: ['active'],
        score: 0.1, // Low risk
        confidence: 1.0,
        privacyProtected: false,
        registrantCountry: 'US',
        riskFactors: [
          {
            type: 'age',
            description: 'Domain is mature (5.7 years old)',
            score: 0.1
          }
        ]
      };

      (defaultWhoisService.analyzeDomain as MockedWhoisFunction).mockResolvedValue({
        success: true,
        domain: 'trustworthy.com',
        data: mockWhoisAnalysis,
        fromCache: false,
        processingTimeMs: 1200
      })

      const request = createMockRequest({
        url: 'https://trustworthy.com/secure-page'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.riskLevel).toBe('low')
      expect(data.data.riskScore).toBeLessThan(0.3)
      expect(data.data.domainAge.ageInDays).toBe(2100)
      expect(data.data.explanation).toContain('5.7 years')
      expect(data.data.explanation).toContain('established presence')
    })

    it('should handle subdomain extraction correctly for WHOIS', async () => {
      const mockWhoisAnalysis: DomainAgeAnalysis = {
        ageInDays: 800,
        registrationDate: new Date('2021-01-01'),
        expirationDate: new Date('2025-01-01'),
        updatedDate: new Date('2023-01-01'),
        registrar: 'Domain Registrar',
        nameservers: ['ns1.parent.com'],
        status: ['active'],
        score: 0.25,
        confidence: 0.85,
        privacyProtected: false,
        registrantCountry: 'CA',
        riskFactors: [
          {
            type: 'age',
            description: 'Domain is established (2.2 years old)',
            score: 0.2
          }
        ]
      };

      (defaultWhoisService.analyzeDomain as MockedWhoisFunction).mockResolvedValue({
        success: true,
        domain: 'parent.com', // Should query parent domain, not subdomain
        data: mockWhoisAnalysis,
        fromCache: false,
        processingTimeMs: 1800
      })

      const request = createMockRequest({
        url: 'https://subdomain.parent.com/path'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.domainAge).toBeDefined()
      
      // Verify that WHOIS was called with the parsed URL object
      expect(defaultWhoisService.analyzeDomain).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: 'subdomain.parent.com',
          domain: 'parent.com' // The root domain for WHOIS lookup
        })
      )
    })
  })

  describe('GET /api/analyze documentation', () => {
    it('should include WHOIS features in API documentation', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.features).toContain('Domain age analysis via WHOIS data')
      expect(data.features).toContain('Cached WHOIS lookups for performance')
      expect(data.features).toContain('Domain registration pattern analysis')
      expect(data.features).toContain('Registrar reputation scoring')
      expect(data.features).toContain('Privacy protection detection')
    })
  })

  describe('Error scenarios with WHOIS integration', () => {
    it('should handle invalid URL input without affecting WHOIS flow', async () => {
      const request = createMockRequest({
        url: 'not-a-valid-url'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(defaultWhoisService.analyzeDomain).not.toHaveBeenCalled()
    })

    it('should handle missing URL parameter', async () => {
      const request = createMockRequest({})

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(defaultWhoisService.analyzeDomain).not.toHaveBeenCalled()
    })

    it('should handle malformed request body', async () => {
      const request = {
        json: async () => { throw new Error('Invalid JSON') },
        method: 'POST',
        url: 'http://localhost/api/analyze',
        headers: new Headers(),
        cookies: {} as NextRequest['cookies'],
        nextUrl: new URL('http://localhost/api/analyze'),
        page: {},
        ua: {},
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(defaultWhoisService.analyzeDomain).not.toHaveBeenCalled()
    })
  })

  describe('Performance and caching with WHOIS', () => {
    it('should complete analysis within reasonable time with WHOIS', async () => {
      const mockWhoisAnalysis: DomainAgeAnalysis = {
        ageInDays: 365,
        registrationDate: new Date('2023-01-01'),
        expirationDate: new Date('2025-01-01'),
        updatedDate: new Date('2023-06-01'),
        registrar: 'Fast Registrar',
        nameservers: ['ns1.fast.com'],
        status: ['active'],
        score: 0.3,
        confidence: 0.9,
        privacyProtected: false,
        registrantCountry: 'US',
        riskFactors: [
          {
            type: 'age',
            description: 'Domain is recent (365 days old)',
            score: 0.4
          }
        ]
      };

      (defaultWhoisService.analyzeDomain as MockedWhoisFunction).mockResolvedValue({
        success: true,
        domain: 'fast.com',
        data: mockWhoisAnalysis,
        fromCache: true, // Cached for speed
        processingTimeMs: 10
      })

      const startTime = Date.now()
      
      const request = createMockRequest({
        url: 'https://fast.com'
      })

      const response = await POST(request)
      const data = await response.json()

      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(totalTime).toBeLessThan(2000) // Should complete in under 2 seconds
      expect(data.data.domainAge.fromCache).toBe(true)
    })
  })
})