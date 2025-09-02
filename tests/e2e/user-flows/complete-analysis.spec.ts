import { test, expect } from '../fixtures'
import { AnalysisPage } from '../pages/analysis.page'
import { testData, PerformanceHelper, assertionHelpers } from '../helpers'

/**
 * Complete User Journey E2E Tests (AC-1)
 * Tests the full workflow from URL input through analysis to results display
 */

test.describe('Complete Analysis User Journey', () => {
  let analysisPage: AnalysisPage

  test.beforeEach(async ({ page }) => {
    analysisPage = new AnalysisPage(page)
    await analysisPage.goto()
  })

  test('should complete successful URL analysis workflow', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    // Mock successful analysis response
    await mockAnalysisSuccess(page, 'https://www.google.com', 'low')

    // Test URL input validation
    await analysisPage.enterUrl('https://www.google.com')
    await expect(analysisPage.urlInput).toHaveValue('https://www.google.com')

    // Submit analysis
    await analysisPage.submitUrl()

    // Verify loading state
    await assertionHelpers.assertLoadingState(page)

    // Wait for results
    await analysisPage.waitForResults()

    // Verify analysis completion
    await assertionHelpers.assertAnalysisComplete(page, 'google.com')

    // Verify results are displayed
    await expect(analysisPage.resultsContainer).toBeVisible()
    await expect(analysisPage.analysisTitle).toBeVisible()

    // Verify risk information is shown
    await expect(analysisPage.riskScore).toBeVisible()
    await expect(analysisPage.riskGauge).toBeVisible()

    // Take screenshot for documentation
    await analysisPage.takeScreenshot('successful-analysis-complete')
  })

  test('should handle URL auto-correction', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    const testUrl = 'google.com' // Missing protocol
    await mockAnalysisSuccess(page, 'https://google.com', 'low')

    // Enter URL without protocol
    await analysisPage.enterUrl(testUrl)
    await analysisPage.submitUrl()

    // Should auto-correct to HTTPS
    await analysisPage.waitForResults()
    await expect(page.locator('text=/https:\/\/google\.com/')).toBeVisible()
  })

  test('should validate URL input before submission', async ({ page }) => {
    // Test empty URL
    await analysisPage.enterUrl('')
    await expect(analysisPage.urlInput).toHaveValue('')
    
    // Should show validation error
    await analysisPage.submitUrl()
    await expect(analysisPage.hasValidationError()).resolves.toBe(true)

    // Test invalid URL format
    await analysisPage.clearUrl()
    await analysisPage.enterUrl('not-a-valid-url')
    await analysisPage.submitUrl()
    await expect(analysisPage.hasValidationError()).resolves.toBe(true)

    const errorMessage = await analysisPage.getValidationError()
    expect(errorMessage.toLowerCase()).toContain('valid url')
  })

  test('should prevent malicious URL patterns', async ({ page }) => {
    const maliciousUrls = [
      'javascript:alert("xss")',
      'vbscript:msgbox("test")',
      'data:text/html,<script>alert(1)</script>'
    ]

    for (const maliciousUrl of maliciousUrls) {
      await analysisPage.clearUrl()
      await analysisPage.enterUrl(maliciousUrl)
      await analysisPage.submitUrl()
      
      // Should show validation error for malicious patterns
      await expect(analysisPage.hasValidationError()).resolves.toBe(true)
    }
  })

  test('should display dual-view system correctly', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://example.com', 'medium')
    
    await analysisPage.analyzeUrl('https://example.com')
    await analysisPage.waitForResults()

    // Verify tabs are visible
    await expect(analysisPage.viewTabs).toBeVisible()
    await expect(analysisPage.simpleViewTab).toBeVisible()
    await expect(analysisPage.technicalViewTab).toBeVisible()

    // Test simple view (default)
    await expect(analysisPage.isSimpleViewVisible()).resolves.toBe(true)

    // Switch to technical view
    await analysisPage.switchView('technical')
    await expect(analysisPage.isTechnicalViewVisible()).resolves.toBe(true)

    // Switch back to simple view
    await analysisPage.switchView('simple')
    await expect(analysisPage.isSimpleViewVisible()).resolves.toBe(true)
  })

  test('should handle different risk levels correctly', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    const riskScenarios = [
      { url: 'https://safe-site.com', level: 'low' as const, expectedScore: 25 },
      { url: 'https://unknown-site.com', level: 'medium' as const, expectedScore: 60 },
      { url: 'https://suspicious-site.tk', level: 'high' as const, expectedScore: 85 }
    ]

    for (const scenario of riskScenarios) {
      await mockAnalysisSuccess(page, scenario.url, scenario.level)
      
      await analysisPage.analyzeUrl(scenario.url)
      await analysisPage.waitForResults()

      // Verify risk level and score
      await expect(page).toHaveRiskLevel(scenario.level)
      await expect(page).toHaveRiskScore(scenario.expectedScore, 10) // 10 point tolerance

      // Reset for next test
      await page.reload()
    }
  })

  test('should support share and export functionality', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://test-site.com', 'low')
    
    await analysisPage.analyzeUrl('https://test-site.com')
    await analysisPage.waitForResults()

    // Verify share/export button is visible
    await expect(analysisPage.shareExportButton).toBeVisible()
    
    // Click share/export (actual functionality would depend on implementation)
    await analysisPage.shareExportButton.click()
    
    // Should show share/export options (test would depend on actual UI)
    // This is a placeholder for when the feature is implemented
  })

  test('should provide "Analyze New URL" functionality', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://first-site.com', 'low')
    
    // Complete first analysis
    await analysisPage.analyzeUrl('https://first-site.com')
    await analysisPage.waitForResults()

    // Click "Analyze New URL" or similar button
    if (await analysisPage.checkAnotherUrlButton.isVisible()) {
      await analysisPage.checkAnotherUrlButton.click()
    } else if (await analysisPage.analyzeNewButton.isVisible()) {
      await analysisPage.analyzeNewButton.click()
    }

    // Should be able to enter new URL
    await expect(analysisPage.urlInput).toBeVisible()
    await expect(analysisPage.urlInput).toBeEditable()
    
    // Results should be cleared or hidden
    const resultsVisible = await analysisPage.resultsContainer.isVisible()
    if (resultsVisible) {
      // Results might still be visible but form should be ready for new input
      await expect(analysisPage.urlInput).toHaveValue('')
    }
  })

  test('should measure and validate performance during analysis', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://performance-test.com', 'low')
    
    const performanceHelper = new PerformanceHelper(page)
    
    // Measure performance during the analysis workflow
    const metrics = await performanceHelper.measureInteractionPerformance(async () => {
      await analysisPage.analyzeUrl('https://performance-test.com')
      await analysisPage.waitForResults()
    })

    // Verify performance metrics are within acceptable ranges
    expect(metrics.duration).toBeLessThan(5000) // Analysis should complete within 5 seconds
    
    // Measure Core Web Vitals
    const coreWebVitals = await performanceHelper.measureCoreWebVitals()
    expect(coreWebVitals.lcp).toBeLessThan(2500) // LCP < 2.5s
    expect(coreWebVitals.fid).toBeLessThan(100)  // FID < 100ms
    expect(coreWebVitals.cls).toBeLessThan(0.1)  // CLS < 0.1

    // Create performance report
    const validation = performanceHelper.validatePerformance(coreWebVitals)
    if (!validation.passed) {
      console.log('Performance Report:', performanceHelper.createReport(coreWebVitals, validation))
    }
    expect(validation.passed).toBe(true)
  })

  test('should work with realistic test data', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    // Use faker-generated test data
    const testUrls = testData.fixtures.urls.filter(url => url.shouldPass)
    
    for (const urlData of testUrls.slice(0, 3)) { // Test first 3 valid URLs
      await mockAnalysisSuccess(page, urlData.url, urlData.expectedRisk)
      
      await analysisPage.analyzeUrl(urlData.url)
      await analysisPage.waitForResults()
      
      // Verify results match expected risk level
      await expect(page).toHaveRiskLevel(urlData.expectedRisk)
      
      // Reset for next URL
      await page.reload()
    }
  })

  test('should maintain state during view interactions', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://state-test.com', 'medium')
    
    await analysisPage.analyzeUrl('https://state-test.com')
    await analysisPage.waitForResults()

    // Get initial risk score
    const initialResult = await analysisPage.getResults()
    expect(initialResult).toBeTruthy()

    // Switch views multiple times
    await analysisPage.switchView('technical')
    await analysisPage.switchView('simple')
    await analysisPage.switchView('technical')

    // Verify state is preserved
    const finalResult = await analysisPage.getResults()
    expect(finalResult?.riskScore).toBe(initialResult?.riskScore)
    expect(finalResult?.url).toBe(initialResult?.url)
  })
})

test.describe('Analysis Workflow Edge Cases', () => {
  let analysisPage: AnalysisPage

  test.beforeEach(async ({ page }) => {
    analysisPage = new AnalysisPage(page)
    await analysisPage.goto()
  })

  test('should handle extremely long URLs', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    const longUrl = 'https://example.com/' + 'a'.repeat(1000) + '.html'
    await mockAnalysisSuccess(page, longUrl, 'medium')
    
    await analysisPage.enterUrl(longUrl)
    
    // Should either accept the URL or show appropriate validation
    const hasError = await analysisPage.hasValidationError()
    if (!hasError) {
      await analysisPage.submitUrl()
      await analysisPage.waitForResults()
      
      // Should complete successfully
      await expect(analysisPage.resultsContainer).toBeVisible()
    } else {
      // Should show appropriate error for too-long URLs
      const errorMessage = await analysisPage.getValidationError()
      expect(errorMessage).toContain('URL')
    }
  })

  test('should handle international domain names', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    const internationalUrls = [
      'https://münchen.de',
      'https://москва.рф',
      'https://中国.cn'
    ]

    for (const url of internationalUrls) {
      await mockAnalysisSuccess(page, url, 'low')
      
      await analysisPage.analyzeUrl(url)
      await analysisPage.waitForResults()
      
      await expect(analysisPage.resultsContainer).toBeVisible()
      
      // Reset for next test
      await page.reload()
    }
  })

  test('should handle URLs with special characters', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    const specialUrl = 'https://example.com/path?query=value&test=123#section'
    await mockAnalysisSuccess(page, specialUrl, 'low')
    
    await analysisPage.analyzeUrl(specialUrl)
    await analysisPage.waitForResults()
    
    await expect(analysisPage.resultsContainer).toBeVisible()
  })
})