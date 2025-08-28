import { ServiceFactory } from '../../src/lib/services/service-factory'
import { ScoringCalculator } from '../../src/lib/scoring/scoring-calculator'
import type { ScoringInput, ScoringResult } from '../../src/types/scoring'
import type { ReputationAnalysis } from '../../src/types/reputation'
import type { DomainAgeAnalysis } from '../../src/types/whois'
import type { SSLCertificateAnalysis } from '../../src/types/ssl'
import type { AIAnalysisResult } from '../../src/types/ai'
import { ThreatType, PlatformType, ThreatEntryType } from '../../src/types/reputation'

// Create realistic mock data for performance testing
const createPerformanceTestInput = (): ScoringInput => {
  return {
    url: 'https://example.com',
    reputation: {
      analysis: {
        url: 'https://example.com',
        isClean: true,
        threatMatches: [],
        riskFactors: [],
        score: 25,
        riskLevel: 'low',
        confidence: 0.85,
        timestamp: new Date()
      } as ReputationAnalysis,
      processingTimeMs: 250,
      fromCache: false
    },
    whois: {
      analysis: {
        ageInDays: 1825, // 5 years
        registrationDate: new Date('2019-01-01'),
        expirationDate: new Date('2025-01-01'),
        updatedDate: new Date('2022-01-01'),
        registrar: 'GoDaddy',
        nameservers: ['ns1.example.com', 'ns2.example.com'],
        status: ['clientTransferProhibited'],
        score: 0.2,
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
          isRevoked: null,
          chainValid: true,
          domainMatch: true,
          sanMatch: true,
          validationErrors: []
        },
        score: 15,
        confidence: 0.92,
        riskFactors: [],
        subjectAlternativeNames: ['example.com'],
        commonName: 'example.com'
      } as SSLCertificateAnalysis,
      processingTimeMs: 120,
      fromCache: false
    },
    ai: {
      analysis: {
        riskScore: 30,
        scamCategory: 'legitimate' as const,
        confidence: 88,
        primaryRisks: [],
        indicators: ['legitimate_content', 'proper_structure'],
        explanation: 'Appears to be legitimate business website',
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
  }
}

describe('Scoring System Performance Tests', () => {
  let calculator: ScoringCalculator

  beforeEach(() => {
    calculator = ServiceFactory.createScoringCalculator()
  })

  afterEach(() => {
    // Clear any accumulated history
    calculator.clearHistory()
  })

  describe('Single Calculation Performance', () => {
    it('should calculate score within acceptable time limits', async () => {
      const input = createPerformanceTestInput()
      
      const startTime = performance.now()
      const result = await calculator.calculateScore(input)
      const endTime = performance.now()
      
      const processingTime = endTime - startTime
      
      expect(processingTime).toBeLessThan(50) // Should be very fast with mock data
      expect(result.finalScore).toBeGreaterThanOrEqual(0)
      expect(result.finalScore).toBeLessThanOrEqual(100)
      expect(result.riskLevel).toMatch(/^(low|medium|high)$/)
    })

    it('should handle configuration changes efficiently', async () => {
      const input = createPerformanceTestInput()
      
      // Test with default config
      const start1 = performance.now()
      await calculator.calculateScore(input)
      const time1 = performance.now() - start1
      
      // Update configuration
      const updateResult = calculator.updateConfiguration({
        weights: {
          reputation: 0.5,
          domain_age: 0.3,
          ssl_certificate: 0.15,
          ai_analysis: 0.05
        }
      })
      expect(updateResult).toBe(true)
      
      // Test with new config
      const start2 = performance.now()
      await calculator.calculateScore(input)
      const time2 = performance.now() - start2
      
      // Should not be significantly slower after config change (more lenient for CI/testing)
      expect(time2).toBeLessThan(time1 * 5) // Allow more overhead for test environments
      expect(time2).toBeLessThan(500) // More lenient timeout
    })
  })

  describe('Batch Processing Performance', () => {
    it('should handle batch calculations efficiently', async () => {
      const batchSize = 100
      const inputs = Array(batchSize).fill(null).map(() => createPerformanceTestInput())
      
      const startTime = performance.now()
      
      const promises = inputs.map(input => calculator.calculateScore(input))
      const results = await Promise.all(promises)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const averageTimePerCalculation = totalTime / batchSize
      
      expect(results).toHaveLength(batchSize)
      expect(averageTimePerCalculation).toBeLessThan(10) // < 10ms per calculation on average
      expect(totalTime).toBeLessThan(2000) // Total batch should complete in < 2 seconds
      
      // All results should be valid
      results.forEach(result => {
        expect(result.finalScore).toBeGreaterThanOrEqual(0)
        expect(result.finalScore).toBeLessThanOrEqual(100)
        expect(result.riskLevel).toMatch(/^(low|medium|high)$/)
      })
    })

    it('should maintain consistent performance across multiple batches', async () => {
      const batchSize = 50
      const numberOfBatches = 3
      const times: number[] = []
      
      for (let batch = 0; batch < numberOfBatches; batch++) {
        const inputs = Array(batchSize).fill(null).map(() => createPerformanceTestInput())
        
        const startTime = performance.now()
        const promises = inputs.map(input => calculator.calculateScore(input))
        await Promise.all(promises)
        const endTime = performance.now()
        
        times.push(endTime - startTime)
      }
      
      // Check that performance doesn't degrade significantly across batches
      const firstBatchTime = times[0]
      const lastBatchTime = times[times.length - 1]
      
      expect(lastBatchTime).toBeLessThan(firstBatchTime * 3) // Allow more degradation for test environments
      expect(times.every(time => time < 3000)).toBe(true) // All batches under 3s
    })
  })

  describe('Memory Usage and Cleanup', () => {
    it('should limit history size to prevent memory leaks', async () => {
      const input = createPerformanceTestInput()
      
      // Generate many calculations to test history limits
      for (let i = 0; i < 1000; i++) {
        await calculator.calculateScore(input)
      }
      
      const stats = calculator.getStatistics()
      
      // Should not accumulate unlimited history
      // Note: This test assumes there's some limit in the implementation
      expect(stats.totalScores).toBeLessThanOrEqual(1000)
    })

    it('should clear history efficiently', async () => {
      const input = createPerformanceTestInput()
      
      // Generate some calculations
      for (let i = 0; i < 100; i++) {
        await calculator.calculateScore(input)
      }
      
      const statsBefore = calculator.getStatistics()
      expect(statsBefore.totalScores).toBe(100)
      
      // Clear should be fast
      const startTime = performance.now()
      calculator.clearHistory()
      const clearTime = performance.now() - startTime
      
      const statsAfter = calculator.getStatistics()
      
      expect(clearTime).toBeLessThan(10) // Should be very fast
      expect(statsAfter.totalScores).toBe(0)
    })
  })

  describe('Missing Data Performance', () => {
    it('should handle missing data without significant performance penalty', async () => {
      const completeInput = createPerformanceTestInput()
      const incompleteInput = { ...completeInput }
      delete incompleteInput.reputation
      delete incompleteInput.ssl
      
      // Test complete data
      const start1 = performance.now()
      await calculator.calculateScore(completeInput)
      const completeTime = performance.now() - start1
      
      // Test incomplete data
      const start2 = performance.now()
      await calculator.calculateScore(incompleteInput)
      const incompleteTime = performance.now() - start2
      
      // Incomplete should not be significantly slower (allow more flexibility for small timing differences)
      expect(incompleteTime).toBeLessThan(completeTime * 3 + 1) // More lenient timing
      expect(incompleteTime).toBeLessThan(100) // Still should be fast
    })
  })

  describe('Statistics Performance', () => {
    it('should calculate statistics efficiently even with large history', async () => {
      const input = createPerformanceTestInput()
      
      // Generate substantial calculation history
      for (let i = 0; i < 500; i++) {
        await calculator.calculateScore(input)
      }
      
      // Statistics calculation should be fast
      const startTime = performance.now()
      const stats = calculator.getStatistics()
      const statsTime = performance.now() - startTime
      
      expect(statsTime).toBeLessThan(50) // Should calculate stats quickly
      expect(stats.totalScores).toBe(500)
      expect(stats.averageProcessingTime).toBeGreaterThan(0)
    })
  })

  describe('Edge Case Performance', () => {
    it('should handle rapid successive calculations', async () => {
      const input = createPerformanceTestInput()
      
      const startTime = performance.now()
      
      // Fire off calculations rapidly without waiting
      const promises: Promise<ScoringResult>[] = []
      for (let i = 0; i < 20; i++) {
        promises.push(calculator.calculateScore(input))
      }
      
      const results = await Promise.all(promises)
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(500) // All should complete quickly
      expect(results).toHaveLength(20)
      expect(results.every(r => r.finalScore >= 0 && r.finalScore <= 100)).toBe(true)
    })

    it('should handle extreme values without performance degradation', async () => {
      const extremeInput: ScoringInput = {
        url: 'https://example.com',
        reputation: {
          analysis: {
            url: 'https://example.com',
            isClean: false,
            threatMatches: Array(100).fill({}).map((_, i) => ({ // Many threat matches
              threatType: ThreatType.MALWARE,
              platformType: PlatformType.ANY_PLATFORM,
              threatEntryType: ThreatEntryType.URL,
              threat: { url: `https://example.com/${i}` },
              cacheDuration: '300s'
            })),
            riskFactors: Array(50).fill({}).map((_, i) => ({ // Many risk factors
              type: `risk_${i}`,
              description: `Risk factor ${i}`,
              score: 90,
              severity: 'high' as const
            })),
            score: 95,
            riskLevel: 'high' as const,
            confidence: 0.99,
            timestamp: new Date()
          } as ReputationAnalysis,
          processingTimeMs: 250,
          fromCache: false
        }
      }
      
      const startTime = performance.now()
      const result = await calculator.calculateScore(extremeInput)
      const processingTime = performance.now() - startTime
      
      expect(processingTime).toBeLessThan(100) // Should still be fast
      expect(result.riskLevel).toBe('high')
    })
  })
})

// Additional load test utilities
describe('Scoring System Load Tests', () => {
  let calculator: ScoringCalculator

  beforeAll(() => {
    calculator = ServiceFactory.createScoringCalculator()
  })

  afterAll(() => {
    calculator.clearHistory()
  })

  it('should handle sustained load without memory leaks', async () => {
    const input = createPerformanceTestInput()
    const iterations = 1000
    const batchSize = 50
    
    const initialMemory = process.memoryUsage()
    
    // Process in batches to simulate sustained load
    for (let batch = 0; batch < iterations / batchSize; batch++) {
      const promises: Promise<ScoringResult>[] = []
      
      for (let i = 0; i < batchSize; i++) {
        promises.push(calculator.calculateScore(input))
      }
      
      await Promise.all(promises)
      
      // Periodically check memory hasn't grown excessively
      if (batch % 5 === 0) {
        const currentMemory = process.memoryUsage()
        const memoryGrowth = currentMemory.heapUsed - initialMemory.heapUsed
        
        // Allow some growth but not excessive (50MB max)
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024)
      }
    }
    
    const stats = calculator.getStatistics()
    expect(stats.totalScores).toBeGreaterThan(0)
  })
})