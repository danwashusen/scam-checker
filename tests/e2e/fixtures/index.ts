/**
 * Combined E2E fixtures for comprehensive testing
 * Exports all fixtures and helpers for easy importing
 */

import { test as base } from '@playwright/test'
import { mockHelpers, testUrls } from './network.fixture'
import { viewportHelpers } from './viewport.fixture'
import { authHelpers } from './auth.fixture'

// Import fixture definitions
import type { Page } from '@playwright/test'
import { MockAnalysisResponse, MockErrorResponse } from '../types/test-types'

// Create mock helper functions
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
          score: riskScore / 100,
          description: `Risk level: ${riskLevel}`
        }
      ],
      timestamp: new Date().toISOString(),
      explanation: `Analysis completed with ${riskLevel} risk level`
    }
  }
}

// Combine all fixtures into a single test instance
export const test = base.extend({
  // Network mocking fixtures
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

  mockAnalysisError: async ({ page }, use) => {
    const mockError = async (testPage: Page, status: number, errorResponse: MockErrorResponse) => {
      await testPage.route('/api/analyze', async (route) => {
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(errorResponse)
        })
      })
    }
    
    await use(mockError)
  },

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
  }
})

// Re-export all helpers
export { mockHelpers, testUrls, viewportHelpers, authHelpers }

// Export combined fixture type
export type CombinedFixtures = typeof test

export { expect } from '@playwright/test'