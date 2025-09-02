import { test, expect, devices } from '@playwright/test'
import { AnalysisPage } from '../pages/analysis.page'
import { assertionHelpers } from '../helpers'

/**
 * Mobile Experience E2E Tests (AC-7)
 * Tests mobile-responsive behavior, touch interactions, and responsive layout
 */

// Define mobile device configurations
const mobileDevices = [
  { name: 'iPhone 12', ...devices['iPhone 12'] },
  { name: 'iPhone 12 Pro', ...devices['iPhone 12 Pro'] },
  { name: 'Galaxy S21', ...devices['Galaxy S21'] },
  { name: 'iPad Pro', ...devices['iPad Pro'] }
]

for (const device of mobileDevices) {
  test.describe(`Mobile Experience - ${device.name}`, () => {
    test.use({ ...device })
    
    let analysisPage: AnalysisPage

    test.beforeEach(async ({ page }) => {
      analysisPage = new AnalysisPage(page)
      await analysisPage.goto()
    })

    test('should display responsive layout correctly', async ({ page }) => {
      // Check that main elements are visible and properly sized
      await expect(analysisPage.urlInput).toBeVisible()
      await expect(analysisPage.analyzeButton).toBeVisible()
      
      // Check viewport-specific layout
      const viewport = page.viewportSize()
      console.log(`Testing on ${device.name}: ${viewport?.width}x${viewport?.height}`)
      
      // Elements should not overflow viewport
      const inputBox = await analysisPage.urlInput.boundingBox()
      if (inputBox && viewport) {
        expect(inputBox.width).toBeLessThanOrEqual(viewport.width - 20) // 20px margin
        expect(inputBox.x).toBeGreaterThanOrEqual(0)
      }
      
      // Button should be properly sized for touch
      const buttonBox = await analysisPage.analyzeButton.boundingBox()
      if (buttonBox) {
        expect(buttonBox.height).toBeGreaterThanOrEqual(44) // iOS touch target minimum
        expect(buttonBox.width).toBeGreaterThanOrEqual(44)
      }
    })

    test('should support touch interactions', async ({ page, browserName }) => {
      // Skip for non-mobile browsers
      if (!device.isMobile) {
        test.skip()
      }

      const testUrl = 'https://touch-interaction-test.com'
      
      // Mock successful response
      await page.route('/api/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              url: testUrl,
              riskScore: 35,
              riskLevel: 'low',
              factors: [],
              timestamp: new Date().toISOString(),
              explanation: 'Touch interaction test'
            }
          })
        })
      })

      // Test touch input
      await analysisPage.urlInput.tap()
      await page.fill(analysisPage.urlInput, testUrl)
      await expect(analysisPage.urlInput).toHaveValue(testUrl)
      
      // Test touch button press
      await analysisPage.analyzeButton.tap()
      
      // Should proceed with analysis
      await analysisPage.waitForResults()
      await expect(analysisPage.resultsContainer).toBeVisible()
    })

    test('should handle virtual keyboard appearance', async ({ page }) => {
      // Skip for non-mobile devices
      if (!device.isMobile) {
        test.skip()
      }

      const initialViewport = page.viewportSize()
      console.log('Initial viewport:', initialViewport)
      
      // Focus input to trigger virtual keyboard
      await analysisPage.urlInput.focus()
      await page.fill(analysisPage.urlInput, 'https://keyboard-test.com')
      
      // Give time for virtual keyboard to appear
      await page.waitForTimeout(1000)
      
      // Input should still be visible and functional
      await expect(analysisPage.urlInput).toBeVisible()
      await expect(analysisPage.analyzeButton).toBeVisible()
      
      // Should be able to scroll to see button if needed
      await analysisPage.analyzeButton.scrollIntoViewIfNeeded()
      await expect(analysisPage.analyzeButton).toBeInViewport()
    })

    test('should display results in mobile-optimized format', async ({ 
      page, 
      browserName 
    }) => {
      // Mock analysis result
      await page.route('/api/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              url: 'https://mobile-results-test.com',
              riskScore: 65,
              riskLevel: 'medium',
              factors: [
                {
                  type: 'domain_age',
                  score: 0.5,
                  description: 'Domain registered recently'
                },
                {
                  type: 'reputation',
                  score: 0.3,
                  description: 'Limited reputation data'
                }
              ],
              timestamp: new Date().toISOString(),
              explanation: 'Mobile-optimized results display test'
            }
          })
        })
      })

      await analysisPage.analyzeUrl('https://mobile-results-test.com')
      await analysisPage.waitForResults()
      
      // Results should be visible
      await expect(analysisPage.resultsContainer).toBeVisible()
      
      // Risk gauge should be appropriately sized for mobile
      if (await analysisPage.riskGauge.isVisible()) {
        const gaugeBox = await analysisPage.riskGauge.boundingBox()
        const viewport = page.viewportSize()
        
        if (gaugeBox && viewport) {
          // Gauge shouldn't take up more than 80% of screen width
          expect(gaugeBox.width).toBeLessThanOrEqual(viewport.width * 0.8)
        }
      }
      
      // Test view switching on mobile if available
      if (await analysisPage.viewTabs.isVisible()) {
        await analysisPage.switchView('technical')
        await expect(analysisPage.isTechnicalViewVisible()).resolves.toBe(true)
        
        // Technical view should be readable on mobile
        const technicalContent = page.locator('[data-testid="technical-view"]')
        if (await technicalContent.isVisible()) {
          await expect(technicalContent).toBeVisible()
        }
      }
    })

    test('should handle mobile navigation patterns', async ({ page }) => {
      // Test swipe gestures if supported
      const viewport = page.viewportSize()
      if (viewport && device.isMobile) {
        // Try horizontal swipe gesture
        const centerX = viewport.width / 2
        const centerY = viewport.height / 2
        
        await page.mouse.move(centerX - 100, centerY)
        await page.mouse.down()
        await page.mouse.move(centerX + 100, centerY)
        await page.mouse.up()
        
        // Page should still be functional after swipe
        await expect(analysisPage.urlInput).toBeVisible()
      }
      
      // Test pull-to-refresh behavior (should not interfere)
      if (device.isMobile) {
        await page.mouse.move(viewport?.width || 200 / 2, 50)
        await page.mouse.down()
        await page.mouse.move(viewport?.width || 200 / 2, 200)
        await page.mouse.up()
        
        // Page should remain functional
        await expect(analysisPage.urlInput).toBeVisible()
      }
    })

    test('should provide appropriate touch targets', async ({ page }) => {
      // Check all interactive elements meet touch target requirements
      const interactiveElements = page.locator('button, a[href], input, [role="button"], [role="tab"]')
      const elementCount = await interactiveElements.count()
      
      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = interactiveElements.nth(i)
        const box = await element.boundingBox()
        
        if (box) {
          // iOS Human Interface Guidelines: minimum 44x44 points
          // Android: minimum 48dp (approximately 48px)
          const minSize = device.name.includes('iPhone') || device.name.includes('iPad') ? 44 : 48
          
          expect(box.width).toBeGreaterThanOrEqual(minSize - 5) // 5px tolerance
          expect(box.height).toBeGreaterThanOrEqual(minSize - 5)
        }
      }
    })

    test('should handle orientation changes', async ({ page }) => {
      // Skip for devices that don\'t support orientation change
      if (!device.isMobile || device.name.includes('iPad')) {
        test.skip()
      }

      const initialViewport = page.viewportSize()
      console.log('Initial viewport:', initialViewport)
      
      // Rotate to landscape
      if (initialViewport) {
        await page.setViewportSize({ 
          width: initialViewport.height, 
          height: initialViewport.width 
        })
        
        // Give time for layout to adjust
        await page.waitForTimeout(500)
        
        // Elements should still be visible and functional
        await expect(analysisPage.urlInput).toBeVisible()
        await expect(analysisPage.analyzeButton).toBeVisible()
        
        // Rotate back to portrait
        await page.setViewportSize(initialViewport)
        await page.waitForTimeout(500)
        
        // Should still be functional
        await expect(analysisPage.urlInput).toBeVisible()
        await expect(analysisPage.analyzeButton).toBeVisible()
      }
    })

    test('should optimize performance for mobile', async ({ 
      page, 
      browserName 
    }) => {
      // Mock analysis for performance test
      await page.route('/api/analyze', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              url: 'https://mobile-performance-test.com',
              riskScore: 40,
              riskLevel: 'medium',
              factors: [],
              timestamp: new Date().toISOString(),
              explanation: 'Mobile performance test'
            }
          })
        })
      })

      const startTime = Date.now()
      
      await analysisPage.analyzeUrl('https://mobile-performance-test.com')
      await analysisPage.waitForResults()
      
      const totalTime = Date.now() - startTime
      
      console.log(`Mobile analysis time on ${device.name}: ${totalTime}ms`)
      
      // Mobile should complete analysis within reasonable time
      expect(totalTime).toBeLessThan(5000) // 5 seconds on mobile
      
      // Results should be displayed
      await expect(analysisPage.resultsContainer).toBeVisible()
    })
  })
}

test.describe('Mobile-Specific Features', () => {
  test('should support iOS Safari specific features', async ({ page }) => {
    test.use(devices['iPhone 12'])
    
    const analysisPage = new AnalysisPage(page)
    await analysisPage.goto()
    
    // Check viewport meta tag for proper mobile scaling
    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]')
      return meta?.getAttribute('content')
    })
    
    expect(viewportMeta).toMatch(/width=device-width/)
    expect(viewportMeta).toMatch(/initial-scale=1/)
    
    // Check for iOS-specific touches
    const supportsTouch = await page.evaluate(() => {
      return 'ontouchstart' in window
    })
    
    expect(supportsTouch).toBe(true)
  })

  test('should support Android Chrome specific features', async ({ page }) => {
    test.use(devices['Galaxy S21'])
    
    const analysisPage = new AnalysisPage(page)
    await analysisPage.goto()
    
    // Check for Android-specific features
    const userAgent = await page.evaluate(() => navigator.userAgent)
    expect(userAgent).toMatch(/Android/)
    
    // Should handle Android back button behavior
    await page.goBack() // Shouldn't cause errors
    await page.goForward()
    
    // Should still be functional
    await expect(analysisPage.urlInput).toBeVisible()
  })

  test('should handle tablet-specific layouts', async ({ page }) => {
    test.use(devices['iPad Pro'])
    
    const analysisPage = new AnalysisPage(page)
    await analysisPage.goto()
    
    const viewport = page.viewportSize()
    console.log('iPad Pro viewport:', viewport)
    
    // Tablet should have more spacious layout
    const inputBox = await analysisPage.urlInput.boundingBox()
    if (inputBox && viewport) {
      // Should utilize available space better on tablet
      expect(inputBox.width).toBeGreaterThan(400) // Wider input on tablet
    }
    
    // Should support both touch and potential keyboard input
    await analysisPage.urlInput.tap()
    await page.fill(analysisPage.urlInput, 'https://tablet-test.com')
    await expect(analysisPage.urlInput).toHaveValue('https://tablet-test.com')
  })
})

test.describe('Mobile Error Handling', () => {
  test('should display mobile-optimized error messages', async ({ page }) => {
    test.use(devices['iPhone 12'])
    
    const analysisPage = new AnalysisPage(page)
    await analysisPage.goto()
    
    // Mock error response
    await page.route('/api/analyze', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'SERVER_ERROR',
          message: 'Server error occurred. Please try again.'
        })
      })
    })

    await analysisPage.analyzeUrl('https://mobile-error-test.com')
    
    // Error should be displayed in mobile-friendly format
    const errorElement = page.locator('[role="alert"], .error-message')
    await expect(errorElement).toBeVisible()
    
    // Error should not overflow viewport
    const errorBox = await errorElement.boundingBox()
    const viewport = page.viewportSize()
    
    if (errorBox && viewport) {
      expect(errorBox.width).toBeLessThanOrEqual(viewport.width - 20)
    }
    
    // Should provide clear action to retry
    const retryButton = page.locator('button:has-text("retry"), button:has-text("try again")')
    if (await retryButton.count() > 0) {
      // Retry button should be touch-friendly
      const retryBox = await retryButton.boundingBox()
      if (retryBox) {
        expect(retryBox.height).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('should handle network issues gracefully on mobile', async ({ page }) => {
    test.use(devices['Galaxy S21'])
    
    const analysisPage = new AnalysisPage(page)
    await analysisPage.goto()
    
    // Simulate network timeout
    await page.route('/api/analyze', async (route) => {
      // Delay then abort to simulate network issues
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.abort('internetdisconnected')
    })

    await analysisPage.analyzeUrl('https://network-issue-test.com')
    
    // Should show appropriate mobile-friendly error
    const errorMessage = await page.locator('[role="alert"], .error-message').textContent()
    expect(errorMessage?.toLowerCase()).toMatch(/network|connection|internet/)
    
    // Should suggest checking connection
    expect(errorMessage?.toLowerCase()).toMatch(/check.*connection|network.*connection/)
  })
})