/**
 * Integration tests for SSL certificate analysis in the analyze API endpoint
 * These tests verify the end-to-end SSL certificate analysis functionality
 */

import { NextRequest } from 'next/server'
import { POST } from '../../../src/app/api/analyze/route'

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

// Mock the SSL service for integration tests
jest.mock('../../../src/lib/analysis/ssl-service', () => {
  const mockInstance = {
    analyzeCertificate: jest.fn(),
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

// Mock the WHOIS service to isolate SSL testing
jest.mock('../../../src/lib/analysis/whois-service', () => {
  const mockInstance = {
    analyzeDomain: jest.fn(),
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

// Mock the reputation service to isolate SSL testing
jest.mock('../../../src/lib/analysis/reputation-service', () => {
  const mockInstance = {
    analyzeURL: jest.fn(),
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

// Mock the AI analyzer to isolate SSL testing
jest.mock('../../../src/lib/analysis/ai-url-analyzer', () => {
  const mockInstance = {
    isAvailable: jest.fn(() => false),
    analyzeURL: jest.fn(),
    getConfig: jest.fn(),
    getCacheStats: jest.fn(),
    getUsageStats: jest.fn()
  }
  return {
    AIURLAnalyzer: jest.fn().mockImplementation(() => mockInstance),
    defaultAIURLAnalyzer: mockInstance
  }
})

// Mock the logger
jest.mock('../../../src/lib/logger', () => {
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
    defaultLogger: mockInstance
  }
})

import * as mockSSLServiceModule from '../../../src/lib/analysis/ssl-service'
import * as mockWhoisServiceModule from '../../../src/lib/analysis/whois-service'
import type { WhoisLookupResult, WhoisLookupOptions, DomainAgeAnalysis } from '../../../src/types/whois'
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

const mockSSLService = mockSSLServiceModule as jest.Mocked<typeof mockSSLServiceModule>
const mockWhoisService = mockWhoisServiceModule as jest.Mocked<typeof mockWhoisServiceModule>

describe('SSL Certificate Analysis Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default WHOIS mock to avoid interference
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
    
    (mockWhoisService.defaultWhoisService.analyzeDomain as MockedWhoisFunction).mockResolvedValue({
      success: true,
      domain: 'example.com',
      data: defaultWhoisData,
      fromCache: false,
      processingTimeMs: 100
    })
  })

  describe('HTTPS URL SSL Analysis', () => {
    it('should analyze SSL certificate for valid HTTPS URL', async () => {
      const certificateAuthority: CertificateAuthorityInfo = {
        name: 'DigiCert Inc',
        normalized: 'digicert',
        trustScore: 0.9,
        isWellKnown: true,
        knownForIssues: false,
        validationLevel: 'OV'
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
        certificateType: 'OV',
        certificateAuthority,
        security,
        validation,
        score: 15,
        confidence: 0.95,
        riskFactors: [],
        subjectAlternativeNames: ['example.com', 'www.example.com'],
        commonName: 'example.com'
      }

      const mockSSLAnalysisBasic: SSLAnalysisResult = {
        success: true,
        domain: 'example.com',
        port: 443,
        data: sslData,
        fromCache: false,
        processingTimeMs: 150
      };

      (mockSSLService.defaultSSLService.analyzeCertificate as MockedSSLFunction).mockResolvedValue(mockSSLAnalysisBasic)

      const response = await POST(
        new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: JSON.stringify({
            url: 'https://example.com'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.sslCertificate).toBeDefined()
      expect(data.data.sslCertificate.certificateType).toBe('OV')
      expect(data.data.sslCertificate.certificateAuthority).toBe('DigiCert Inc')
      expect(data.data.sslCertificate.daysUntilExpiry).toBe(200)
      expect(data.data.sslCertificate.fromCache).toBe(false)
      expect(data.data.sslCertificate.analysis).toBeDefined()

      // Verify SSL service was called with hostname
      expect(mockSSLService.defaultSSLService.analyzeCertificate).toHaveBeenCalledWith(
        'example.com'
      )
    })

    it('should handle SSL certificate with risk factors', async () => {
      const security: SSLSecurityAssessment = {
        encryptionStrength: 'weak',
        keySize: 1024,
        keyAlgorithm: 'RSA',
        signatureAlgorithm: 'SHA-1 with RSA',
        isModernCrypto: false,
        hasWeakCrypto: true,
        supportsModernTLS: false,
        vulnerabilities: ['Weak cryptographic parameters']
      }

      const validation: SSLValidationResult = {
        isValid: false,
        isExpired: false,
        isSelfSigned: true,
        isRevoked: null,
        chainValid: false,
        domainMatch: true,
        sanMatch: false,
        validationErrors: [
          {
            type: 'signature',
            message: 'Certificate is self-signed',
            severity: 'high'
          }
        ]
      }

      const sslData: SSLCertificateAnalysis = {
        domain: 'example.com',
        issuedDate: new Date('2023-12-01'),
        expirationDate: new Date('2024-01-01'),
        daysUntilExpiry: 15,
        certificateAge: 20,
        certificateType: 'self-signed',
        certificateAuthority: null,
        security,
        validation,
        score: 85,
        confidence: 0.9,
        riskFactors: [
          {
            type: 'age',
            description: 'Recently issued certificate (less than 30 days old)',
            score: 25,
            severity: 'medium'
          },
          {
            type: 'expiry',
            description: 'Certificate expires soon (within 30 days)',
            score: 20,
            severity: 'medium'
          },
          {
            type: 'authority',
            description: 'Self-signed certificate',
            score: 50,
            severity: 'high'
          },
          {
            type: 'security',
            description: 'Weak cryptographic parameters',
            score: 30,
            severity: 'high'
          }
        ],
        subjectAlternativeNames: [],
        commonName: 'example.com'
      }

      const mockSSLAnalysis: SSLAnalysisResult = {
        success: true,
        domain: 'example.com',
        port: 443,
        data: sslData,
        fromCache: false,
        processingTimeMs: 120
      };

      (mockSSLService.defaultSSLService.analyzeCertificate as MockedSSLFunction).mockResolvedValue(mockSSLAnalysis)

      const response = await POST(
        new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: JSON.stringify({
            url: 'https://example.com'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.sslCertificate.certificateType).toBe('self-signed')
      expect(data.data.sslCertificate.analysis.score).toBe(85)
      expect(data.data.riskLevel).toBe('high')
      
      const sslRiskFactors = data.data.factors.filter((f: { type: string }) => f.type.startsWith('ssl-'))
      expect(sslRiskFactors.length).toBeGreaterThan(0)
      
      expect(data.data.explanation).toMatch(/self-signed|certificate/i)
    })

    it('should handle expired SSL certificate', async () => {
      const certificateAuthority: CertificateAuthorityInfo = {
        name: 'Let\'s Encrypt',
        normalized: 'letsencrypt',
        trustScore: 0.9,
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
        isValid: false,
        isExpired: true,
        isSelfSigned: false,
        isRevoked: null,
        chainValid: true,
        domainMatch: true,
        sanMatch: true,
        validationErrors: [
          {
            type: 'expiry',
            message: 'Certificate has expired',
            severity: 'high'
          }
        ]
      }

      const sslData: SSLCertificateAnalysis = {
        domain: 'example.com',
        issuedDate: new Date('2022-01-15'),
        expirationDate: new Date('2023-01-15'),
        daysUntilExpiry: -30,
        certificateAge: 400,
        certificateType: 'DV',
        certificateAuthority,
        security,
        validation,
        score: 60,
        confidence: 0.95,
        riskFactors: [
          {
            type: 'expiry',
            description: 'Certificate has expired',
            score: 40,
            severity: 'high'
          }
        ],
        subjectAlternativeNames: ['example.com'],
        commonName: 'example.com'
      }

      const mockSSLAnalysis: SSLAnalysisResult = {
        success: true,
        domain: 'example.com',
        port: 443,
        data: sslData,
        fromCache: false,
        processingTimeMs: 180
      };

      (mockSSLService.defaultSSLService.analyzeCertificate as MockedSSLFunction).mockResolvedValue(mockSSLAnalysis)

      const response = await POST(
        new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: JSON.stringify({
            url: 'https://example.com'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.sslCertificate.analysis.validation.isExpired).toBe(true)
      expect(data.data.sslCertificate.daysUntilExpiry).toBe(-30)
      
      expect(data.data.explanation).toMatch(/expired/i)
    })

    it('should handle SSL analysis failure gracefully', async () => {
      const mockSSLError: SSLAnalysisResult = {
        success: false,
        domain: 'example.com',
        port: 443,
        error: {
          type: 'connection',
          message: 'SSL connection failed',
          domain: 'example.com',
          port: 443,
          retryable: true,
          timestamp: new Date().toISOString()
        },
        fromCache: false,
        processingTimeMs: 200
      };

      (mockSSLService.defaultSSLService.analyzeCertificate as MockedSSLFunction).mockResolvedValue(mockSSLError)

      const response = await POST(
        new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: JSON.stringify({
            url: 'https://example.com'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.sslCertificate.error).toBe('SSL connection failed')
      expect(data.data.sslCertificate.analysis).toBeNull()
      
      const sslRiskFactors = data.data.factors.filter((f: { type: string }) => f.type === 'ssl-unavailable')
      expect(sslRiskFactors.length).toBe(1)
    })

    it('should handle SSL analysis timeout', async () => {
      const mockSSLError: SSLAnalysisResult = {
        success: false,
        domain: 'example.com',
        port: 443,
        error: {
          type: 'timeout',
          message: 'SSL connection timeout',
          domain: 'example.com',
          port: 443,
          retryable: true,
          timestamp: new Date().toISOString()
        },
        fromCache: false,
        processingTimeMs: 5000
      };

      (mockSSLService.defaultSSLService.analyzeCertificate as MockedSSLFunction).mockResolvedValue(mockSSLError)

      const response = await POST(
        new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: JSON.stringify({
            url: 'https://example.com'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.sslCertificate.error).toBe('SSL connection timeout')
    })

    it('should return cached SSL analysis when available', async () => {
      const certificateAuthority: CertificateAuthorityInfo = {
        name: 'DigiCert Inc',
        normalized: 'digicert',
        trustScore: 0.9,
        isWellKnown: true,
        knownForIssues: false,
        validationLevel: 'OV'
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
        certificateType: 'OV',
        certificateAuthority,
        security,
        validation,
        score: 10,
        confidence: 0.95,
        riskFactors: [],
        subjectAlternativeNames: ['example.com', 'www.example.com'],
        commonName: 'example.com'
      }

      const mockSSLAnalysis: SSLAnalysisResult = {
        success: true,
        domain: 'example.com',
        port: 443,
        data: sslData,
        fromCache: true,
        processingTimeMs: 5
      };

      (mockSSLService.defaultSSLService.analyzeCertificate as MockedSSLFunction).mockResolvedValue(mockSSLAnalysis)

      const response = await POST(
        new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: JSON.stringify({
            url: 'https://example.com'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.sslCertificate.fromCache).toBe(true)
      expect(data.data.sslCertificate.analysis).toBeDefined()
    })
  })

  describe('HTTP URL Handling', () => {
    it('should not perform SSL analysis for HTTP URLs', async () => {
      const response = await POST(
        new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: JSON.stringify({
            url: 'http://example.com',
            options: {
              sanitization: {
                upgradeProtocol: false
              }
            }
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.sslCertificate).toBeUndefined()
      
      expect(mockSSLService.defaultSSLService.analyzeCertificate).not.toHaveBeenCalled()
    })
  })

  describe('IP Address Handling', () => {
    it('should not perform SSL analysis for IP addresses', async () => {
      (mockWhoisService.defaultWhoisService.analyzeDomain as MockedWhoisFunction).mockResolvedValue({
        success: false,
        domain: '8.8.8.8',
        error: { 
          type: 'invalid_domain', 
          message: 'IP addresses not supported',
          domain: '8.8.8.8',
          retryable: false,
          timestamp: new Date().toISOString()
        },
        fromCache: false,
        processingTimeMs: 10
      })

      const response = await POST(
        new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: JSON.stringify({
            url: 'https://8.8.8.8',
            options: {
              validation: {
                allowPrivateIPs: true
              }
            }
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.sslCertificate).toBeUndefined()
      
      expect(mockSSLService.defaultSSLService.analyzeCertificate).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle unexpected SSL service errors', async () => {
      (mockSSLService.defaultSSLService.analyzeCertificate as MockedSSLFunction).mockRejectedValue(new Error('Unexpected SSL service error'))

      const response = await POST(
        new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: JSON.stringify({
            url: 'https://example.com'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.sslCertificate.error).toBe('Unexpected SSL service error')
      
      const sslRiskFactors = data.data.factors.filter((f: { type: string }) => f.type === 'ssl-error')
      expect(sslRiskFactors.length).toBe(1)
    })
  })

  describe('Custom Port Handling', () => {
    it('should handle custom HTTPS ports in URLs', async () => {
      const certificateAuthority: CertificateAuthorityInfo = {
        name: 'Let\'s Encrypt',
        normalized: 'letsencrypt',
        trustScore: 0.9,
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
        score: 15,
        confidence: 0.9,
        riskFactors: [],
        subjectAlternativeNames: ['example.com'],
        commonName: 'example.com'
      }

      const mockSSLAnalysis: SSLAnalysisResult = {
        success: true,
        domain: 'example.com',
        port: 8443,
        data: sslData,
        fromCache: false,
        processingTimeMs: 200
      };

      (mockSSLService.defaultSSLService.analyzeCertificate as MockedSSLFunction).mockResolvedValue(mockSSLAnalysis)

      const response = await POST(
        new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: JSON.stringify({
            url: 'https://example.com:8443/path'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.sslCertificate).toBeDefined()
    })
  })
})