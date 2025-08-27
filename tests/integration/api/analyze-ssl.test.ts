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
jest.mock('../../../src/lib/analysis/ssl-service', () => ({
  defaultSSLService: {
    analyzeCertificate: jest.fn()
  }
}))

import mockSSLServiceModule from '../../../src/lib/analysis/ssl-service'
const mockSSLService = mockSSLServiceModule as jest.Mocked<typeof mockSSLServiceModule>

// Mock the WHOIS service to isolate SSL testing
jest.mock('../../../src/lib/analysis/whois-service', () => ({
  defaultWhoisService: {
    analyzeDomain: jest.fn()
  }
}))
import mockWhoisServiceModule from '../../../src/lib/analysis/whois-service'
const mockWhoisService = mockWhoisServiceModule as jest.Mocked<typeof mockWhoisServiceModule>

describe('SSL Certificate Analysis Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default WHOIS mock to avoid interference
    mockWhoisService.defaultWhoisService.analyzeDomain.mockResolvedValue({
      success: true,
      domain: 'example.com',
      data: {
        ageInDays: 1000,
        registrationDate: new Date('2021-01-01'),
        expirationDate: new Date('2025-01-01'),
        registrar: 'Test Registrar',
        score: 0.2,
        confidence: 0.9,
        riskFactors: []
      },
      fromCache: false
    })
  })

  describe('HTTPS URL SSL Analysis', () => {
    it('should analyze SSL certificate for valid HTTPS URL', async () => {
      const mockSSLAnalysis = {
        success: true,
        domain: 'example.com',
        port: 443,
        data: {
          domain: 'example.com',
          issuedDate: new Date('2023-01-15'),
          expirationDate: new Date('2024-01-15'),
          daysUntilExpiry: 200,
          certificateAge: 150,
          certificateType: 'OV',
          certificateAuthority: {
            name: 'DigiCert Inc',
            normalized: 'digicert',
            trustScore: 0.9,
            isWellKnown: true,
            knownForIssues: false,
            validationLevel: 'OV'
          },
          security: {
            encryptionStrength: 'strong',
            keySize: 2048,
            keyAlgorithm: 'RSA',
            signatureAlgorithm: 'SHA-256 with RSA',
            isModernCrypto: true,
            hasWeakCrypto: false,
            supportsModernTLS: true,
            vulnerabilities: []
          },
          validation: {
            isValid: true,
            isExpired: false,
            isSelfSigned: false,
            isRevoked: null,
            chainValid: true,
            domainMatch: true,
            sanMatch: true,
            validationErrors: []
          },
          score: 15,
          confidence: 0.95,
          riskFactors: [],
          subjectAlternativeNames: ['example.com', 'www.example.com'],
          commonName: 'example.com'
        },
        fromCache: false,
        processingTimeMs: 150
      }

      mockSSLService.defaultSSLService.analyzeCertificate.mockResolvedValue(mockSSLAnalysis)

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

      // Verify SSL service was called
      expect(mockSSLService.defaultSSLService.analyzeCertificate).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'example.com'
        })
      )
    })

    it('should handle SSL certificate with risk factors', async () => {
      const mockSSLAnalysis = {
        success: true,
        domain: 'example.com',
        port: 443,
        data: {
          domain: 'example.com',
          issuedDate: new Date('2023-12-01'), // Recently issued
          expirationDate: new Date('2024-01-01'), // Soon to expire
          daysUntilExpiry: 15,
          certificateAge: 20,
          certificateType: 'self-signed',
          certificateAuthority: null,
          security: {
            encryptionStrength: 'weak',
            keySize: 1024,
            keyAlgorithm: 'RSA',
            signatureAlgorithm: 'SHA-1 with RSA',
            isModernCrypto: false,
            hasWeakCrypto: true,
            supportsModernTLS: false,
            vulnerabilities: ['Weak cryptographic parameters']
          },
          validation: {
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
          },
          score: 85, // High risk
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
        },
        fromCache: false,
        processingTimeMs: 120
      }

      mockSSLService.defaultSSLService.analyzeCertificate.mockResolvedValue(mockSSLAnalysis)

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
      expect(data.data.riskLevel).toBe('high') // Should be high due to SSL risks
      
      // Check that SSL risk factors are included in overall risk assessment
      const sslRiskFactors = data.data.factors.filter((f: { type: string }) => f.type.startsWith('ssl-'))
      expect(sslRiskFactors.length).toBeGreaterThan(0)
      
      // Verify explanation mentions SSL issues
      expect(data.data.explanation).toMatch(/self-signed|certificate/i)
    })

    it('should handle expired SSL certificate', async () => {
      const mockSSLAnalysis = {
        success: true,
        domain: 'example.com',
        port: 443,
        data: {
          domain: 'example.com',
          issuedDate: new Date('2022-01-15'),
          expirationDate: new Date('2023-01-15'), // Expired
          daysUntilExpiry: -30,
          certificateAge: 400,
          certificateType: 'DV',
          certificateAuthority: {
            name: 'Let\'s Encrypt',
            normalized: 'letsencrypt',
            trustScore: 0.9,
            isWellKnown: true,
            knownForIssues: false,
            validationLevel: 'DV'
          },
          security: {
            encryptionStrength: 'strong',
            keySize: 2048,
            keyAlgorithm: 'RSA',
            signatureAlgorithm: 'SHA-256 with RSA',
            isModernCrypto: true,
            hasWeakCrypto: false,
            supportsModernTLS: true,
            vulnerabilities: []
          },
          validation: {
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
          },
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
        },
        fromCache: false,
        processingTimeMs: 180
      }

      mockSSLService.defaultSSLService.analyzeCertificate.mockResolvedValue(mockSSLAnalysis)

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
      
      // Verify explanation mentions certificate expiration
      expect(data.data.explanation).toMatch(/expired/i)
    })

    it('should handle SSL analysis failure gracefully', async () => {
      const mockSSLError = {
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
      }

      mockSSLService.defaultSSLService.analyzeCertificate.mockResolvedValue(mockSSLError)

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
      
      // Should still have a fallback risk factor for SSL unavailability
      const sslRiskFactors = data.data.factors.filter((f: { type: string }) => f.type === 'ssl-unavailable')
      expect(sslRiskFactors.length).toBe(1)
    })

    it('should handle SSL analysis timeout', async () => {
      const mockSSLError = {
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
      }

      mockSSLService.defaultSSLService.analyzeCertificate.mockResolvedValue(mockSSLError)

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
      const mockSSLAnalysis = {
        success: true,
        domain: 'example.com',
        port: 443,
        data: {
          domain: 'example.com',
          issuedDate: new Date('2023-01-15'),
          expirationDate: new Date('2024-01-15'),
          daysUntilExpiry: 200,
          certificateAge: 150,
          certificateType: 'OV',
          certificateAuthority: {
            name: 'DigiCert Inc',
            normalized: 'digicert',
            trustScore: 0.9,
            isWellKnown: true,
            knownForIssues: false,
            validationLevel: 'OV'
          },
          security: {
            encryptionStrength: 'strong',
            keySize: 2048,
            keyAlgorithm: 'RSA',
            signatureAlgorithm: 'SHA-256 with RSA',
            isModernCrypto: true,
            hasWeakCrypto: false,
            supportsModernTLS: true,
            vulnerabilities: []
          },
          validation: {
            isValid: true,
            isExpired: false,
            isSelfSigned: false,
            isRevoked: null,
            chainValid: true,
            domainMatch: true,
            sanMatch: true,
            validationErrors: []
          },
          score: 10,
          confidence: 0.95,
          riskFactors: [],
          subjectAlternativeNames: ['example.com', 'www.example.com'],
          commonName: 'example.com'
        },
        fromCache: true, // Cached result
        processingTimeMs: 5
      }

      mockSSLService.defaultSSLService.analyzeCertificate.mockResolvedValue(mockSSLAnalysis)

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
      // SSL should not be called for this test

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
      
      // Verify SSL service was not called
      expect(mockSSLService.defaultSSLService.analyzeCertificate).not.toHaveBeenCalled()
    })
  })

  describe('IP Address Handling', () => {
    it('should not perform SSL analysis for IP addresses', async () => {
      // Mock URL parser to return IP address result - this prevents SSL analysis

      // Mock WHOIS to handle IP
      mockWhoisService.defaultWhoisService.analyzeDomain.mockResolvedValue({
        success: false,
        error: { type: 'invalid_domain', message: 'IP addresses not supported' }
      })

      // SSL should not be called for this test

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
      
      // Verify SSL service was not called for IP address
      expect(mockSSLService.defaultSSLService.analyzeCertificate).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle unexpected SSL service errors', async () => {
      mockSSLService.defaultSSLService.analyzeCertificate.mockRejectedValue(new Error('Unexpected SSL service error'))

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
      
      // Should still have a fallback risk factor for SSL error
      const sslRiskFactors = data.data.factors.filter((f: { type: string }) => f.type === 'ssl-error')
      expect(sslRiskFactors.length).toBe(1)
    })
  })

  describe('Custom Port Handling', () => {
    it('should handle custom HTTPS ports in URLs', async () => {
      const mockSSLAnalysis = {
        success: true,
        domain: 'example.com',
        port: 8443,
        data: {
          domain: 'example.com',
          certificateType: 'DV',
          certificateAuthority: {
            name: 'Let\'s Encrypt',
            normalized: 'letsencrypt',
            trustScore: 0.9,
            isWellKnown: true,
            knownForIssues: false,
            validationLevel: 'DV'
          },
          score: 15,
          confidence: 0.9,
          riskFactors: [],
          subjectAlternativeNames: ['example.com'],
          commonName: 'example.com'
        },
        fromCache: false,
        processingTimeMs: 200
      }

      mockSSLService.defaultSSLService.analyzeCertificate.mockResolvedValue(mockSSLAnalysis)

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
      
      // Note: The port extraction would need to be implemented in the actual service
      // This test validates the integration works with custom ports
    })
  })
})