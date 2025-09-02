import { test, expect } from '../fixtures'
import { AnalysisPage } from '../pages/analysis.page'
import { testData, assertionHelpers } from '../helpers'

/**
 * Error Handling E2E Tests (AC-3)
 * Tests invalid URLs, API failures, timeouts, and recovery mechanisms
 */

test.describe('Error Scenario Coverage', () => {
  let analysisPage: AnalysisPage

  test.beforeEach(async ({ page }) => {
    analysisPage = new AnalysisPage(page)
    await analysisPage.goto()
  })

  test('should validate and reject invalid URL formats', async ({ page }) => {
    const invalidUrls = [
      '',
      'not-a-url',
      'javascript:alert("xss")',
      'vbscript:msgbox("test")',
      'data:text/html,<script>alert(1)</script>',
      'ftp://files.example.com/file.zip',
      'file:///etc/passwd',
      'mailto:test@example.com',
      'tel:+1234567890'
    ]

    for (const invalidUrl of invalidUrls) {
      await analysisPage.clearUrl()
      await analysisPage.enterUrl(invalidUrl)
      await analysisPage.submitUrl()
      
      // Should show validation error
      await expect(analysisPage.hasValidationError()).resolves.toBe(true)
      
      const errorMessage = await analysisPage.getValidationError()
      expect(errorMessage.toLowerCase()).toMatch(/valid|url|format|invalid|enter/)
      
      // Should not proceed with analysis
      await expect(analysisPage.resultsContainer).not.toBeVisible()
    }
  })

  test('should handle API failure responses gracefully', async ({ 
    page, 
    mockAnalysisError 
  }) => {
    await mockAnalysisError(page, 500, {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error occurred'
    })
    
    await analysisPage.analyzeUrl('https://api-error-test.com')
    
    // Should show error message
    await assertionHelpers.assertErrorState(page, 'server error')
    
    // Should provide retry option
    const retryButton = page.locator('button:has-text("retry"), button:has-text("try again")')
    if (await retryButton.count() > 0) {
      await expect(retryButton).toBeVisible()
    }
  })

  test('should handle network timeout scenarios', async ({ 
    page, 
    mockTimeout 
  }) => {
    await mockTimeout(page, 5000) // 5 second timeout
    
    await analysisPage.analyzeUrl('https://timeout-test.com')
    
    // Should show loading initially
    await assertionHelpers.assertLoadingState(page)
    
    // Should eventually show timeout error
    await expect(page).toHandleError('timeout')
    
    // Should provide option to try again
    const tryAgainButton = page.locator('button:has-text("try again"), button:has-text("retry")')
    if (await tryAgainButton.count() > 0) {
      await expect(tryAgainButton).toBeVisible()
    }
  })

  test('should handle rate limiting with appropriate feedback', async ({ 
    page, 
    mockAnalysisError 
  }) => {
    await mockAnalysisError(page, 429, {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again in 60 seconds.',
      retryAfter: 60
    })
    
    await analysisPage.analyzeUrl('https://rate-limit-test.com')
    
    // Should show rate limit error
    await expect(page).toHandleError('rate limit')
    
    // Should show retry after message
    const errorMessage = await page.locator('[role="alert"], .error-message').textContent()
    expect(errorMessage?.toLowerCase()).toMatch(/too many|rate|limit|try again|60/)
  })

  test('should handle service unavailable with graceful fallback', async ({ 
    page, 
    mockAnalysisError 
  }) => {
    await mockAnalysisError(page, 503, {
      success: false,
      error: 'SERVICE_UNAVAILABLE',
      message: 'Analysis service is temporarily unavailable'
    })
    
    await analysisPage.analyzeUrl('https://service-unavailable-test.com')
    
    // Should show service unavailable error
    await expect(page).toHandleError('service unavailable')
    
    // Should suggest trying again later
    const errorText = await page.locator('[role="alert"], .error-message').textContent()
    expect(errorText?.toLowerCase()).toMatch(/unavailable|temporarily|try.*later|service/)
  })

  test('should handle partial analysis failures', async ({ page }) => {
    // Mock partial failure response
    await page.route('/api/analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            url: 'https://partial-failure-test.com',
            riskScore: 60,
            riskLevel: 'medium',
            factors: [
              {
                type: 'domain_age',
                score: 0.4,
                description: 'Domain registered recently'
              }
            ],
            timestamp: new Date().toISOString(),
            explanation: 'Partial analysis completed',
            warnings: [
              'WHOIS lookup failed',
              'Reputation check timeout'
            ],
            domainAge: null, // Failed
            reputation: {
              error: 'Service timeout'
            }
          }
        })
      })
    })
    
    await analysisPage.analyzeUrl('https://partial-failure-test.com')
    await analysisPage.waitForResults()
    
    // Should show results with warnings
    await expect(analysisPage.resultsContainer).toBeVisible()
    
    // Should indicate partial failure
    const warningElements = page.locator('[data-testid*="warning"], .warning')
    if (await warningElements.count() > 0) {
      await expect(warningElements.first()).toBeVisible()
    }
  })

  test('should verify error recovery mechanisms', async ({ 
    page, 
    mockAnalysisError,
    mockAnalysisSuccess 
  }) => {
    // First request fails
    await mockAnalysisError(page, 500, {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Server error'
    })
    
    await analysisPage.analyzeUrl('https://recovery-test.com')
    
    // Should show error
    await expect(page).toHandleError('server error')
    
    // Find retry button and click it
    const retryButton = page.locator('button:has-text("retry"), button:has-text("try again")')
    if (await retryButton.count() > 0) {
      // Mock successful retry
      await mockAnalysisSuccess(page, 'https://recovery-test.com', 'low')
      
      await retryButton.click()
      await analysisPage.waitForResults()
      
      // Should now show successful results
      await expect(analysisPage.resultsContainer).toBeVisible()
      await expect(page).toHaveRiskLevel('low')
    }
  })

  test('should handle malformed server responses', async ({ page }) => {
    // Mock malformed JSON response
    await page.route('/api/analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"invalid": json malformed}'
      })
    })
    
    await analysisPage.analyzeUrl('https://malformed-response-test.com')
    
    // Should handle parsing error gracefully
    await expect(page).toHandleError('parsing')
    
    // Should not crash the application
    await expect(page.locator('body')).toBeVisible()
    
    // Should allow new analysis
    await expect(analysisPage.urlInput).toBeVisible()
    await expect(analysisPage.urlInput).toBeEditable()
  })

  test('should handle network connection errors', async ({ page }) => {
    // Mock network failure
    await page.route('/api/analyze', async (route) => {
      await route.abort('failed')
    })
    
    await analysisPage.analyzeUrl('https://network-error-test.com')
    
    // Should show connection error
    await expect(page).toHandleError('connection')
    
    // Should suggest checking connection
    const errorText = await page.locator('[role="alert"], .error-message').textContent()
    expect(errorText?.toLowerCase()).toMatch(/connection|network|check.*connection|offline/)
  })
})

test.describe('Error Recovery and User Experience', () => {
  let analysisPage: AnalysisPage

  test.beforeEach(async ({ page }) => {
    analysisPage = new AnalysisPage(page)
    await analysisPage.goto()
  })

  test('should allow new analysis after errors', async ({ 
    page, 
    mockAnalysisError,
    mockAnalysisSuccess 
  }) => {
    // Cause an error first
    await mockAnalysisError(page, 400, {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid URL format'
    })
    
    await analysisPage.analyzeUrl('https://error-then-success.com')
    await expect(page).toHandleError('validation')
    
    // Clear error and try new analysis
    await analysisPage.clearUrl()
    await mockAnalysisSuccess(page, 'https://google.com', 'low')
    
    await analysisPage.analyzeUrl('https://google.com')
    await analysisPage.waitForResults()
    
    // Should succeed
    await expect(analysisPage.resultsContainer).toBeVisible()
    await expect(page).toHaveRiskLevel('low')
  })

  test('should preserve form state during errors', async ({ 
    page, 
    mockAnalysisError 
  }) => {
    const testUrl = 'https://preserve-state-test.com'
    
    await mockAnalysisError(page, 500, {
      success: false,
      error: 'SERVER_ERROR',
      message: 'Server error occurred'
    })
    
    await analysisPage.enterUrl(testUrl)
    await analysisPage.submitUrl()
    
    await expect(page).toHandleError('server error')
    
    // URL should still be in input field
    await expect(analysisPage.urlInput).toHaveValue(testUrl)
    
    // User can modify and retry
    await analysisPage.clearUrl()
    await expect(analysisPage.urlInput).toHaveValue('')
  })

  test('should handle multiple consecutive errors', async ({ 
    page, 
    mockAnalysisError 
  }) => {
    const errorScenarios = [
      { status: 500, error: 'SERVER_ERROR' },
      { status: 503, error: 'SERVICE_UNAVAILABLE' },
      { status: 429, error: 'RATE_LIMIT_EXCEEDED' }
    ]
    
    for (const scenario of errorScenarios) {
      await mockAnalysisError(page, scenario.status, {
        success: false,
        error: scenario.error,
        message: `${scenario.error} occurred`
      })
      
      await analysisPage.clearUrl()
      await analysisPage.analyzeUrl(`https://${scenario.error.toLowerCase()}-test.com`)
      
      // Should handle each error appropriately
      await expect(page).toHandleError(scenario.error.replace('_', ' ').toLowerCase())
      
      // Application should remain functional
      await expect(analysisPage.urlInput).toBeVisible()
      await expect(analysisPage.urlInput).toBeEditable()
    }
  })

  test('should show appropriate loading states during error scenarios', async ({ 
    page, 
    mockTimeout 
  }) => {
    await mockTimeout(page, 3000)
    
    await analysisPage.analyzeUrl('https://loading-error-test.com')
    
    // Should show loading initially
    await expect(page.locator('[data-testid*="loading"], .loading, .spinner')).toBeVisible()
    
    // Loading should eventually stop
    await expect(page.locator('[data-testid*="loading"], .loading, .spinner')).not.toBeVisible({ timeout: 10000 })
    
    // Should show timeout error
    await expect(page).toHandleError('timeout')
  })

  test('should handle errors during view transitions', async ({ 
    page, 
    mockAnalysisSuccess,
    mockAnalysisError 
  }) => {
    // First, get successful results
    await mockAnalysisSuccess(page, 'https://view-error-test.com', 'medium')
    
    await analysisPage.analyzeUrl('https://view-error-test.com')
    await analysisPage.waitForResults()
    
    // Switch to technical view
    await analysisPage.switchView('technical')
    
    // Now mock error for subsequent requests
    await mockAnalysisError(page, 500, {
      success: false,
      error: 'SERVER_ERROR',
      message: 'Server error during view switch'
    })
    
    // Try to analyze new URL while in technical view
    await analysisPage.clearUrl()
    await analysisPage.analyzeUrl('https://new-error-test.com')
    
    await expect(page).toHandleError('server error')
    
    // Should maintain view state
    if (await analysisPage.viewTabs.isVisible()) {
      // Technical view should still be selected
      const technicalTab = analysisPage.technicalViewTab
      await expect(technicalTab).toHaveAttribute('aria-selected', 'true')
    }
  })
})