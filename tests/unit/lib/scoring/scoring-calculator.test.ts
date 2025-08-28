import { ScoringCalculator } from '../../../../src/lib/scoring/scoring-calculator'
import type {
  ScoringInput,
  ScoringConfig
} from '../../../../src/types/scoring'
import { ScamCategory, AIProvider } from '../../../../src/types/ai'
import { ThreatType, PlatformType, ThreatEntryType } from '../../../../src/types/reputation'

// Mock dependencies
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
    Logger: jest.fn().mockImplementation(() => mockInstance)
  }
})

describe('ScoringCalculator', () => {
  let scoringCalculator: ScoringCalculator

  beforeEach(() => {
    jest.clearAllMocks()
    scoringCalculator = new ScoringCalculator()
  })

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const calculator = new ScoringCalculator()
      expect(calculator).toBeInstanceOf(ScoringCalculator)
    })

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<ScoringConfig> = {
        weights: {
          reputation: 0.5,
          domain_age: 0.2,
          ssl_certificate: 0.2,
          ai_analysis: 0.1
        }
      }
      const calculator = new ScoringCalculator(customConfig)
      expect(calculator).toBeInstanceOf(ScoringCalculator)
    })
  })

  describe('calculateScore', () => {
    it('should calculate score with all factors available', async () => {
      const input: ScoringInput = {
        url: 'https://example.com',
        reputation: {
          analysis: {
            url: 'https://example.com',
            isClean: true,
            threatMatches: [],
            riskFactors: [{
              type: 'reputation-clean',
              score: 0,
              description: 'Clean URL'
            }],
            score: 10,
            riskLevel: 'low',
            confidence: 0.95,
            timestamp: new Date()
          },
          processingTimeMs: 1000,
          fromCache: false
        },
        whois: {
          analysis: {
            ageInDays: 365,
            registrationDate: new Date('2023-01-01'),
            expirationDate: new Date('2025-01-01'),
            updatedDate: new Date('2023-06-01'),
            registrar: 'Test Registrar',
            nameservers: ['ns1.example.com', 'ns2.example.com'],
            status: ['clientTransferProhibited'],
            score: 20,
            confidence: 0.8,
            privacyProtected: false,
            registrantCountry: 'US',
            riskFactors: [
              { type: 'age', description: 'Domain age is reasonable', score: 20 }
            ]
          },
          processingTimeMs: 2000,
          fromCache: false
        },
        ssl: {
          analysis: {
            domain: 'example.com',
            issuedDate: new Date('2023-01-01'),
            expirationDate: new Date('2024-01-01'),
            daysUntilExpiry: 100,
            certificateAge: 265,
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
              signatureAlgorithm: 'SHA-256',
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
            confidence: 0.9,
            riskFactors: [],
            subjectAlternativeNames: ['example.com'],
            commonName: 'example.com'
          },
          processingTimeMs: 3000,
          fromCache: false
        },
        ai: {
          analysis: {
            riskScore: 25,
            confidence: 85,
            primaryRisks: [],
            scamCategory: ScamCategory.LEGITIMATE as const,
            indicators: ['legitimate content'],
            explanation: 'Appears to be legitimate',
            metadata: {
              timestamp: new Date().toISOString(),
              promptVersion: '1.0',
              provider: AIProvider.OPENAI as const,
              processingTimeMs: 4000
            }
          },
          processingTimeMs: 4000,
          fromCache: false
        }
      }

      const result = await scoringCalculator.calculateScore(input)

      expect(result).toEqual(expect.objectContaining({
        url: 'https://example.com',
        finalScore: expect.any(Number),
        riskLevel: expect.stringMatching(/^(low|medium|high)$/),
        confidence: expect.any(Number),
        riskFactors: expect.arrayContaining([
          expect.objectContaining({
            type: expect.stringMatching(/^(reputation|domain_age|ssl_certificate|ai_analysis)$/),
            score: expect.any(Number),
            confidence: expect.any(Number),
            available: true
          })
        ]),
        metadata: expect.objectContaining({
          totalProcessingTimeMs: expect.any(Number),
          configUsed: expect.any(String),
          missingFactors: expect.any(Array),
          timestamp: expect.any(Date)
        })
      }))

      // Score should be relatively low for this legitimate input
      expect(result.finalScore).toBeLessThan(50)
      expect(result.riskLevel).toMatch(/^(low|medium)$/) // Can be low or medium depending on scoring
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should handle missing factors with default strategy', async () => {
      const input: ScoringInput = {
        url: 'https://example.com',
        reputation: {
          analysis: {
            url: 'https://example.com',
            isClean: false,
            threatMatches: [{ threatType: ThreatType.MALWARE, platformType: PlatformType.WINDOWS, threatEntryType: ThreatEntryType.URL, threat: { url: 'https://example.com' }, cacheDuration: '300s' }],
            riskFactors: [{
              type: 'reputation-malware',
              score: 90,
              description: 'Malware detected'
            }],
            score: 90,
            riskLevel: 'high',
            confidence: 0.98,
            timestamp: new Date()
          },
          processingTimeMs: 1000,
          fromCache: false
        }
        // Only reputation factor provided - others missing
      }

      const result = await scoringCalculator.calculateScore(input)

      expect(result.finalScore).toBeGreaterThan(50) // Should be high due to malware
      expect(result.metadata.missingFactors).toHaveLength(3) // whois, ssl, ai missing
      expect(result.confidence).toBeLessThan(0.8) // Lower confidence due to missing factors
    })

    it('should calculate high risk score for malicious input', async () => {
      const input: ScoringInput = {
        url: 'https://malicious-site.com',
        reputation: {
          analysis: {
            url: 'https://malicious-site.com',
            isClean: false,
            threatMatches: [
              { threatType: ThreatType.MALWARE, platformType: PlatformType.WINDOWS, threatEntryType: ThreatEntryType.URL, threat: { url: 'https://example.com' }, cacheDuration: '300s' },
              { threatType: ThreatType.SOCIAL_ENGINEERING, platformType: PlatformType.ANDROID, threatEntryType: ThreatEntryType.URL, threat: { url: 'https://example.com' }, cacheDuration: '300s' }
            ],
            riskFactors: [
              {
                type: 'reputation-malware',
                score: 95,
                description: 'Multiple threats detected'
              }
            ],
            score: 95,
            riskLevel: 'high',
            confidence: 0.99,
            timestamp: new Date()
          },
          processingTimeMs: 1000,
          fromCache: false
        },
        whois: {
          analysis: {
            ageInDays: 5, // Very new domain
            registrationDate: new Date(),
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            updatedDate: new Date(),
            registrar: 'Suspicious Registrar',
            nameservers: ['ns1.suspicious.com'],
            status: ['ok'],
            score: 80,
            confidence: 0.9,
            privacyProtected: true,
            registrantCountry: null,
            riskFactors: [
              { type: 'age', description: 'Domain is very new', score: 80 }
            ]
          },
          processingTimeMs: 2000,
          fromCache: false
        }
      }

      const result = await scoringCalculator.calculateScore(input)

      expect(result.finalScore).toBeGreaterThan(70)
      expect(result.riskLevel).toBe('high')
    })

    it('should return fallback result on error', async () => {
      // Create input that would cause an error
      const input: ScoringInput = {
        url: 'invalid-url'
        // No analysis data provided
      }

      const result = await scoringCalculator.calculateScore(input)

      expect(result.finalScore).toBe(50) // Fallback medium risk
      expect(result.riskLevel).toBe('medium')
      expect(result.confidence).toBe(0.5) // Minimum confidence fallback
    })
  })

  describe('Risk Level Determination', () => {
    it('should classify very low scores as low risk', async () => {
      const input: ScoringInput = {
        url: 'https://test.com',
        reputation: {
          analysis: {
            url: 'https://test.com',
            isClean: true,
            threatMatches: [],
            riskFactors: [{
              type: 'reputation-clean',
              score: 5,
              description: 'Very low risk'
            }],
            score: 5,
            riskLevel: 'low',
            confidence: 0.95,
            timestamp: new Date()
          },
          processingTimeMs: 1000,
          fromCache: false
        }
      }

      const result = await scoringCalculator.calculateScore(input)
      expect(result.finalScore).toBeLessThan(40)
      expect(result.riskLevel).toBe('low')
    })

    it('should classify high scores as high risk', async () => {
      const input: ScoringInput = {
        url: 'https://malicious.com',
        reputation: {
          analysis: {
            url: 'https://malicious.com',
            isClean: false,
            threatMatches: [{ threatType: ThreatType.MALWARE, platformType: PlatformType.ANY_PLATFORM, threatEntryType: ThreatEntryType.URL, threat: { url: 'https://example.com' }, cacheDuration: '300s' }],
            riskFactors: [{
              type: 'reputation-malware',
              score: 95,
              description: 'High risk detected'
            }],
            score: 95,
            riskLevel: 'high',
            confidence: 0.98,
            timestamp: new Date()
          },
          processingTimeMs: 1000,
          fromCache: false
        }
      }

      const result = await scoringCalculator.calculateScore(input)
      expect(result.finalScore).toBeGreaterThan(70)
      expect(result.riskLevel).toBe('high')
    })

    it('should classify medium scores as medium risk', async () => {
      const input: ScoringInput = {
        url: 'https://suspicious.com',
        reputation: {
          analysis: {
            url: 'https://suspicious.com',
            isClean: false,
            threatMatches: [{ threatType: ThreatType.UNWANTED_SOFTWARE, platformType: PlatformType.ANY_PLATFORM, threatEntryType: ThreatEntryType.URL, threat: { url: 'https://example.com' }, cacheDuration: '300s' }],
            riskFactors: [{
              type: 'reputation-suspicious',
              score: 50,
              description: 'Medium risk detected'
            }],
            score: 50,
            riskLevel: 'medium',
            confidence: 0.8,
            timestamp: new Date()
          },
          processingTimeMs: 1000,
          fromCache: false
        }
      }

      const result = await scoringCalculator.calculateScore(input)
      expect(result.finalScore).toBeGreaterThan(30)
      expect(result.finalScore).toBeLessThan(80)
      expect(result.riskLevel).toBe('medium')
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration successfully', () => {
      const newConfig: Partial<ScoringConfig> = {
        weights: {
          reputation: 0.5,
          domain_age: 0.3,
          ssl_certificate: 0.1,
          ai_analysis: 0.1
        },
        thresholds: {
          lowRiskMax: 25,
          mediumRiskMax: 75,
          highRiskMin: 76
        }
      }

      const success = scoringCalculator.updateConfiguration(newConfig)
      expect(success).toBe(true)
    })

    it('should reject invalid configuration', () => {
      const invalidConfig: Partial<ScoringConfig> = {
        weights: {
          reputation: 1.5, // Invalid - exceeds max weight
          domain_age: 0.0,
          ssl_certificate: 0.0,
          ai_analysis: 0.0
        }
      }

      const success = scoringCalculator.updateConfiguration(invalidConfig)
      expect(success).toBe(false)
    })
  })

  describe('Statistics', () => {
    it('should return default statistics when no calculations performed', () => {
      const stats = scoringCalculator.getStatistics()
      
      expect(stats).toEqual({
        totalScores: 0,
        averageProcessingTime: 0,
        scoreDistribution: { low: 0, medium: 0, high: 0 },
        factorAvailability: {
          reputation: 0,
          domain_age: 0,
          ssl_certificate: 0,
          ai_analysis: 0,
          technical_indicators: 0
        },
        confidenceDistribution: { high: 0, medium: 0, low: 0 }
      })
    })

    it('should track statistics after calculations', async () => {
      const input: ScoringInput = {
        url: 'https://example.com',
        reputation: {
          analysis: {
            url: 'https://example.com',
            isClean: true,
            threatMatches: [],
            riskFactors: [],
            score: 10,
            riskLevel: 'low',
            confidence: 0.9,
            timestamp: new Date()
          },
          processingTimeMs: 1000,
          fromCache: false
        }
      }

      await scoringCalculator.calculateScore(input)
      await scoringCalculator.calculateScore(input)

      const stats = scoringCalculator.getStatistics()
      
      expect(stats.totalScores).toBe(2)
      expect(stats.averageProcessingTime).toBeGreaterThan(0)
      expect(stats.factorAvailability.reputation).toBe(100) // 100% availability
      expect(stats.factorAvailability.domain_age).toBe(0) // 0% availability
    })
  })

  describe('Memory Management', () => {
    it('should clear history when requested', async () => {
      const input: ScoringInput = {
        url: 'https://example.com',
        reputation: {
          analysis: {
            url: 'https://example.com',
            isClean: true,
            threatMatches: [],
            riskFactors: [],
            score: 10,
            riskLevel: 'low',
            confidence: 0.9,
            timestamp: new Date()
          },
          processingTimeMs: 1000,
          fromCache: false
        }
      }

      await scoringCalculator.calculateScore(input)
      
      let stats = scoringCalculator.getStatistics()
      expect(stats.totalScores).toBe(1)

      scoringCalculator.clearHistory()
      
      stats = scoringCalculator.getStatistics()
      expect(stats.totalScores).toBe(0)
    })
  })

  describe('Domain Age Processing', () => {
    it('should handle null domain age gracefully', async () => {
      const input: ScoringInput = {
        url: 'https://example.com',
        whois: {
          analysis: {
            ageInDays: null, // Test null age
            registrationDate: null,
            expirationDate: null,
            updatedDate: null,
            registrar: 'Test Registrar',
            nameservers: [],
            status: [],
            score: 50,
            confidence: 0.5,
            privacyProtected: false,
            registrantCountry: null,
            riskFactors: []
          },
          processingTimeMs: 2000,
          fromCache: false
        }
      }

      const result = await scoringCalculator.calculateScore(input)
      
      expect(result.finalScore).toBeDefined()
      expect(result.riskFactors.some(f => f.type === 'domain_age')).toBe(true)
    })

    it('should properly score very new domains as high risk', async () => {
      const input: ScoringInput = {
        url: 'https://brand-new-site.com',
        whois: {
          analysis: {
            ageInDays: 1, // 1 day old
            registrationDate: new Date(),
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            updatedDate: new Date(),
            registrar: 'Test Registrar',
            nameservers: ['ns1.brand-new-site.com'],
            status: ['ok'],
            score: 85,
            confidence: 0.9,
            privacyProtected: false,
            registrantCountry: 'US',
            riskFactors: [
              { type: 'age', description: 'Domain is very new', score: 85 }
            ]
          },
          processingTimeMs: 2000,
          fromCache: false
        }
      }

      const result = await scoringCalculator.calculateScore(input)
      
      const domainAgeFactor = result.riskFactors.find(f => f.type === 'domain_age')
      expect(domainAgeFactor?.score).toBeGreaterThan(70) // Should be high risk
    })
  })

  describe('AI Analysis Processing', () => {
    it('should handle AI analysis with riskScore', async () => {
      const input: ScoringInput = {
        url: 'https://example.com',
        ai: {
          analysis: {
            riskScore: 30,
            confidence: 85,
            primaryRisks: ['low risk content'],
            scamCategory: ScamCategory.LEGITIMATE as const,
            indicators: [],
            explanation: 'Low risk',
            metadata: {
              timestamp: new Date().toISOString(),
              promptVersion: '1.0',
              provider: AIProvider.OPENAI as const,
              processingTimeMs: 1000
            }
          },
          processingTimeMs: 1000,
          fromCache: false
        }
      }

      const result = await scoringCalculator.calculateScore(input)
      
      const aiFactor = result.riskFactors.find(f => f.type === 'ai_analysis')
      expect(aiFactor?.available).toBe(true)
      expect(aiFactor?.score).toBeDefined()
    })

    it('should handle AI analysis without riskScore (using category)', async () => {
      const input: ScoringInput = {
        url: 'https://phishing-site.com',
        ai: {
          analysis: {
            riskScore: 0, // No risk score, should use category
            confidence: 90,
            primaryRisks: ['phishing indicators'],
            scamCategory: ScamCategory.PHISHING as const,
            indicators: ['suspicious links'],
            explanation: 'Phishing detected',
            metadata: {
              timestamp: new Date().toISOString(),
              promptVersion: '1.0',
              provider: AIProvider.OPENAI as const,
              processingTimeMs: 1000
            }
          },
          processingTimeMs: 1000,
          fromCache: false
        }
      }

      const result = await scoringCalculator.calculateScore(input)
      
      const aiFactor = result.riskFactors.find(f => f.type === 'ai_analysis')
      expect(aiFactor?.available).toBe(true)
      expect(aiFactor?.score).toBeGreaterThan(70) // Should be high for phishing
    })
  })
})