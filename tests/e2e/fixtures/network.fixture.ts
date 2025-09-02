import { test as base, Page } from '@playwright/test'
import { MockAnalysisResponse, MockErrorResponse } from '../types/test-types'

/**
 * Network fixture for mocking API responses in E2E tests
 * Provides utilities for stubbing network requests and responses
 */

// Mock analysis responses for different scenarios
const createMockSuccessResponse = (url: string, riskLevel: 'low' | 'medium' | 'high'): MockAnalysisResponse => {
  const riskScore = riskLevel === 'low' ? 25 : riskLevel === 'medium' ? 60 : 85
  
  return {
    success: true,
    data: {
      url,
      riskScore,
      riskLevel,
      factors: [
        {
          type: 'domain_age',
          score: riskLevel === 'low' ? 0.2 : 0.6,
          description: `Domain registered ${riskLevel === 'low' ? '5 years ago' : '2 months ago'}`
        },
        {
          type: 'ssl_certificate',
          score: riskLevel === 'high' ? 0.8 : 0.1,
          description: riskLevel === 'high' ? 'Invalid SSL certificate' : 'Valid SSL certificate'
        },
        {
          type: 'reputation',
          score: riskLevel === 'high' ? 0.9 : 0.2,
          description: riskLevel === 'high' ? 'Reported as malicious' : 'Clean reputation'
        }
      ],
      timestamp: new Date().toISOString(),
      explanation: `Based on our analysis, this URL appears to have ${riskLevel} risk.`,
      domainAge: {
        ageInDays: riskLevel === 'low' ? 1825 : 60,
        registrationDate: riskLevel === 'low' ? '2020-01-01T00:00:00Z' : '2024-07-01T00:00:00Z',
        registrar: 'GoDaddy'
      },
      sslCertificate: riskLevel === 'high' ? {
        error: 'Certificate validation failed'
      } : {
        certificateAuthority: 'Let\'s Encrypt'
      },
      reputation: {
        isClean: riskLevel !== 'high'
      }
    }
  }
}

const createMockErrorResponse = (status: number, message: string): MockErrorResponse => ({
  success: false,
  error: 'ANALYSIS_ERROR',
  message,
  status
})

// Network fixture implementation
export const networkFixture = base.extend({
  // Mock successful analysis response
  mockAnalysisSuccess: async ({ page }, use) => {
    const mockSuccess = async (testPage: Page, url: string, riskLevel: 'low' | 'medium' | 'high' = 'low') => {
      const response = createMockSuccessResponse(url, riskLevel)
      
      await testPage.route('/api/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response)
        })
      })
    }
    
    await use(mockSuccess)
  },

  // Mock analysis error responses
  mockAnalysisError: async ({ page }, use) => {
    const mockError = async (testPage: Page, status: number = 500, message: string = 'Internal server error') => {
      const response = createMockErrorResponse(status, message)
      
      await testPage.route('/api/analyze', async (route) => {
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(response)
        })
      })
    }
    
    await use(mockError)
  },

  // Mock network timeout
  mockTimeout: async ({ page }, use) => {
    const mockTimeout = async (testPage: Page, delay: number = 30000) => {
      await testPage.route('/api/analyze', async (route) => {
        await new Promise(resolve => setTimeout(resolve, delay))
        await route.fulfill({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'TIMEOUT',
            message: 'Request timeout'
          })
        })
      })
    }
    
    await use(mockTimeout)
  },

  // Mock service unavailable
  mockServiceUnavailable: async ({ page }, use) => {
    const mockUnavailable = async (testPage: Page, service: string = 'analysis') => {
      await testPage.route('/api/analyze', async (route) => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'SERVICE_UNAVAILABLE',
            message: `${service} service is currently unavailable`
          })
        })
      })
    }
    
    await use(mockUnavailable)
  },

  // Mock partial service degradation
  mockPartialDegradation: async ({ page }, use) => {
    const mockDegradation = async (testPage: Page, failedServices: string[] = ['whois']) => {
      const response = createMockSuccessResponse('https://example.com', 'medium')
      
      // Mark certain services as failed
      failedServices.forEach(service => {
        if (service === 'whois') {
          response.data.domainAge = undefined
        } else if (service === 'ssl') {
          response.data.sslCertificate = { error: 'SSL check failed' }
        } else if (service === 'reputation') {
          response.data.reputation = undefined
        }
      })
      
      await testPage.route('/api/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response)
        })
      })
    }
    
    await use(mockDegradation)
  },

  // Mock slow response
  mockSlowResponse: async ({ page }, use) => {
    const mockSlow = async (testPage: Page, delay: number = 5000) => {
      const response = createMockSuccessResponse('https://example.com', 'low')
      
      await testPage.route('/api/analyze', async (route) => {
        await new Promise(resolve => setTimeout(resolve, delay))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response)
        })
      })
    }
    
    await use(mockSlow)
  },

  // Mock rate limiting
  mockRateLimit: async ({ page }, use) => {
    const mockRateLimit = async (testPage: Page) => {
      await testPage.route('/api/analyze', async (route) => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          headers: {
            'Retry-After': '60'
          },
          body: JSON.stringify({
            success: false,
            error: 'RATE_LIMIT',
            message: 'Too many requests. Please try again later.'
          })
        })
      })
    }
    
    await use(mockRateLimit)
  },

  // Mock offline/network error
  mockNetworkError: async ({ page }, use) => {
    const mockOffline = async (testPage: Page) => {
      await testPage.route('/api/analyze', async (route) => {
        await route.abort('internetdisconnected')
      })
    }
    
    await use(mockOffline)
  },

  // Utility to clear all network mocks
  clearNetworkMocks: async ({ page }, use) => {
    const clearMocks = async (testPage: Page) => {
      await testPage.unrouteAll()
    }
    
    await use(clearMocks)
  }
})

// Helper functions for creating custom mock responses
export const mockHelpers = {
  createCustomAnalysisResponse: (overrides: Partial<MockAnalysisResponse['data']>): MockAnalysisResponse => {
    const baseResponse = createMockSuccessResponse('https://example.com', 'low')
    return {
      ...baseResponse,
      data: {
        ...baseResponse.data,
        ...overrides
      }
    }
  },

  createValidationErrorResponse: (field: string, message: string): MockErrorResponse => ({
    success: false,
    error: 'VALIDATION_ERROR',
    message: `${field}: ${message}`,
    status: 400
  }),

  createAuthErrorResponse: (): MockErrorResponse => ({
    success: false,
    error: 'UNAUTHORIZED',
    message: 'Authentication required',
    status: 401
  })
}

// Test data for common scenarios
export const testUrls = {
  safe: 'https://www.google.com',
  suspicious: 'https://suspicious-site-for-testing.com',
  malicious: 'https://known-malicious-site.evil',
  invalid: 'not-a-url',
  empty: '',
  javascript: 'javascript:alert("xss")',
  tooLong: 'https://' + 'a'.repeat(2000) + '.com',
  localhost: 'http://localhost:3000'
}

export type NetworkFixture = typeof networkFixture