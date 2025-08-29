/**
 * Unit tests for URL Analysis Prompt
 */

import {
  createUrlAnalysisPrompt,
  generateCacheKey,
  validateAIResponse,
  getPromptConfig,
  getTestExamples,
  URL_ANALYSIS_PROMPT_VERSION,
} from '../../../../../src/lib/analysis/prompts/url-analysis-prompt'
import type { AIAnalysisRequest } from '../../../../../src/types/ai'

describe('URL Analysis Prompt', () => {
  let mockAnalysisRequest: AIAnalysisRequest

  beforeEach(() => {
    mockAnalysisRequest = {
      url: 'https://example.com/test?param=value',
      domain: 'example.com',
      path: '/test',
      parameters: { param: 'value' },
      technicalContext: {
        domainAge: {
          ageInDays: 365,
          registrationDate: '2023-01-01T00:00:00.000Z',
          registrar: 'Test Registrar',
        },
        sslCertificate: {
          certificateType: 'DV',
          certificateAuthority: 'Let\'s Encrypt',
          daysUntilExpiry: 30,
          issuedDate: '2024-01-01T00:00:00.000Z',
        },
        reputation: {
          isClean: true,
          riskLevel: 'low',
          threatCount: 0,
          threatTypes: [],
        },
        urlStructure: {
          isIP: false,
          subdomain: undefined,
          pathDepth: 1,
          queryParamCount: 1,
          hasHttps: true,
        },
      },
    }
  })

  describe('createUrlAnalysisPrompt', () => {
    it('should generate a complete system prompt', () => {
      const prompt = createUrlAnalysisPrompt(mockAnalysisRequest)

      expect(prompt).toContain('You are an expert cybersecurity analyst')
      expect(prompt).toContain(mockAnalysisRequest.url)
      expect(prompt).toContain(mockAnalysisRequest.domain)
      expect(prompt).toContain(mockAnalysisRequest.path)
      expect(prompt).toContain('Domain Age: 365 days')
      expect(prompt).toContain('SSL: DV')
      expect(prompt).toContain('Reputation: Clean')
      expect(prompt).toContain('HTTPS: true')
      expect(prompt).toContain('Path Depth: 1')
      expect(prompt).toContain('Params: 1')
    })

    it('should include JSON response format requirements', () => {
      const prompt = createUrlAnalysisPrompt(mockAnalysisRequest)

      expect(prompt).toContain('Respond ONLY with valid JSON')
      expect(prompt).toContain('risk_score')
      expect(prompt).toContain('confidence')
      expect(prompt).toContain('primary_risks')
      expect(prompt).toContain('scam_category')
      expect(prompt).toContain('indicators')
      expect(prompt).toContain('explanation')
    })

    it('should include analysis framework sections', () => {
      const prompt = createUrlAnalysisPrompt(mockAnalysisRequest)

      expect(prompt).toContain('Domain Trust Analysis')
      expect(prompt).toContain('URL Structure Red Flags')
      expect(prompt).toContain('Scam Pattern Matching')
      expect(prompt).toContain('financial|phishing|ecommerce|social_engineering|legitimate')
    })

    it('should handle missing technical context gracefully', () => {
      const requestWithoutContext = {
        ...mockAnalysisRequest,
        technicalContext: {
          urlStructure: {
            isIP: false,
            pathDepth: 1,
            queryParamCount: 1,
            hasHttps: true,
          },
        },
      }

      const prompt = createUrlAnalysisPrompt(requestWithoutContext)

      expect(prompt).toContain('URL Structure Red Flags')
      expect(prompt).toContain('HTTPS: true')
      expect(prompt).not.toContain('Domain Age:')
      expect(prompt).not.toContain('SSL:')
      expect(prompt).not.toContain('Reputation:')
    })

    it('should format IP address URLs correctly', () => {
      const ipRequest = {
        ...mockAnalysisRequest,
        url: 'http://192.168.1.1/test',
        domain: '192.168.1.1',
        technicalContext: {
          ...mockAnalysisRequest.technicalContext,
          urlStructure: {
            isIP: true,
            pathDepth: 1,
            queryParamCount: 0,
            hasHttps: false,
          },
        },
      }

      const prompt = createUrlAnalysisPrompt(ipRequest)

      expect(prompt).toContain('192.168.1.1')
      expect(prompt).toContain('IP Address')
      expect(prompt).toContain('HTTPS: false')
    })
  })

  describe('generateCacheKey', () => {
    it('should generate consistent cache keys for same request', () => {
      const key1 = generateCacheKey(mockAnalysisRequest)
      const key2 = generateCacheKey(mockAnalysisRequest)

      expect(key1).toBe(key2)
    })

    it('should include URL and version in cache key', () => {
      const key = generateCacheKey(mockAnalysisRequest)

      expect(key).toContain(mockAnalysisRequest.url)
      expect(key).toContain(`v${URL_ANALYSIS_PROMPT_VERSION}`)
    })

    it('should generate different keys for different contexts', () => {
      const request1 = { ...mockAnalysisRequest }
      const request2 = {
        ...mockAnalysisRequest,
        technicalContext: {
          ...mockAnalysisRequest.technicalContext,
          domainAge: {
            ageInDays: 30, // Different age
            registrationDate: '2024-01-01T00:00:00.000Z',
            registrar: 'Different Registrar',
          },
        },
      }

      const key1 = generateCacheKey(request1)
      const key2 = generateCacheKey(request2)

      expect(key1).not.toBe(key2)
    })

    it('should handle missing technical context elements', () => {
      const requestWithMinimalContext = {
        ...mockAnalysisRequest,
        technicalContext: {
          urlStructure: {
            isIP: false,
            pathDepth: 1,
            queryParamCount: 1,
            hasHttps: true,
          },
        },
      }

      const key = generateCacheKey(requestWithMinimalContext)
      expect(key).toContain('unknown') // Should use 'unknown' for missing values
    })
  })

  describe('validateAIResponse', () => {
    const validResponse = {
      risk_score: 75,
      confidence: 90,
      primary_risks: ['suspicious domain', 'recent registration'],
      scam_category: 'phishing',
      indicators: ['domain typosquatting', 'suspicious TLD'],
      explanation: 'This appears to be a phishing website attempting to impersonate a legitimate service.',
    }

    it('should validate a correct response', () => {
      const result = validateAIResponse(JSON.stringify(validResponse))
      expect(result.valid).toBe(true)
    })

    it('should reject invalid JSON', () => {
      const result = validateAIResponse('invalid json')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid JSON')
    })

    it('should reject responses missing required fields', () => {
      const incompleteResponse = {
        risk_score: 75,
        // Missing other required fields
      }

      const result = validateAIResponse(JSON.stringify(incompleteResponse))
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Missing required field')
    })

    it('should validate risk_score range', () => {
      const invalidScoreResponse = {
        ...validResponse,
        risk_score: 150, // Out of range
      }

      const result = validateAIResponse(JSON.stringify(invalidScoreResponse))
      expect(result.valid).toBe(false)
      expect(result.error).toContain('risk_score must be a number between 0-100')
    })

    it('should validate confidence range', () => {
      const invalidConfidenceResponse = {
        ...validResponse,
        confidence: -10, // Out of range
      }

      const result = validateAIResponse(JSON.stringify(invalidConfidenceResponse))
      expect(result.valid).toBe(false)
      expect(result.error).toContain('confidence must be a number between 0-100')
    })

    it('should validate array fields', () => {
      const invalidArrayResponse = {
        ...validResponse,
        primary_risks: 'not an array',
      }

      const result = validateAIResponse(JSON.stringify(invalidArrayResponse))
      expect(result.valid).toBe(false)
      expect(result.error).toContain('primary_risks must be an array')
    })

    it('should validate scam_category values', () => {
      const invalidCategoryResponse = {
        ...validResponse,
        scam_category: 'invalid_category',
      }

      const result = validateAIResponse(JSON.stringify(invalidCategoryResponse))
      expect(result.valid).toBe(false)
      expect(result.error).toContain('scam_category must be one of')
    })

    it('should validate explanation length', () => {
      const shortExplanationResponse = {
        ...validResponse,
        explanation: 'short', // Too short
      }

      const result = validateAIResponse(JSON.stringify(shortExplanationResponse))
      expect(result.valid).toBe(false)
      expect(result.error).toContain('explanation must be a string with at least 10 characters')
    })

    it('should accept all valid scam categories', () => {
      const validCategories = ['financial', 'phishing', 'ecommerce', 'social_engineering', 'legitimate']

      for (const category of validCategories) {
        const response = {
          ...validResponse,
          scam_category: category,
        }

        const result = validateAIResponse(JSON.stringify(response))
        expect(result.valid).toBe(true)
      }
    })
  })

  describe('getPromptConfig', () => {
    it('should return correct prompt configuration', () => {
      const config = getPromptConfig()

      expect(config.version).toBe(URL_ANALYSIS_PROMPT_VERSION)
      expect(config.systemPrompt).toBe('URL Risk Analysis System v1.0')
      expect(config.responseFormat).toBe('json')
      expect(config.maxRetries).toBe(2)
      expect(config.cacheKey).toContain(URL_ANALYSIS_PROMPT_VERSION)
    })
  })

  describe('getTestExamples', () => {
    it('should return test examples with scam and legitimate URLs', () => {
      const examples = getTestExamples()

      expect(examples.scamUrls).toBeDefined()
      expect(examples.legitimateUrls).toBeDefined()
      expect(examples.scamUrls.length).toBeGreaterThan(0)
      expect(examples.legitimateUrls.length).toBeGreaterThan(0)

      // Check that scam URLs look suspicious
      examples.scamUrls.forEach(url => {
        expect(url).toMatch(/^https?:\/\//)
      })

      // Check that legitimate URLs look trustworthy
      examples.legitimateUrls.forEach(url => {
        expect(url).toMatch(/^https?:\/\//)
        // Verify it's from a known legitimate domain
        expect(url).toMatch(/(github|amazon|google|stackoverflow|npmjs|mozilla|apple|paypal|wikipedia|bbc|mit|reuters|irs|usa\.gov)/)
      })
    })
  })

  describe('technical context formatting', () => {
    it('should format domain age context correctly', () => {
      const request = {
        ...mockAnalysisRequest,
        technicalContext: {
          ...mockAnalysisRequest.technicalContext,
          domainAge: {
            ageInDays: 30,
            registrationDate: '2024-11-01T00:00:00.000Z',
            registrar: 'Test Registrar',
          },
        },
      }

      const prompt = createUrlAnalysisPrompt(request)
      expect(prompt).toContain('Domain Age: 30 days, Registrar: Test Registrar')
    })

    it('should format SSL certificate context correctly', () => {
      const request = {
        ...mockAnalysisRequest,
        technicalContext: {
          ...mockAnalysisRequest.technicalContext,
          sslCertificate: {
            certificateType: 'EV',
            certificateAuthority: 'DigiCert',
            daysUntilExpiry: 90,
            issuedDate: '2024-01-01T00:00:00.000Z',
          },
        },
      }

      const prompt = createUrlAnalysisPrompt(request)
      expect(prompt).toContain('SSL: EV, CA: DigiCert, Expires in: 90 days')
    })

    it('should format reputation context correctly', () => {
      const request = {
        ...mockAnalysisRequest,
        technicalContext: {
          ...mockAnalysisRequest.technicalContext,
          reputation: {
            isClean: false,
            riskLevel: 'high' as const,
            threatCount: 2,
            threatTypes: ['malware', 'phishing'],
          },
        },
      }

      const prompt = createUrlAnalysisPrompt(request)
      expect(prompt).toContain('Reputation: Flagged, Risk: high, Threats: malware, phishing')
    })
  })
})