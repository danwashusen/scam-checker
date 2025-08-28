/**
 * Integration tests for AI analysis in the analyze API
 */

// Mock all dependencies BEFORE importing anything
jest.mock('../../../src/lib/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    timer: jest.fn(() => ({
      end: jest.fn(),
    })),
  })),
}))

// Mock NextResponse to work in test environment
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    const request = new Request(url, init)
    return {
      ...request,
      json: async () => JSON.parse(await request.text()),
    }
  }),
  NextResponse: {
    json: jest.fn().mockImplementation((body: unknown, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: {
          ...init?.headers,
          'content-type': 'application/json',
        },
      })
    }),
  },
}))

// Mock AI dependencies
jest.mock('../../../src/lib/analysis/ai-url-analyzer', () => {
  const mockInstance = {
    isAvailable: jest.fn(),
    analyzeURL: jest.fn(),
    getConfig: jest.fn(),
    getCacheStats: jest.fn(),
    getUsageStats: jest.fn(),
  }
  return {
    AIURLAnalyzer: jest.fn().mockImplementation(() => mockInstance),
    defaultAIURLAnalyzer: mockInstance,
  }
})

// Mock other analysis services (to isolate AI testing)
jest.mock('../../../src/lib/analysis/whois-service', () => {
  const mockInstance = {
    analyzeDomain: jest.fn().mockResolvedValue({ success: true, data: null, fromCache: false }),
    getCacheStats: jest.fn(),
    clearCache: jest.fn(),
    isCached: jest.fn(),
    config: {},
  }
  return {
    WhoisService: jest.fn().mockImplementation(() => mockInstance),
    defaultWhoisService: mockInstance,
  }
})

jest.mock('../../../src/lib/analysis/ssl-service', () => {
  const mockInstance = {
    analyzeCertificate: jest.fn().mockResolvedValue({ success: true, data: null, fromCache: false }),
    getCacheStats: jest.fn(),
    clearCache: jest.fn(),
    isCached: jest.fn(),
    config: {},
  }
  return {
    SSLService: jest.fn().mockImplementation(() => mockInstance),
    defaultSSLService: mockInstance,
  }
})

jest.mock('../../../src/lib/analysis/reputation-service', () => {
  const mockInstance = {
    analyzeURL: jest.fn().mockResolvedValue({ success: true, data: { isClean: true, threatMatches: [], riskFactors: [] }, fromCache: false }),
    checkMultipleURLs: jest.fn(),
    clearCache: jest.fn(),
    getStats: jest.fn(),
    config: {},
  }
  return {
    ReputationService: jest.fn().mockImplementation(() => mockInstance),
    defaultReputationService: mockInstance,
  }
})

// Now import after mocks are set up
import { POST, GET } from '../../../src/app/api/analyze/route'
import { NextRequest } from 'next/server'
import type { AIAnalysisResult } from '../../../src/types/ai'
import { AIProvider, ScamCategory } from '../../../src/types/ai'

interface MockAIAnalyzer {
  isAvailable: jest.Mock
  analyzeURL: jest.Mock
  getConfig: jest.Mock
  getCacheStats: jest.Mock
  getUsageStats: jest.Mock
}

interface AnalysisResponse {
  success: boolean
  data?: {
    url: string
    riskScore: number
    riskLevel: string
    factors: Array<{ type: string; score: number; description: string }>
    explanation: string
    aiAnalysis?: {
      riskScore: number
      confidence: number
      scamCategory: string
      primaryRisks: string[]
      indicators: string[]
      fromCache: boolean
      error?: string
    }
  }
}

describe('AI Analysis Integration', () => {
  let mockAIAnalyzer: MockAIAnalyzer

  beforeEach(() => {
    jest.clearAllMocks()

    // Get the mocked AI analyzer
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { defaultAIURLAnalyzer } = require('../../../src/lib/analysis/ai-url-analyzer')
    mockAIAnalyzer = defaultAIURLAnalyzer as MockAIAnalyzer

    // Mock other services to return basic responses
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { defaultWhoisService } = require('../../../src/lib/analysis/whois-service')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { defaultSSLService } = require('../../../src/lib/analysis/ssl-service')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { defaultReputationService } = require('../../../src/lib/analysis/reputation-service')

    defaultWhoisService.analyzeDomain.mockResolvedValue({
      success: false,
      error: { message: 'Mocked WHOIS failure for AI test isolation' },
    })

    defaultSSLService.analyzeCertificate.mockResolvedValue({
      success: false,
      error: { message: 'Mocked SSL failure for AI test isolation' },
    })

    defaultReputationService.analyzeURL.mockResolvedValue({
      success: false,
      error: { message: 'Mocked reputation failure for AI test isolation' },
    })

    // Default AI analyzer configuration
    mockAIAnalyzer.getConfig.mockReturnValue({
      enabled: true,
      provider: 'openai',
      model: 'gpt-4',
      cacheEnabled: true,
    })

    mockAIAnalyzer.getCacheStats.mockReturnValue({
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      maxSize: 1000,
    })

    mockAIAnalyzer.getUsageStats.mockReturnValue({
      requestCount: 0,
      totalCost: 0,
      averageCost: 0,
    })
  })

  describe('AI Analysis Enabled', () => {
    beforeEach(() => {
      mockAIAnalyzer.isAvailable.mockReturnValue(true)
    })

    it('should include AI analysis in successful response', async () => {
      // Mock successful AI analysis
      const mockAIResult: AIAnalysisResult = {
        riskScore: 85,
        confidence: 92,
        primaryRisks: ['suspicious domain', 'potential phishing'],
        scamCategory: ScamCategory.PHISHING,
        indicators: ['domain typosquatting', 'suspicious TLD'],
        explanation: 'AI detected potential phishing attempt',
        metadata: {
          timestamp: new Date().toISOString(),
          promptVersion: '1.0',
          provider: AIProvider.OPENAI,
          processingTimeMs: 1500,
          cost: 0.015,
        },
      }

      mockAIAnalyzer.analyzeURL.mockResolvedValue({
        success: true,
        data: mockAIResult,
        fromCache: false,
        metadata: { processingTime: 1500 },
      })

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://suspicious-site.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json() as AnalysisResponse

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data?.aiAnalysis).toBeDefined()
      expect(data.data?.aiAnalysis?.riskScore).toBe(85)
      expect(data.data?.aiAnalysis?.confidence).toBe(92)
      expect(data.data?.aiAnalysis?.scamCategory).toBe('phishing')
      expect(data.data?.aiAnalysis?.fromCache).toBe(false)

      // Check that AI factors were added to overall analysis
      const aiFactors = data.data?.factors.filter((f) => f.type.includes('ai')) ?? []
      expect(aiFactors.length).toBeGreaterThan(0)

      // Check explanation includes AI insights
      expect(data.data?.explanation).toContain('AI analysis')
    })

    it('should handle AI analysis from cache', async () => {
      const cachedAIResult: AIAnalysisResult = {
        riskScore: 25,
        confidence: 88,
        primaryRisks: [],
        scamCategory: ScamCategory.LEGITIMATE,
        indicators: [],
        explanation: 'AI analysis confirms legitimate website',
        metadata: {
          timestamp: new Date().toISOString(),
          promptVersion: '1.0',
          provider: AIProvider.OPENAI,
          processingTimeMs: 50,
        },
      }

      mockAIAnalyzer.analyzeURL.mockResolvedValue({
        success: true,
        data: cachedAIResult,
        fromCache: true,
        metadata: { processingTime: 50 },
      })

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://legitimate-site.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json() as AnalysisResponse

      expect(data.success).toBe(true)
      expect(data.data?.aiAnalysis?.fromCache).toBe(true)
      expect(data.data?.explanation).toContain('AI analysis confirms this appears to be a legitimate URL')
    })

    it('should handle AI analysis failure gracefully', async () => {
      mockAIAnalyzer.analyzeURL.mockResolvedValue({
        success: false,
        data: null,
        error: {
          code: 'rate_limit_exceeded',
          message: 'AI service rate limit exceeded',
        },
        fromCache: false,
        metadata: { processingTime: 100 },
      })

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json() as AnalysisResponse

      expect(data.success).toBe(true) // Overall analysis should still succeed
      expect(data.data?.aiAnalysis).toBeDefined()
      expect(data.data?.aiAnalysis?.error).toBe('AI service rate limit exceeded')
      expect(data.data?.aiAnalysis?.riskScore).toBe(0)

      // Check that fallback AI factor was added
      const aiUnavailableFactors = data.data?.factors.filter((f) => f.type === 'ai-unavailable') ?? []
      expect(aiUnavailableFactors.length).toBe(1)
    })

    it('should handle AI analysis timeout/error', async () => {
      mockAIAnalyzer.analyzeURL.mockRejectedValue(new Error('AI analysis timeout'))

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json() as AnalysisResponse

      expect(data.success).toBe(true) // Overall analysis should still succeed
      expect(data.data?.aiAnalysis?.error).toContain('AI analysis timeout')

      // Check that error AI factor was added
      const aiErrorFactors = data.data?.factors.filter((f) => f.type === 'ai-error') ?? []
      expect(aiErrorFactors.length).toBe(1)
    })

    it('should apply correct AI weighting to risk score', async () => {
      // Mock high-risk AI result
      const highRiskAIResult: AIAnalysisResult = {
        riskScore: 100, // Maximum risk
        confidence: 95,
        primaryRisks: ['confirmed scam', 'financial fraud'],
        scamCategory: ScamCategory.FINANCIAL,
        indicators: ['fraudulent domain', 'fake business'],
        explanation: 'Confirmed financial scam',
        metadata: {
          timestamp: new Date().toISOString(),
          promptVersion: '1.0',
          provider: AIProvider.OPENAI,
          processingTimeMs: 2000,
        },
      }

      mockAIAnalyzer.analyzeURL.mockResolvedValue({
        success: true,
        data: highRiskAIResult,
        fromCache: false,
        metadata: { processingTime: 2000 },
      })

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://scam-site.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json() as AnalysisResponse

      expect(data.success).toBe(true)

      // AI should contribute significantly to the risk score
      const aiFactors = data.data?.factors.filter((f) => f.type.includes('ai')) ?? []
      const totalAIScore = aiFactors.reduce((sum, factor) => sum + factor.score, 0)
      
      expect(totalAIScore).toBeGreaterThan(0.3) // AI should have substantial impact
      expect(data.data?.riskLevel).toBe('high') // Should result in high risk classification
    })

    it('should include AI analysis in explanation for high-confidence results', async () => {
      const highConfidenceAIResult: AIAnalysisResult = {
        riskScore: 80,
        confidence: 95,
        primaryRisks: ['phishing attempt'],
        scamCategory: ScamCategory.PHISHING,
        indicators: ['brand impersonation', 'suspicious domain'],
        explanation: 'High confidence phishing detection',
        metadata: {
          timestamp: new Date().toISOString(),
          promptVersion: '1.0',
          provider: AIProvider.OPENAI,
          processingTimeMs: 1200,
        },
      }

      mockAIAnalyzer.analyzeURL.mockResolvedValue({
        success: true,
        data: highConfidenceAIResult,
        fromCache: false,
        metadata: { processingTime: 1200 },
      })

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://fake-bank.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json() as AnalysisResponse

      expect(data.success).toBe(true)
      expect(data.data?.explanation).toContain('AI analysis identified this as a potential phishing scam with 95% confidence')
      expect(data.data?.explanation).toContain('Primary AI-detected concern: phishing attempt')
      expect(data.data?.explanation).toContain('AI detected indicators include: brand impersonation and suspicious domain')
    })

    it('should handle low-confidence AI results appropriately', async () => {
      const lowConfidenceAIResult: AIAnalysisResult = {
        riskScore: 45,
        confidence: 40, // Low confidence
        primaryRisks: ['uncertain'],
        scamCategory: ScamCategory.LEGITIMATE,
        indicators: [],
        explanation: 'Analysis inconclusive',
        metadata: {
          timestamp: new Date().toISOString(),
          promptVersion: '1.0',
          provider: AIProvider.OPENAI,
          processingTimeMs: 800,
        },
      }

      mockAIAnalyzer.analyzeURL.mockResolvedValue({
        success: true,
        data: lowConfidenceAIResult,
        fromCache: false,
        metadata: { processingTime: 800 },
      })

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://unclear-site.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json() as AnalysisResponse

      expect(data.success).toBe(true)
      expect(data.data?.explanation).toContain('AI analysis was inconclusive with 40% confidence')
    })
  })

  describe('AI Analysis Disabled', () => {
    beforeEach(() => {
      mockAIAnalyzer.isAvailable.mockReturnValue(false)
    })

    it('should continue analysis without AI when disabled', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json() as AnalysisResponse

      expect(data.success).toBe(true)
      expect(data.data?.aiAnalysis).toBeDefined()
      expect(data.data?.aiAnalysis?.error).toBe('AI analysis is disabled or not configured')
      expect(data.data?.explanation).toContain('AI-powered risk analysis was not available')

      // Should not call AI analyzer when disabled
      expect(mockAIAnalyzer.analyzeURL).not.toHaveBeenCalled()
    })
  })

  describe('API Documentation', () => {
    it('should include AI features in GET endpoint documentation', async () => {
      const response = await GET()
      const data = await response.json() as { features: string[] }

      expect(data.features).toContain('AI-powered URL risk analysis using OpenAI/Claude')
      expect(data.features).toContain('Scam pattern detection (financial, phishing, e-commerce)')
      expect(data.features).toContain('URL structure analysis for suspicious patterns')
      expect(data.features).toContain('AI response caching for cost optimization')
      expect(data.features).toContain('Multi-factor scoring algorithm with AI integration')
    })
  })

  describe('Response Structure', () => {
    it('should include aiAnalysis field in response structure', async () => {
      mockAIAnalyzer.isAvailable.mockReturnValue(true)
      
      const mockAIResult: AIAnalysisResult = {
        riskScore: 60,
        confidence: 85,
        primaryRisks: ['medium risk'],
        scamCategory: ScamCategory.ECOMMERCE,
        indicators: ['suspicious pricing'],
        explanation: 'Potential e-commerce fraud',
        metadata: {
          timestamp: new Date().toISOString(),
          promptVersion: '1.0',
          provider: AIProvider.OPENAI,
          processingTimeMs: 1000,
        },
      }

      mockAIAnalyzer.analyzeURL.mockResolvedValue({
        success: true,
        data: mockAIResult,
        fromCache: false,
        metadata: { processingTime: 1000 },
      })

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://suspicious-store.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json() as AnalysisResponse

      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('aiAnalysis')
      expect(data.data?.aiAnalysis).toMatchObject({
        riskScore: 60,
        confidence: 85,
        scamCategory: 'ecommerce',
        primaryRisks: ['medium risk'],
        indicators: ['suspicious pricing'],
        fromCache: false,
      })
    })
  })
})