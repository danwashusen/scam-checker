import { test, expect, devices } from '@playwright/test'
import { AnalysisPage } from '../pages/analysis.page'
import { assertionHelpers } from '../helpers'

/**
 * Cross-Browser Compatibility Tests (AC-4)
 * Tests consistent behavior across Chrome, Firefox, and Safari
 */

// Define browser-specific test configurations
const browserConfigs = [
  { name: 'Chrome Desktop', ...devices['Desktop Chrome'] },
  { name: 'Firefox Desktop', ...devices['Desktop Firefox'] },
  { name: 'Safari Desktop', ...devices['Desktop Safari'] }
]

for (const browserConfig of browserConfigs) {
  test.describe(`Browser Compatibility - ${browserConfig.name}`, () => {
    test.use({ ...browserConfig })
    
    let analysisPage: AnalysisPage

    test.beforeEach(async ({ page }) => {
      analysisPage = new AnalysisPage(page)
      await analysisPage.goto()
    })

    test('should render UI consistently across browsers', async ({ page, browserName }) => {
      // Take baseline screenshot for comparison
      await expect(page.locator('body')).toBeVisible()
      
      // Check main UI elements are present
      await expect(analysisPage.urlInput).toBeVisible()
      await expect(analysisPage.analyzeButton).toBeVisible()
      
      // Verify form styling is consistent
      const inputStyles = await analysisPage.urlInput.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          display: computed.display,
          border: computed.border,
          borderRadius: computed.borderRadius,
          padding: computed.padding
        }
      })
      
      expect(inputStyles.display).toBe('block')
      expect(inputStyles.border).toMatch(/px.*solid|none/)
      
      // Verify button is properly styled
      const buttonStyles = await analysisPage.analyzeButton.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          display: computed.display,
          cursor: computed.cursor,
          backgroundColor: computed.backgroundColor
        }
      })
      
      expect(buttonStyles.cursor).toBe('pointer')
    })

    test('should handle URL analysis workflow consistently', async ({ 
      page, 
      browserName 
    }) => {
      // Mock successful analysis
      await page.route('/api/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              url: 'https://cross-browser-test.com',
              riskScore: 45,
              riskLevel: 'medium',
              factors: [
                {
                  type: 'domain_age',
                  score: 0.4,
                  description: 'Domain registered recently'
                }
              ],
              timestamp: new Date().toISOString(),
              explanation: `Cross-browser test on ${browserName}`
            }
          })
        })
      })

      // Perform analysis
      await analysisPage.analyzeUrl('https://cross-browser-test.com')
      await analysisPage.waitForResults()

      // Verify results display consistently
      await expect(analysisPage.resultsContainer).toBeVisible()
      await expect(analysisPage.riskScore).toBeVisible()
      
      // Check risk level display
      await expect(page).toHaveRiskLevel('medium')
      
      // Verify URL is displayed correctly
      const displayedUrl = await page.locator('[data-testid*="analyzed-url"]').textContent()
      expect(displayedUrl).toContain('cross-browser-test.com')
    })

    test('should support view switching across browsers', async ({ 
      page, 
      browserName 
    }) => {
      await page.route('/api/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              url: 'https://view-switch-test.com',
              riskScore: 30,
              riskLevel: 'low',
              factors: [],
              timestamp: new Date().toISOString(),
              explanation: 'View switching test'
            }
          })
        })
      })

      await analysisPage.analyzeUrl('https://view-switch-test.com')
      await analysisPage.waitForResults()

      // Test view switching if tabs are available
      if (await analysisPage.viewTabs.isVisible()) {
        // Switch to technical view
        await analysisPage.switchView('technical')
        await expect(analysisPage.isTechnicalViewVisible()).resolves.toBe(true)
        
        // Switch back to simple view
        await analysisPage.switchView('simple')
        await expect(analysisPage.isSimpleViewVisible()).resolves.toBe(true)
      }
    })

    test('should handle form interactions consistently', async ({ 
      page, 
      browserName 
    }) => {
      const testUrl = 'https://form-interaction-test.com'
      
      // Test typing in URL input
      await analysisPage.enterUrl(testUrl)
      await expect(analysisPage.urlInput).toHaveValue(testUrl)
      
      // Test clearing input
      await analysisPage.clearUrl()
      await expect(analysisPage.urlInput).toHaveValue('')
      
      // Test form submission behavior
      await analysisPage.enterUrl('')
      await analysisPage.submitUrl()
      
      // Should show validation error consistently
      await expect(analysisPage.hasValidationError()).resolves.toBe(true)
    })

    test('should display errors consistently across browsers', async ({ 
      page, 
      browserName 
    }) => {
      // Mock error response
      await page.route('/api/analyze', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'SERVER_ERROR',
            message: `Server error on ${browserName}`
          })
        })
      })

      await analysisPage.analyzeUrl('https://error-test.com')
      
      // Should show error consistently
      await expect(page).toHandleError('server error')
      
      // Error message should be visible
      const errorElement = page.locator('[role="alert"], .error-message')
      await expect(errorElement).toBeVisible()
      
      // Error styling should be consistent
      const errorStyles = await errorElement.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          display: computed.display,
          color: computed.color
        }
      })
      
      expect(errorStyles.display).not.toBe('none')
    })

    test('should handle keyboard navigation consistently', async ({ 
      page, 
      browserName 
    }) => {
      // Focus URL input with Tab
      await page.keyboard.press('Tab')
      
      // Should focus the URL input
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBe('INPUT')
      
      // Test Enter key submission
      await analysisPage.urlInput.fill('invalid-url')
      await page.keyboard.press('Enter')
      
      // Should trigger form submission and show validation error
      await expect(analysisPage.hasValidationError()).resolves.toBe(true)
    })

    test('should handle CSS animations and transitions', async ({ 
      page, 
      browserName 
    }) => {
      await page.route('/api/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              url: 'https://animation-test.com',
              riskScore: 75,
              riskLevel: 'high',
              factors: [],
              timestamp: new Date().toISOString(),
              explanation: 'Animation test'
            }
          })
        })
      })

      await analysisPage.analyzeUrl('https://animation-test.com')
      await analysisPage.waitForResults()

      // Check that risk gauge is visible (may have animations)
      await expect(analysisPage.riskGauge).toBeVisible()
      
      // Wait for any animations to complete
      await page.waitForFunction(() => {
        const elements = document.querySelectorAll('[data-testid="risk-gauge"], .risk-gauge')
        return Array.from(elements).every(el => {
          const animations = el.getAnimations()
          return animations.length === 0 || 
                 animations.every(anim => anim.playState === 'finished' || anim.playState === 'idle')
        })
      }, { timeout: 10000 })
      
      // Element should still be visible after animations
      await expect(analysisPage.riskGauge).toBeVisible()
    })
  })
}

test.describe('Browser-Specific Feature Testing', () => {
  test('Chrome - should support modern CSS features', async ({ page }) => {
    test.skip(process.env.BROWSER !== 'chrome', 'Chrome-specific test')
    
    const analysisPage = new AnalysisPage(page)
    await analysisPage.goto()
    
    // Test CSS Grid support
    const supportsGrid = await page.evaluate(() => {
      return CSS.supports('display', 'grid')
    })
    expect(supportsGrid).toBe(true)
    
    // Test CSS custom properties
    const supportsCustomProps = await page.evaluate(() => {
      return CSS.supports('color', 'var(--test-color)')
    })
    expect(supportsCustomProps).toBe(true)
  })

  test('Firefox - should handle form validation properly', async ({ page }) => {
    test.skip(process.env.BROWSER !== 'firefox', 'Firefox-specific test')
    
    const analysisPage = new AnalysisPage(page)
    await analysisPage.goto()
    
    // Test HTML5 validation
    await analysisPage.urlInput.fill('invalid-url-format')
    
    const validationMessage = await analysisPage.urlInput.evaluate((input: HTMLInputElement) => {
      return input.validationMessage
    })
    
    // Firefox should provide validation message for invalid URL
    expect(validationMessage).toBeTruthy()
  })

  test('Safari - should handle touch events on desktop', async ({ page }) => {
    test.skip(process.env.BROWSER !== 'webkit', 'Safari-specific test')
    
    const analysisPage = new AnalysisPage(page)
    await analysisPage.goto()
    
    // Test touch event handling
    const supportsTouchEvents = await page.evaluate(() => {
      return 'ontouchstart' in window
    })
    
    // Safari supports touch events even on desktop
    expect(supportsTouchEvents).toBe(true)
  })
})

test.describe('Cross-Browser Performance', () => {
  test('should meet performance targets across all browsers', async ({ page, browserName }) => {
    const analysisPage = new AnalysisPage(page)
    
    const startTime = Date.now()
    await analysisPage.goto()
    const loadTime = Date.now() - startTime
    
    // Page should load within 3 seconds across all browsers
    expect(loadTime).toBeLessThan(3000)
    
    // Check Core Web Vitals if supported
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const vitals = {
              lcp: entries.find(e => e.entryType === 'largest-contentful-paint')?.startTime,
              fid: entries.find(e => e.entryType === 'first-input')?.processingStart
            }
            resolve(vitals)
          })
          
          observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] })
          
          // Resolve after timeout if no metrics
          setTimeout(() => resolve({ lcp: null, fid: null }), 5000)
        } else {
          resolve({ lcp: null, fid: null })
        }
      })
    })
    
    // Log performance metrics for debugging
    console.log(`${browserName} Performance:`, { loadTime, vitals })
  })
})