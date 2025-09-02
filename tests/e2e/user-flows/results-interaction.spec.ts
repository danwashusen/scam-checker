import { test, expect } from '../fixtures'
import { AnalysisPage } from '../pages/analysis.page'
import { assertionHelpers } from '../helpers'

/**
 * Results Interaction E2E Tests (AC-2)
 * Tests view switching, expandable sections, and interactive elements
 */

test.describe('Results Interaction Tests', () => {
  let analysisPage: AnalysisPage

  test.beforeEach(async ({ page }) => {
    analysisPage = new AnalysisPage(page)
    await analysisPage.goto()
  })

  test('should switch between simple and technical views with state preservation', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://example.com', 'medium')
    
    await analysisPage.analyzeUrl('https://example.com')
    await analysisPage.waitForResults()

    // Get initial results in simple view
    const initialResults = await analysisPage.getResults()
    
    // Switch to technical view
    await analysisPage.switchView('technical')
    await expect(analysisPage.isTechnicalViewVisible()).resolves.toBe(true)
    
    // Verify state is preserved
    const technicalResults = await analysisPage.getResults()
    expect(technicalResults?.riskScore).toBe(initialResults?.riskScore)
    expect(technicalResults?.url).toBe(initialResults?.url)
    
    // Switch back to simple view
    await analysisPage.switchView('simple')
    await expect(analysisPage.isSimpleViewVisible()).resolves.toBe(true)
    
    // Verify state is still preserved
    const finalResults = await analysisPage.getResults()
    expect(finalResults?.riskScore).toBe(initialResults?.riskScore)
  })

  test('should expand and collapse technical detail sections', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://technical-test.com', 'medium')
    
    await analysisPage.analyzeUrl('https://technical-test.com')
    await analysisPage.waitForResults()
    
    // Switch to technical view
    await analysisPage.switchView('technical')
    
    // Test expandable sections
    const expandableSelectors = [
      '[data-testid="domain-analysis-section"]',
      '[data-testid="reputation-section"]',
      '[data-testid="content-analysis-section"]'
    ]
    
    for (const selector of expandableSelectors) {
      const section = page.locator(selector)
      if (await section.count() > 0) {
        // Expand section
        await section.click()
        await expect(section.locator('[data-testid="section-content"]')).toBeVisible()
        
        // Collapse section
        await section.click()
        await expect(section.locator('[data-testid="section-content"]')).not.toBeVisible()
      }
    }
  })

  test('should handle interactive elements: tooltips and popovers', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://interactive-test.com', 'high')
    
    await analysisPage.analyzeUrl('https://interactive-test.com')
    await analysisPage.waitForResults()
    
    // Test tooltips on risk factors
    const tooltipTriggers = page.locator('[data-testid*="tooltip-trigger"]')
    const triggerCount = await tooltipTriggers.count()
    
    if (triggerCount > 0) {
      // Hover over first tooltip trigger
      await tooltipTriggers.first().hover()
      await expect(page.locator('[role="tooltip"]')).toBeVisible()
      
      // Move away to close tooltip
      await page.mouse.move(0, 0)
      await expect(page.locator('[role="tooltip"]')).not.toBeVisible()
    }
    
    // Test info popovers
    const popoverTriggers = page.locator('[data-testid*="info-popover"]')
    const popoverCount = await popoverTriggers.count()
    
    if (popoverCount > 0) {
      await popoverTriggers.first().click()
      await expect(page.locator('[role="dialog"], [data-testid="popover-content"]')).toBeVisible()
      
      // Close popover
      await page.keyboard.press('Escape')
      await expect(page.locator('[role="dialog"], [data-testid="popover-content"]')).not.toBeVisible()
    }
  })

  test('should display animated risk gauge interactions', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://gauge-test.com', 'low')
    
    await analysisPage.analyzeUrl('https://gauge-test.com')
    await analysisPage.waitForResults()
    
    // Verify risk gauge is visible
    await expect(analysisPage.riskGauge).toBeVisible()
    
    // Check for animation completion
    await page.waitForFunction(() => {
      const gaugeElement = document.querySelector('[data-testid="risk-gauge"]')
      if (!gaugeElement) return false
      
      // Check if animations have completed
      const animations = gaugeElement.getAnimations()
      return animations.every(animation => animation.playState === 'finished' || animation.playState === 'idle')
    }, { timeout: 10000 })
    
    // Verify gauge shows correct risk level
    const gaugeColor = await analysisPage.riskGauge.evaluate((el) => {
      return window.getComputedStyle(el).color || window.getComputedStyle(el).fill
    })
    
    // Low risk should be green-ish
    expect(gaugeColor).toMatch(/rgb\(.*0.*255.*0.*\)|green|#[0-9a-f]*[0-9]*[0-9a-f]*[0-9a-f]*[0-9a-f]*[0-9]*/i)
  })

  test('should display recommendations with action workflows', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://recommendations-test.com', 'high')
    
    await analysisPage.analyzeUrl('https://recommendations-test.com')
    await analysisPage.waitForResults()
    
    // Verify recommendations section is visible
    const recommendationsSection = page.locator('[data-testid="recommendations-section"]')
    await expect(recommendationsSection).toBeVisible()
    
    // Test recommendation items
    const recommendationItems = page.locator('[data-testid*="recommendation-item"]')
    const itemCount = await recommendationItems.count()
    
    if (itemCount > 0) {
      // Verify first recommendation has content
      await expect(recommendationItems.first()).toBeVisible()
      await expect(recommendationItems.first()).not.toBeEmpty()
      
      // Check for action buttons if they exist
      const actionButtons = recommendationItems.first().locator('button, [role="button"]')
      const buttonCount = await actionButtons.count()
      
      if (buttonCount > 0) {
        // Test clicking action button
        await actionButtons.first().click()
        
        // Should trigger some response (modal, navigation, etc.)
        // This would depend on actual implementation
      }
    }
  })

  test('should maintain responsive behavior during interactions', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://responsive-test.com', 'medium')
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await analysisPage.analyzeUrl('https://responsive-test.com')
    await analysisPage.waitForResults()
    
    // Verify results are visible on mobile
    await expect(analysisPage.resultsContainer).toBeVisible()
    
    // Test view switching on mobile
    if (await analysisPage.viewTabs.isVisible()) {
      await analysisPage.switchView('technical')
      await expect(analysisPage.isTechnicalViewVisible()).resolves.toBe(true)
      
      await analysisPage.switchView('simple')
      await expect(analysisPage.isSimpleViewVisible()).resolves.toBe(true)
    }
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    
    // Verify results still visible and functional
    await expect(analysisPage.resultsContainer).toBeVisible()
    
    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
  })

  test('should handle keyboard navigation in results', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://keyboard-test.com', 'medium')
    
    await analysisPage.analyzeUrl('https://keyboard-test.com')
    await analysisPage.waitForResults()
    
    // Test tab navigation through interactive elements
    let tabCount = 0
    const maxTabs = 10 // Safety limit
    
    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab')
      tabCount++
      
      const activeElement = await page.evaluate(() => {
        const el = document.activeElement
        return el ? el.tagName + (el.className ? '.' + el.className.split(' ')[0] : '') : null
      })
      
      if (!activeElement || activeElement === 'BODY') break
      
      // Verify focused element has visible focus indicator
      await expect(page).toHaveFocusVisible()
    }
    
    // Test Enter key activation
    const focusableElements = page.locator('button, [role="button"], [role="tab"], a[href]')
    const elementCount = await focusableElements.count()
    
    if (elementCount > 0) {
      await focusableElements.first().focus()
      await page.keyboard.press('Enter')
      
      // Should trigger some interaction
      // Actual behavior depends on element type
    }
  })
})

test.describe('Results Interaction Edge Cases', () => {
  let analysisPage: AnalysisPage

  test.beforeEach(async ({ page }) => {
    analysisPage = new AnalysisPage(page)
    await analysisPage.goto()
  })

  test('should handle rapid view switching', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://rapid-switch-test.com', 'medium')
    
    await analysisPage.analyzeUrl('https://rapid-switch-test.com')
    await analysisPage.waitForResults()
    
    // Rapidly switch views
    for (let i = 0; i < 5; i++) {
      await analysisPage.switchView('technical')
      await analysisPage.switchView('simple')
    }
    
    // Verify final state is correct
    await expect(analysisPage.isSimpleViewVisible()).resolves.toBe(true)
    
    // Verify results are still intact
    const results = await analysisPage.getResults()
    expect(results).toBeTruthy()
    expect(results?.url).toContain('rapid-switch-test.com')
  })

  test('should handle missing optional sections gracefully', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    // Mock response with minimal data
    await page.route('/api/analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            url: 'https://minimal-data-test.com',
            riskScore: 50,
            riskLevel: 'medium',
            factors: [],
            timestamp: new Date().toISOString(),
            explanation: 'Minimal analysis data'
          }
        })
      })
    })
    
    await analysisPage.analyzeUrl('https://minimal-data-test.com')
    await analysisPage.waitForResults()
    
    // Should not crash with missing data
    await expect(analysisPage.resultsContainer).toBeVisible()
    
    // Try switching views with minimal data
    await analysisPage.switchView('technical')
    await expect(page.locator('body')).toBeVisible() // Should not crash
    
    await analysisPage.switchView('simple')
    await expect(page.locator('body')).toBeVisible() // Should not crash
  })
})