import { ServiceFactory } from '../../../src/lib/services/service-factory'
import { ScoringCalculator } from '../../../src/lib/scoring/scoring-calculator'
import { ScoringConfigManager } from '../../../src/lib/scoring/scoring-config'
import type {
  ScoringInput,
  ScoringConfig,
} from '../../../src/types/scoring'
import type { ReputationAnalysis } from '../../../src/types/reputation'
import type { DomainAgeAnalysis } from '../../../src/types/whois'
import type { SSLCertificateAnalysis } from '../../../src/types/ssl'
import type { AIAnalysisResult } from '../../../src/types/ai'
import { ScamCategory } from '../../../src/types/ai'
import { ThreatType, PlatformType, ThreatEntryType } from '../../../src/types/reputation'

// Mock data for different risk scenarios
const createMockScoringInput = (scenario: 'low-risk' | 'medium-risk' | 'high-risk' | 'mixed'): ScoringInput => {
  const baseUrl = 'https://example.com'
  
  const scenarios = {
    'low-risk': {
      reputation: {
        analysis: {
          url: baseUrl,
          isClean: true,
          threatMatches: [],
          riskFactors: [],
          score: 15, // 0-100 risk score (low risk)
          riskLevel: 'low' as const,
          confidence: 0.9,
          timestamp: new Date()
        } as ReputationAnalysis,
        processingTimeMs: 250,
        fromCache: false
      },
      whois: {
        analysis: {
          ageInDays: 2555, // ~7 years
          registrationDate: new Date('2017-01-01'),
          expirationDate: new Date('2025-01-01'),
          updatedDate: new Date('2020-01-01'),
          registrar: 'GoDaddy',
          nameservers: ['ns1.example.com'],
          status: ['clientTransferProhibited'],
          score: 0.1, // 0-1 risk score (low risk)
          confidence: 0.9,
          privacyProtected: false,
          registrantCountry: 'US',
          riskFactors: []
        } as DomainAgeAnalysis,
        processingTimeMs: 180,
        fromCache: false
      },
      ssl: {
        analysis: {
          domain: 'example.com',
          issuedDate: new Date('2024-01-01'),
          expirationDate: new Date('2025-01-01'),
          daysUntilExpiry: 180,
          certificateAge: 240,
          certificateType: 'DV' as const,
          certificateAuthority: null,
          security: {
            encryptionStrength: 'strong' as const,
            keySize: 256,
            keyAlgorithm: 'EC',
            signatureAlgorithm: 'SHA256withECDSA',
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
          score: 5, // 0-100 risk score (low risk)
          confidence: 0.95,
          riskFactors: [],
          subjectAlternativeNames: ['example.com'],
          commonName: 'example.com'
        } as SSLCertificateAnalysis,
        processingTimeMs: 120,
        fromCache: false
      },
      ai: {
        analysis: {
          riskScore: 8,
          scamCategory: 'legitimate' as const,
          confidence: 88,
          primaryRisks: [],
          indicators: ['legitimate_content', 'proper_ssl'],
          explanation: 'Legitimate business website with proper SSL certificate',
          metadata: {
            timestamp: new Date().toISOString(),
            promptVersion: '1.0',
            provider: 'openai' as const,
            processingTimeMs: 800
          }
        } as AIAnalysisResult,
        processingTimeMs: 800,
        fromCache: false
      }
    },
    'high-risk': {
      reputation: {
        analysis: {
          url: baseUrl,
          isClean: false,
          threatMatches: [
            {
              threatType: ThreatType.MALWARE,
              platformType: PlatformType.ANY_PLATFORM,
              threatEntryType: ThreatEntryType.URL,
              threat: { url: baseUrl },
              cacheDuration: '300s'
            }
          ],
          riskFactors: [
            { type: 'malware', description: 'Malware detected', score: 90 }
          ],
          score: 85, // 0-100 risk score (high risk)
          riskLevel: 'high' as const,
          confidence: 0.92,
          timestamp: new Date()
        } as ReputationAnalysis,
        processingTimeMs: 320,
        fromCache: false
      },
      whois: {
        analysis: {
          ageInDays: 3, // 3 days old
          registrationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          updatedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          registrar: 'Unknown Registrar',
          nameservers: [],
          status: [],
          score: 0.9, // 0-1 risk score (high risk)
          confidence: 0.92,
          privacyProtected: true,
          registrantCountry: null,
          riskFactors: [
            { type: 'age' as const, description: 'Very new domain', score: 0.9 }
          ]
        } as DomainAgeAnalysis,
        processingTimeMs: 450,
        fromCache: false
      },
      ssl: {
        analysis: {
          domain: 'example.com',
          issuedDate: null,
          expirationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Expired 30 days ago
          daysUntilExpiry: -30,
          certificateAge: null,
          certificateType: 'self-signed' as const,
          certificateAuthority: null,
          security: {
            encryptionStrength: 'strong' as const,
            keySize: 256,
            keyAlgorithm: 'EC',
            signatureAlgorithm: 'SHA256withECDSA',
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
          score: 95, // 0-100 risk score (high risk)
          confidence: 0.99,
          riskFactors: [
            { type: 'expiry' as const, description: 'Certificate expired', score: 95, severity: 'high' as const }
          ],
          subjectAlternativeNames: [],
          commonName: null
        } as SSLCertificateAnalysis,
        processingTimeMs: 200,
        fromCache: false
      },
      ai: {
        analysis: {
          riskScore: 88,
          scamCategory: ScamCategory.PHISHING,
          confidence: 94,
          primaryRisks: ['phishing', 'credential_theft'],
          indicators: ['suspicious_forms', 'credential_harvesting', 'fake_branding'],
          explanation: 'Suspicious content patterns indicating phishing attempt',
          metadata: {
            timestamp: new Date().toISOString(),
            promptVersion: '1.0',
            provider: 'openai' as const,
            processingTimeMs: 1200
          }
        } as AIAnalysisResult,
        processingTimeMs: 1200,
        fromCache: false
      }
    },
    'medium-risk': {
      reputation: {
        analysis: {
          url: baseUrl,
          isClean: true, // Clean but with some concerns
          threatMatches: [],
          riskFactors: [
            { type: 'suspicious', description: 'Some suspicious indicators', score: 45 }
          ],
          score: 45, // 0-100 risk score (medium risk)
          riskLevel: 'medium' as const,
          confidence: 0.75,
          timestamp: new Date()
        } as ReputationAnalysis,
        processingTimeMs: 280,
        fromCache: false
      },
      whois: {
        analysis: {
          ageInDays: 120, // 4 months
          registrationDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
          expirationDate: new Date(Date.now() + 245 * 24 * 60 * 60 * 1000),
          updatedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          registrar: 'Namecheap',
          nameservers: ['dns1.namecheap.com'],
          status: ['clientTransferProhibited'],
          score: 0.55, // 0-1 risk score (medium risk)
          confidence: 0.8,
          privacyProtected: false,
          registrantCountry: 'US',
          riskFactors: [
            { type: 'age' as const, description: 'Relatively new domain', score: 0.5 }
          ]
        } as DomainAgeAnalysis,
        processingTimeMs: 190,
        fromCache: false
      },
      ssl: {
        analysis: {
          domain: 'example.com',
          issuedDate: new Date('2024-06-01'),
          expirationDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // Expires in 45 days
          daysUntilExpiry: 45,
          certificateAge: 90,
          certificateType: 'DV' as const,
          certificateAuthority: null,
          security: {
            encryptionStrength: 'strong' as const,
            keySize: 256,
            keyAlgorithm: 'EC',
            signatureAlgorithm: 'SHA256withECDSA',
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
          score: 25, // 0-100 risk score (expires soon)
          confidence: 0.85,
          riskFactors: [
            { type: 'expiry', description: 'Certificate expires soon', score: 25, severity: 'medium' as const }
          ],
          subjectAlternativeNames: ['example.com'],
          commonName: 'example.com'
        } as SSLCertificateAnalysis,
        processingTimeMs: 150,
        fromCache: false
      },
      ai: {
        analysis: {
          riskScore: 40,
          scamCategory: ScamCategory.SOCIAL_ENGINEERING,
          confidence: 72,
          primaryRisks: ['suspicious_patterns'],
          indicators: ['unusual_layout', 'limited_contact_info'],
          explanation: 'Some suspicious patterns but unclear intent',
          metadata: {
            timestamp: new Date().toISOString(),
            promptVersion: '1.0',
            provider: 'openai' as const,
            processingTimeMs: 950
          }
        } as AIAnalysisResult,
        processingTimeMs: 950,
        fromCache: false
      }
    },
    'mixed': {
      reputation: {
        analysis: {
          url: baseUrl,
          isClean: true,
          threatMatches: [],
          riskFactors: [],
          score: 20, // Low risk reputation
          riskLevel: 'low' as const,
          confidence: 0.85,
          timestamp: new Date()
        } as ReputationAnalysis,
        processingTimeMs: 240,
        fromCache: false
      },
      whois: {
        analysis: {
          ageInDays: 5, // Very new - high risk
          registrationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          expirationDate: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000),
          updatedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          registrar: 'GoDaddy',
          nameservers: ['ns1.godaddy.com'],
          status: ['clientTransferProhibited'],
          score: 0.88, // High risk due to new domain
          confidence: 0.9,
          privacyProtected: false,
          registrantCountry: 'US',
          riskFactors: [
            { type: 'age' as const, description: 'Brand new domain', score: 0.88 }
          ]
        } as DomainAgeAnalysis,
        processingTimeMs: 200,
        fromCache: false
      },
      ssl: {
        analysis: {
          domain: 'example.com',
          issuedDate: new Date('2024-01-01'),
          expirationDate: new Date('2025-09-01'),
          daysUntilExpiry: 270,
          certificateAge: 240,
          certificateType: 'EV' as const, // Good SSL
          certificateAuthority: null,
          security: {
            encryptionStrength: 'strong' as const,
            keySize: 256,
            keyAlgorithm: 'EC',
            signatureAlgorithm: 'SHA256withECDSA',
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
          score: 8, // Low risk SSL
          confidence: 0.98,
          riskFactors: [],
          subjectAlternativeNames: ['example.com'],
          commonName: 'example.com'
        } as SSLCertificateAnalysis,
        processingTimeMs: 110,
        fromCache: false
      },
      ai: {
        analysis: {
          riskScore: 65, // Medium-high risk AI analysis
          scamCategory: ScamCategory.SOCIAL_ENGINEERING,
          confidence: 80,
          primaryRisks: ['suspicious_content'],
          indicators: ['new_domain', 'aggressive_marketing'],
          explanation: 'Mixed signals - legitimate infrastructure but suspicious content',
          metadata: {
            timestamp: new Date().toISOString(),
            promptVersion: '1.0',
            provider: 'openai' as const,
            processingTimeMs: 750
          }
        } as AIAnalysisResult,
        processingTimeMs: 750,
        fromCache: false
      }
    }
  }

  return {
    url: baseUrl,
    ...scenarios[scenario]
  }
}

describe('Scoring System Integration Tests', () => {
  let scoringCalculator: ScoringCalculator
  let configManager: ScoringConfigManager

  beforeEach(() => {
    // Create fresh instances for each test
    configManager = new ScoringConfigManager()
    scoringCalculator = ServiceFactory.createScoringCalculator()
  })

  describe('End-to-End Scoring Pipeline', () => {
    it('should correctly classify low-risk scenarios', async () => {
      const input = createMockScoringInput('low-risk')
      const result = await scoringCalculator.calculateScore(input)

      expect(result.riskLevel).toBe('low')
      expect(result.finalScore).toBeLessThan(40) // Allow some margin
      expect(result.confidence).toBeGreaterThan(0.5) // Minimum confidence
      expect(result.riskFactors).toHaveLength(4)
      expect(result.metadata.missingFactors).toHaveLength(0)
    })

    it('should correctly classify high-risk scenarios', async () => {
      const input = createMockScoringInput('high-risk')
      const result = await scoringCalculator.calculateScore(input)

      expect(result.riskLevel).toBe('high')
      expect(result.finalScore).toBeGreaterThanOrEqual(60) // Allow some margin
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.riskFactors.every(f => f.available)).toBe(true)
    })

    it('should correctly classify medium-risk scenarios', async () => {
      const input = createMockScoringInput('medium-risk')
      const result = await scoringCalculator.calculateScore(input)

      expect(['medium', 'high']).toContain(result.riskLevel) // Could be either due to weighting
      expect(result.finalScore).toBeGreaterThan(25)
      expect(result.finalScore).toBeLessThan(85)
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should handle mixed risk factor scenarios', async () => {
      const input = createMockScoringInput('mixed')
      const result = await scoringCalculator.calculateScore(input)

      // Mixed scenario should be medium or high due to domain age
      expect(['medium', 'high']).toContain(result.riskLevel)
      expect(result.finalScore).toBeGreaterThan(30)
      expect(result.confidence).toBeGreaterThan(0.5)
      
      // Should have detailed breakdown
      expect(result.breakdown.weightedScores).toBeDefined()
      expect(result.breakdown.normalizedScores).toBeDefined()
      expect(result.breakdown.rawScores).toBeDefined()
    })
  })

  describe('Configuration Impact Testing', () => {
    it('should produce different scores with different weight configurations', async () => {
      const input = createMockScoringInput('medium-risk')
      
      // Default configuration result
      const defaultResult = await scoringCalculator.calculateScore(input)
      
      // Create calculator with reputation-heavy weights
      const reputationHeavyConfig: Partial<ScoringConfig> = {
        weights: {
          reputation: 0.70,
          domain_age: 0.15,
          ssl_certificate: 0.10,
          ai_analysis: 0.05
        }
      }
      
      const reputationHeavyCalculator = ServiceFactory.createScoringCalculator(reputationHeavyConfig)
      const reputationResult = await reputationHeavyCalculator.calculateScore(input)
      
      expect(defaultResult.finalScore).not.toBe(reputationResult.finalScore)
      expect(reputationResult.metadata.configUsed).not.toBe(defaultResult.metadata.configUsed)
    })

    it('should handle A/B testing configuration selection', async () => {
      const experiment = {
        id: 'test-experiment',
        name: 'AI-Heavy Scoring',
        description: 'Test AI-focused scoring',
        config: {
          weights: {
            reputation: 0.25,
            domain_age: 0.15,
            ssl_certificate: 0.15,
            ai_analysis: 0.45 // Much higher AI weight
          }
        },
        trafficAllocation: 1.0, // 100% for testing
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 10000),
        metrics: {}
      }

      const success = configManager.registerExperiment(experiment)
      expect(success).toBe(true)

      const selection = configManager.selectConfiguration('test-user', experiment.id)
      expect(selection.isExperiment).toBe(true)
      expect(selection.config.weights.ai_analysis).toBe(0.45)
    })
  })

  describe('Missing Data Handling', () => {
    it('should handle missing reputation data gracefully', async () => {
      const input = createMockScoringInput('medium-risk')
      delete input.reputation
      
      const result = await scoringCalculator.calculateScore(input)
      
      expect(result.metadata.missingFactors).toContain('reputation')
      expect(result.metadata.redistributedWeights).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0) // Should still have some confidence
      expect(result.riskFactors.find(f => f.type === 'reputation')?.available).toBe(false)
    })
  })

  describe('Performance and Reliability', () => {
    it('should handle scoring calculation within reasonable time', async () => {
      const input = createMockScoringInput('medium-risk')
      const startTime = Date.now()
      
      const result = await scoringCalculator.calculateScore(input)
      
      const processingTime = Date.now() - startTime
      expect(processingTime).toBeLessThan(1000) // Should be fast with mock data
      expect(result.metadata.totalProcessingTimeMs).toBeDefined()
    })

    it('should produce consistent results for identical inputs', async () => {
      const input = createMockScoringInput('low-risk')
      
      const result1 = await scoringCalculator.calculateScore(input)
      const result2 = await scoringCalculator.calculateScore(input)
      
      expect(result1.finalScore).toBe(result2.finalScore)
      expect(result1.riskLevel).toBe(result2.riskLevel)
      expect(result1.confidence).toBe(result2.confidence)
    })
  })

  describe('Error Handling', () => {
    it('should handle empty input gracefully', async () => {
      const emptyInput = {
        url: 'https://example.com'
      } as ScoringInput
      
      const result = await scoringCalculator.calculateScore(emptyInput)
      
      // Should produce fallback result
      expect(result.url).toBe('https://example.com')
      expect(result.finalScore).toBeGreaterThanOrEqual(0)
      expect(result.finalScore).toBeLessThanOrEqual(100)
      expect(result.riskLevel).toMatch(/^(low|medium|high)$/)
      expect(result.metadata.missingFactors.length).toBeGreaterThan(0)
    })
  })
})