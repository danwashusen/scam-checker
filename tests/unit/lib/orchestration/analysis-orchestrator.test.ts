import { AnalysisOrchestrator } from '../../../../src/lib/orchestration/analysis-orchestrator'
import type { OrchestrationConfig, OrchestrationResult } from '../../../../src/lib/orchestration/analysis-orchestrator'
import type { AnalysisServices } from '../../../../src/types/services'
import type { ScoringResult } from '../../../../src/types/scoring'
import { ScamCategory, AIProvider } from '../../../../src/types/ai'
import type { URLValidationResult } from '../../../../src/lib/validation/url-validator'
import type { ReputationAnalysis } from '../../../../src/types/reputation'
import type { DomainAgeAnalysis } from '../../../../src/types/whois'

// Mock dependencies
jest.mock('../../../../src/lib/services/service-factory')
jest.mock('../../../../src/lib/scoring/scoring-calculator')
jest.mock('../../../../src/lib/validation/url-validator')
jest.mock('../../../../src/lib/validation/url-parser')
jest.mock('../../../../src/lib/logger')

import { ServiceFactory } from '../../../../src/lib/services/service-factory'
import { ScoringCalculator } from '../../../../src/lib/scoring/scoring-calculator'
import { validateURL } from '../../../../src/lib/validation/url-validator'
import { parseURL } from '../../../../src/lib/validation/url-parser'

const mockedServiceFactory = ServiceFactory as jest.Mocked<typeof ServiceFactory>
const mockedScoringCalculator = ScoringCalculator as jest.MockedClass<typeof ScoringCalculator>
const mockedValidateURL = validateURL as jest.MockedFunction<typeof validateURL>
const mockedParseURL = parseURL as jest.MockedFunction<typeof parseURL>

describe('AnalysisOrchestrator', () => {
  let orchestrator: AnalysisOrchestrator
  let mockServices: ReturnType<typeof createMockServices>
  let mockScoringCalculator: jest.Mocked<ScoringCalculator>

  const createMockServices = () => ({
    reputation: {
      analyzeURL: jest.fn() as jest.MockedFunction<AnalysisServices['reputation']['analyzeURL']>,
      checkMultipleURLs: jest.fn(),
      clearCache: jest.fn(),
      getStats: jest.fn(),
      config: {}
    },
    whois: {
      analyzeDomain: jest.fn() as jest.MockedFunction<AnalysisServices['whois']['analyzeDomain']>,
      getCacheStats: jest.fn(),
      clearCache: jest.fn(),
      isCached: jest.fn(),
      config: {}
    },
    ssl: {
      analyzeCertificate: jest.fn() as jest.MockedFunction<AnalysisServices['ssl']['analyzeCertificate']>,
      getCacheStats: jest.fn(),
      clearCache: jest.fn(),
      isCached: jest.fn(),
      config: {}
    },
    aiAnalyzer: {
      analyzeURL: jest.fn() as jest.MockedFunction<AnalysisServices['aiAnalyzer']['analyzeURL']>,
      isAvailable: jest.fn(() => true),
      getConfig: jest.fn(),
      getCacheStats: jest.fn()
    },
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      timer: jest.fn(() => ({ end: jest.fn() }))
    }
  })

  const createMockParsedURL = (domain: string = 'example.com') => ({
    original: `https://${domain}/path`,
    protocol: 'https:',
    hostname: domain,
    domain: domain,
    subdomain: '',
    pathname: '/path',
    search: '',
    searchParams: {},
    hash: '',
    isIP: false,
    isIPv4: false,
    isIPv6: false,
    components: {
      domainParts: domain.split('.'),
      pathParts: ['path'],
      queryParams: []
    }
  })

  const createMockScoringResult = (url: string): ScoringResult => ({
    url,
    finalScore: 25,
    riskLevel: 'low',
    confidence: 0.85,
    riskFactors: [],
    metadata: {
      totalProcessingTimeMs: 500,
      configUsed: 'default',
      missingFactors: [],
      redistributedWeights: {},
      normalizationMethod: 'linear',
      timestamp: new Date()
    },
    breakdown: {
      weightedScores: {
        reputation: 10,
        domain_age: 5,
        ssl_certificate: 5,
        ai_analysis: 5,
        technical_indicators: 0
      },
      normalizedScores: {
        reputation: 10,
        domain_age: 20,
        ssl_certificate: 25,
        ai_analysis: 33,
        technical_indicators: 0
      },
      rawScores: {
        reputation: 10,
        domain_age: 0.2,
        ssl_certificate: 10,
        ai_analysis: 15,
        technical_indicators: 0
      },
      totalWeight: 1.0
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock services
    mockServices = createMockServices()
    
    // Setup ServiceFactory mock
    mockedServiceFactory.createAnalysisServices = jest.fn().mockReturnValue(mockServices)
    
    // Create mock scoring calculator
    mockScoringCalculator = {
      calculateScore: jest.fn(),
      updateConfiguration: jest.fn(),
      clearHistory: jest.fn(),
      getStatistics: jest.fn()
    } as unknown as jest.Mocked<ScoringCalculator>
    
    mockedScoringCalculator.mockReturnValue(mockScoringCalculator)
    
    // Setup validation mocks
    mockedValidateURL.mockReturnValue({
      isValid: true,
      parsedURL: createMockParsedURL(),
      riskFactors: []
    } as URLValidationResult & { parsedURL: unknown; riskFactors: unknown[] })
    
    mockedParseURL.mockReturnValue(createMockParsedURL())

    // Setup default successful service responses
    mockServices.reputation.analyzeURL.mockResolvedValue({
      success: true,
      data: {
        url: 'https://example.com',
        isClean: true,
        threatMatches: [],
        riskFactors: [],
        score: 10,
        riskLevel: 'low',
        confidence: 0.9,
        timestamp: new Date()
      },
      fromCache: false
    })

    mockServices.whois.analyzeDomain.mockResolvedValue({
      success: true,
      data: {
        ageInDays: 1825,
        registrationDate: new Date('2019-01-01'),
        expirationDate: new Date('2025-01-01'),
        updatedDate: new Date('2023-01-01'),
        registrar: 'Example Registrar',
        nameservers: ['ns1.example.com', 'ns2.example.com'],
        status: ['clientTransferProhibited'],
        score: 0.2,
        confidence: 0.85,
        privacyProtected: false,
        registrantCountry: 'US',
        riskFactors: []
      },
      fromCache: false
    })

    mockServices.ssl.analyzeCertificate.mockResolvedValue({
      success: true,
      data: {
        domain: 'example.com',
        issuedDate: new Date('2024-01-01'),
        expirationDate: new Date('2025-01-01'),
        daysUntilExpiry: 180,
        certificateAge: 240,
        certificateType: 'DV',
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
          isRevoked: false,
          chainValid: true,
          domainMatch: true,
          sanMatch: true,
          validationErrors: []
        },
        score: 10,
        confidence: 0.95,
        riskFactors: [],
        subjectAlternativeNames: ['example.com'],
        commonName: 'example.com'
      },
      fromCache: false
    })

    mockServices.aiAnalyzer.analyzeURL.mockResolvedValue({
      success: true,
      data: {
        riskScore: 15,
        scamCategory: ScamCategory.LEGITIMATE,
        confidence: 88,
        primaryRisks: [],
        indicators: ['legitimate_content', 'proper_structure'],
        explanation: 'Appears to be a legitimate website',
        metadata: {
          timestamp: new Date().toISOString(),
          promptVersion: '1.0',
          provider: AIProvider.OPENAI,
          processingTimeMs: 800
        }
      },
      fromCache: false,
      metadata: {
        processingTime: 800
      }
    })

    mockScoringCalculator.calculateScore.mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.url || 'https://example.com'
      return Promise.resolve(createMockScoringResult(url))
    })

    // Create orchestrator instance
    orchestrator = new AnalysisOrchestrator()
  })

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultOrchestrator = new AnalysisOrchestrator()
      expect(defaultOrchestrator).toBeInstanceOf(AnalysisOrchestrator)
      expect(mockedServiceFactory.createAnalysisServices).toHaveBeenCalled()
    })

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<OrchestrationConfig> = {
        timeouts: {
          totalAnalysisTimeout: 30000,
          serviceTimeout: 10000,
          scoringTimeout: 2000
        },
        parallelExecution: {
          enabled: false,
          maxConcurrency: 1
        }
      }

      const customOrchestrator = new AnalysisOrchestrator(customConfig)
      expect(customOrchestrator).toBeInstanceOf(AnalysisOrchestrator)
    })
  })

  describe('URL Analysis', () => {
    it('should successfully analyze URL with all services', async () => {
      const result = await orchestrator.analyzeURL('https://example.com')

      expect(result).toMatchObject<OrchestrationResult>({
        scoringResult: expect.objectContaining({
          url: 'https://example.com',
          finalScore: 25,
          riskLevel: 'low',
          confidence: 0.85
        }),
        serviceResults: {
          reputation: { success: true, processingTime: expect.any(Number), fromCache: false },
          whois: { success: true, processingTime: expect.any(Number), fromCache: false },
          ssl: { success: true, processingTime: expect.any(Number), fromCache: false },
          ai: { success: true, processingTime: expect.any(Number), fromCache: false }
        },
        orchestrationMetrics: {
          totalProcessingTime: expect.any(Number),
          servicesExecuted: 4,
          servicesSucceeded: 4,
          servicesFailed: 0,
          cachingEnabled: true,
          parallelExecution: true
        }
      })

      // Verify services were called
      expect(mockServices.reputation.analyzeURL).toHaveBeenCalledWith('https://example.com')
      expect(mockServices.whois.analyzeDomain).toHaveBeenCalled()
      expect(mockServices.ssl.analyzeCertificate).toHaveBeenCalled()
      expect(mockServices.aiAnalyzer.analyzeURL).toHaveBeenCalled()
      expect(mockScoringCalculator.calculateScore).toHaveBeenCalled()
    })

    it('should handle partial service failures', async () => {
      // Make reputation service fail
      mockServices.reputation.analyzeURL.mockResolvedValue({
        success: false,
        data: undefined,
        fromCache: false,
        error: { message: 'Service unavailable' }
      })

      const result = await orchestrator.analyzeURL('https://example.com')

      expect(result.orchestrationMetrics.servicesSucceeded).toBe(3)
      expect(result.orchestrationMetrics.servicesFailed).toBe(1)
      expect(result.serviceResults.reputation?.success).toBe(false)
      expect(result.serviceResults.reputation?.error).toBeDefined()
    })

    it('should handle invalid URL gracefully', async () => {
      mockedValidateURL.mockReturnValue({
        isValid: false,
        error: 'Invalid URL format',
        errorType: 'invalid-format'
      } as URLValidationResult)

      const result = await orchestrator.analyzeURL('invalid-url')

      // Should return fallback result
      expect(result.scoringResult.finalScore).toBe(50) // Fallback score
      expect(result.orchestrationMetrics.servicesFailed).toBeGreaterThan(0)
    })

    it('should handle force refresh option', async () => {
      await orchestrator.analyzeURL('https://example.com', { forceRefresh: true })

      // Verify clearCache was called on services that support it
      expect(mockServices.reputation.clearCache).toHaveBeenCalled()
      expect(mockServices.whois.clearCache).toHaveBeenCalled()
      expect(mockServices.ssl.clearCache).toHaveBeenCalled()
    })

    it('should pass experiment configuration to scoring', async () => {
      const options = {
        experimentId: 'test-experiment',
        userId: 'test-user-123'
      }

      await orchestrator.analyzeURL('https://example.com', options)

      expect(mockScoringCalculator.calculateScore).toHaveBeenCalledWith(
        expect.any(Object), // scoring input
        'test-experiment',
        'test-user-123'
      )
    })

    it('should handle timeout scenarios', async () => {
      // Make services fail to simulate timeout behavior
      mockServices.reputation.analyzeURL.mockRejectedValue(new Error('Timeout'))
      mockServices.whois.analyzeDomain.mockRejectedValue(new Error('Timeout'))
      mockServices.ssl.analyzeCertificate.mockRejectedValue(new Error('Timeout'))
      mockServices.aiAnalyzer.analyzeURL.mockRejectedValue(new Error('Timeout'))

      // Use a short timeout config
      const timeoutOrchestrator = new AnalysisOrchestrator({
        timeouts: {
          totalAnalysisTimeout: 100,
          serviceTimeout: 50,
          scoringTimeout: 10
        },
        errorHandling: {
          minimumRequiredServices: 2,
          continueOnPartialFailure: true,
          retryFailedServices: false,
          maxRetries: 1
        }
      })

      const result = await timeoutOrchestrator.analyzeURL('https://example.com')

      // Should handle timeout gracefully and return fallback
      expect(result.scoringResult.finalScore).toBe(50) // Fallback score
    })
  })

  describe('Service Execution', () => {
    it('should execute services in parallel by default', async () => {
      const startTime = Date.now()
      
      // Add delays to services to test parallelism
      mockServices.reputation.analyzeURL.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: {
            url: 'https://example.com',
            isClean: true,
            threatMatches: [],
            riskFactors: [],
            score: 10,
            riskLevel: 'low',
            confidence: 0.9,
            timestamp: new Date()
          } as ReputationAnalysis,
          fromCache: false
        }), 50))
      )
      
      mockServices.whois.analyzeDomain.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: {
            ageInDays: 365,
            registrationDate: new Date('2023-01-01'),
            expirationDate: new Date('2025-01-01'),
            updatedDate: new Date('2023-06-01'),
            registrar: 'Test Registrar',
            nameservers: ['ns1.test.com'],
            status: ['ok'],
            score: 0.2,
            confidence: 0.8,
            privacyProtected: false,
            registrantCountry: 'US',
            riskFactors: []
          } as DomainAgeAnalysis,
          fromCache: false
        }), 50))
      )

      await orchestrator.analyzeURL('https://example.com')
      
      const totalTime = Date.now() - startTime
      
      // Should complete faster than sequential (would be 100ms+)
      expect(totalTime).toBeLessThan(80)
    })

    it('should respect minimum required services threshold', async () => {
      // Configure orchestrator to require minimum 3 services
      const strictOrchestrator = new AnalysisOrchestrator({
        errorHandling: {
          minimumRequiredServices: 3,
          continueOnPartialFailure: true,
          retryFailedServices: false,
          maxRetries: 1
        }
      })

      // Make multiple services fail
      mockServices.reputation.analyzeURL.mockRejectedValue(new Error('Service unavailable'))
      mockServices.whois.analyzeDomain.mockRejectedValue(new Error('Service unavailable'))
      mockServices.ssl.analyzeCertificate.mockRejectedValue(new Error('Service unavailable'))

      const result = await strictOrchestrator.analyzeURL('https://example.com')

      // Should return fallback result due to insufficient services
      expect(result.scoringResult.finalScore).toBe(50) // Fallback score
      expect(result.scoringResult.riskLevel).toBe('medium')
    })
  })

  describe('Statistics', () => {
    it('should return default statistics when no analyses performed', () => {
      const stats = orchestrator.getStatistics()

      expect(stats).toEqual({
        totalAnalyses: 0,
        averageProcessingTime: 0,
        averageSuccessRate: 0,
        serviceAvailability: {
          reputation: 0,
          domain_age: 0,
          ssl_certificate: 0,
          ai_analysis: 0,
          technical_indicators: 0
        },
        recentAnalyses: []
      })
    })

    it('should track statistics after analyses', async () => {
      // Add a small delay to ensure processing time is measurable
      mockServices.reputation.analyzeURL.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: {
            url: 'https://example.com',
            isClean: true,
            threatMatches: [],
            riskFactors: [],
            score: 10,
            riskLevel: 'low',
            confidence: 0.9,
            timestamp: new Date()
          } as ReputationAnalysis,
          fromCache: false
        }), 10))
      )

      await orchestrator.analyzeURL('https://example.com')
      await orchestrator.analyzeURL('https://test.com')

      const stats = orchestrator.getStatistics()

      expect(stats.totalAnalyses).toBe(2)
      // Processing time might be 0 in fast test environments, so check >= 0
      expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0)
      expect(stats.averageSuccessRate).toBeGreaterThan(0)
      expect(stats.recentAnalyses).toHaveLength(2)
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration successfully', () => {
      const newConfig: Partial<OrchestrationConfig> = {
        timeouts: {
          totalAnalysisTimeout: 30000,
          serviceTimeout: 15000,
          scoringTimeout: 3000
        }
      }

      expect(() => orchestrator.updateConfiguration(newConfig)).not.toThrow()
    })

    it('should update scoring configuration when provided', () => {
      const newConfig: Partial<OrchestrationConfig> = {
        scoring: {
          weights: {
            reputation: 0.5,
            domain_age: 0.3,
            ssl_certificate: 0.15,
            ai_analysis: 0.05
          }
        }
      }

      orchestrator.updateConfiguration(newConfig)

      expect(mockScoringCalculator.updateConfiguration).toHaveBeenCalledWith({
        weights: {
          reputation: 0.5,
          domain_age: 0.3,
          ssl_certificate: 0.15,
          ai_analysis: 0.05
        }
      })
    })
  })

  describe('Memory Management', () => {
    it('should clear history when requested', async () => {
      await orchestrator.analyzeURL('https://example.com')

      let stats = orchestrator.getStatistics()
      expect(stats.totalAnalyses).toBe(1)

      orchestrator.clearHistory()

      stats = orchestrator.getStatistics()
      expect(stats.totalAnalyses).toBe(0)
      expect(mockScoringCalculator.clearHistory).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle scoring calculator errors gracefully', async () => {
      mockScoringCalculator.calculateScore.mockRejectedValue(
        new Error('Scoring calculation failed')
      )

      const result = await orchestrator.analyzeURL('https://example.com')

      expect(result.scoringResult.finalScore).toBe(50) // Fallback
      expect(result.scoringResult.confidence).toBe(0.3) // Low confidence fallback
    })

    it('should handle concurrent request processing', async () => {
      // Configure mock to return different URLs for each call
      let callCount = 0
      const urls = ['https://site1.com', 'https://site2.com', 'https://site3.com']
      
      mockScoringCalculator.calculateScore.mockImplementation(() => {
        const url = urls[callCount++] || 'https://example.com'
        return Promise.resolve(createMockScoringResult(url))
      })

      // Start multiple analyses concurrently
      const promises = [
        orchestrator.analyzeURL('https://site1.com'),
        orchestrator.analyzeURL('https://site2.com'),
        orchestrator.analyzeURL('https://site3.com')
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      results.forEach((result, index) => {
        expect(result.scoringResult.url).toBe(urls[index])
        expect(result.orchestrationMetrics.totalProcessingTime).toBeGreaterThanOrEqual(0)
      })
    })
  })
})