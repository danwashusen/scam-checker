import { expect, Page, Locator } from '@playwright/test'
import { PerformanceMetrics, PerformanceThresholds, AccessibilityConfig } from '../types/test-types'
import { PerformanceHelper } from './performance'
import { AccessibilityHelper } from './accessibility'

/**
 * Custom assertions for E2E testing
 * Provides domain-specific assertions for URL analysis, performance, and accessibility
 */

// Extend Playwright's expect with custom matchers
declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      toHaveValidUrl(): R
      toHaveRiskScore(score: number, tolerance?: number): R
      toHaveRiskLevel(level: 'low' | 'medium' | 'high'): R
      toHavePerformanceWithin(thresholds: Partial<PerformanceThresholds>): R
      toBeAccessible(config?: AccessibilityConfig): R
      toHandleError(errorType: string): R
      toLoadWithin(milliseconds: number): R
      toHaveFocusVisible(): R
      toSupportKeyboardNavigation(): R
      toHaveValidColorContrast(minRatio?: number): R
    }
  }
}

// URL validation assertion
expect.extend({
  async toHaveValidUrl(locator: Locator | Page) {
    const element = 'locator' in locator ? locator : locator.locator('body')
    
    try {
      // Look for URL in various places
      const urlText = await element.evaluate((el) => {
        const urlSelectors = [
          '[data-testid*="url"]',
          '[data-testid*="analyzed-url"]',
          'input[type="url"]',
          'a[href]'
        ]
        
        for (const selector of urlSelectors) {
          const urlElement = el.querySelector(selector)
          if (urlElement) {
            return urlElement.textContent || (urlElement as HTMLInputElement).value || (urlElement as HTMLAnchorElement).href
          }
        }
        
        // Look for any text that looks like a URL
        const text = el.textContent || ''
        const urlRegex = /https?:\/\/[^\s]+/g
        const match = text.match(urlRegex)
        return match ? match[0] : ''
      })
      
      if (!urlText) {
        return {
          message: () => 'No URL found in element',
          pass: false
        }
      }
      
      try {
        new URL(urlText)
        return {
          message: () => `Expected URL to be invalid, but got valid URL: ${urlText}`,
          pass: true
        }
      } catch (e) {
        return {
          message: () => `Expected valid URL, but got invalid URL: ${urlText}`,
          pass: false
        }
      }
    } catch (error) {
      return {
        message: () => `Failed to check URL validity: ${error}`,
        pass: false
      }
    }
  },

  // Risk score assertion
  async toHaveRiskScore(locator: Locator | Page, expectedScore: number, tolerance: number = 5) {
    const element = 'locator' in locator ? locator : locator.locator('body')
    
    try {
      const scoreText = await element.evaluate((el) => {
        const scoreSelectors = [
          '[data-testid*="risk-score"]',
          '[data-testid*="score"]',
          '.risk-score',
          '.score'
        ]
        
        for (const selector of scoreSelectors) {
          const scoreElement = el.querySelector(selector)
          if (scoreElement) {
            return scoreElement.textContent
          }
        }
        
        // Look for number patterns in text
        const text = el.textContent || ''
        const numberMatch = text.match(/\b(\d+)\b/)
        return numberMatch ? numberMatch[1] : ''
      })
      
      if (!scoreText) {
        return {
          message: () => 'No risk score found',
          pass: false
        }
      }
      
      const actualScore = parseInt(scoreText.replace(/\D/g, ''))
      const scoreDiff = Math.abs(actualScore - expectedScore)
      const isWithinTolerance = scoreDiff <= tolerance
      
      return {
        message: () => isWithinTolerance 
          ? `Expected risk score not to be ${expectedScore} ± ${tolerance}, but got ${actualScore}`
          : `Expected risk score ${expectedScore} ± ${tolerance}, but got ${actualScore} (diff: ${scoreDiff})`,
        pass: isWithinTolerance
      }
    } catch (error) {
      return {
        message: () => `Failed to check risk score: ${error}`,
        pass: false
      }
    }
  },

  // Risk level assertion
  async toHaveRiskLevel(locator: Locator | Page, expectedLevel: 'low' | 'medium' | 'high') {
    const element = 'locator' in locator ? locator : locator.locator('body')
    
    try {
      const levelText = await element.evaluate((el) => {
        const levelSelectors = [
          '[data-testid*="risk-level"]',
          '[data-testid*="risk-status"]',
          '.risk-level',
          '.risk-status'
        ]
        
        for (const selector of levelSelectors) {
          const levelElement = el.querySelector(selector)
          if (levelElement) {
            return levelElement.textContent?.toLowerCase()
          }
        }
        
        // Look for risk level keywords
        const text = (el.textContent || '').toLowerCase()
        if (text.includes('safe') || text.includes('low')) return 'low'
        if (text.includes('danger') || text.includes('high')) return 'high'
        if (text.includes('moderate') || text.includes('medium') || text.includes('caution')) return 'medium'
        
        return ''
      })
      
      const actualLevel = levelText?.includes('safe') ? 'low' : 
                         levelText?.includes('danger') ? 'high' :
                         levelText?.includes('moderate') || levelText?.includes('caution') ? 'medium' : levelText
      
      const isMatch = actualLevel === expectedLevel
      
      return {
        message: () => isMatch
          ? `Expected risk level not to be ${expectedLevel}, but it was`
          : `Expected risk level ${expectedLevel}, but got ${actualLevel}`,
        pass: isMatch
      }
    } catch (error) {
      return {
        message: () => `Failed to check risk level: ${error}`,
        pass: false
      }
    }
  },

  // Performance assertion
  async toHavePerformanceWithin(page: Page, thresholds: Partial<PerformanceThresholds>) {
    try {
      const performanceHelper = new PerformanceHelper(page)
      const metrics = await performanceHelper.measureCoreWebVitals()
      
      const failures: string[] = []
      const checks: Array<{ metric: string, actual: number, threshold: number, passed: boolean }> = []
      
      Object.entries(thresholds).forEach(([key, threshold]) => {
        const metricKey = key as keyof PerformanceMetrics
        const actual = metrics[metricKey]
        const passed = actual <= threshold
        
        checks.push({ metric: key, actual, threshold, passed })
        
        if (!passed) {
          failures.push(`${key.toUpperCase()}: ${actual} > ${threshold}`)
        }
      })
      
      const allPassed = failures.length === 0
      
      return {
        message: () => allPassed
          ? 'Expected performance to fail thresholds, but all metrics passed'
          : `Performance failed: ${failures.join(', ')}`,
        pass: allPassed
      }
    } catch (error) {
      return {
        message: () => `Failed to measure performance: ${error}`,
        pass: false
      }
    }
  },

  // Accessibility assertion
  async toBeAccessible(page: Page, config?: AccessibilityConfig) {
    try {
      const a11yHelper = new AccessibilityHelper(page)
      const results = await a11yHelper.runWCAGAudit(config)
      
      return {
        message: () => results.passed
          ? 'Expected page to have accessibility violations, but it passed'
          : `Accessibility violations found: ${results.violations.map(v => v.description).join(', ')}`,
        pass: results.passed
      }
    } catch (error) {
      return {
        message: () => `Failed to check accessibility: ${error}`,
        pass: false
      }
    }
  },

  // Error handling assertion
  async toHandleError(locator: Locator | Page, expectedErrorType: string) {
    const element = 'locator' in locator ? locator : locator.locator('body')
    
    try {
      const errorInfo = await element.evaluate((el) => {
        const errorSelectors = [
          '[role="alert"]',
          '.error-message',
          '[data-testid*="error"]',
          '.alert-destructive'
        ]
        
        const errorElements = errorSelectors.map(selector => el.querySelector(selector))
          .filter(Boolean)
        
        if (errorElements.length === 0) {
          return { hasError: false, errorText: '' }
        }
        
        const errorText = errorElements.map(el => el?.textContent).join(' ').toLowerCase()
        return { hasError: true, errorText }
      })
      
      if (!errorInfo.hasError) {
        return {
          message: () => `Expected error of type '${expectedErrorType}' but no error was found`,
          pass: false
        }
      }
      
      const hasExpectedError = errorInfo.errorText.includes(expectedErrorType.toLowerCase())
      
      return {
        message: () => hasExpectedError
          ? `Expected not to find error type '${expectedErrorType}' but it was found`
          : `Expected error type '${expectedErrorType}' but found: ${errorInfo.errorText}`,
        pass: hasExpectedError
      }
    } catch (error) {
      return {
        message: () => `Failed to check error handling: ${error}`,
        pass: false
      }
    }
  },

  // Loading time assertion
  async toLoadWithin(page: Page, maxMilliseconds: number) {
    const startTime = Date.now()
    
    try {
      await page.waitForLoadState('networkidle', { timeout: maxMilliseconds })
      const loadTime = Date.now() - startTime
      
      const withinTime = loadTime <= maxMilliseconds
      
      return {
        message: () => withinTime
          ? `Expected page to take longer than ${maxMilliseconds}ms but it loaded in ${loadTime}ms`
          : `Expected page to load within ${maxMilliseconds}ms but it took ${loadTime}ms`,
        pass: withinTime
      }
    } catch (error) {
      const loadTime = Date.now() - startTime
      return {
        message: () => `Page failed to load within ${maxMilliseconds}ms (took ${loadTime}ms): ${error}`,
        pass: false
      }
    }
  },

  // Focus visibility assertion
  async toHaveFocusVisible(page: Page) {
    try {
      const focusInfo = await page.evaluate(() => {
        const activeElement = document.activeElement
        if (!activeElement) {
          return { hasFocus: false, hasVisibleFocus: false }
        }
        
        const computedStyle = window.getComputedStyle(activeElement)
        const hasOutline = computedStyle.outline !== 'none' && computedStyle.outline !== '0px'
        const hasBoxShadow = computedStyle.boxShadow !== 'none'
        const hasBorder = computedStyle.border !== 'none'
        
        return {
          hasFocus: true,
          hasVisibleFocus: hasOutline || hasBoxShadow || hasBorder,
          element: activeElement.tagName + (activeElement.className ? '.' + activeElement.className.split(' ')[0] : '')
        }
      })
      
      if (!focusInfo.hasFocus) {
        return {
          message: () => 'No element is currently focused',
          pass: false
        }
      }
      
      return {
        message: () => focusInfo.hasVisibleFocus
          ? `Expected ${focusInfo.element} not to have visible focus indicator`
          : `Expected ${focusInfo.element} to have visible focus indicator`,
        pass: focusInfo.hasVisibleFocus
      }
    } catch (error) {
      return {
        message: () => `Failed to check focus visibility: ${error}`,
        pass: false
      }
    }
  },

  // Keyboard navigation assertion
  async toSupportKeyboardNavigation(page: Page) {
    try {
      const a11yHelper = new AccessibilityHelper(page)
      const navResults = await a11yHelper.testKeyboardNavigation()
      
      return {
        message: () => navResults.passed
          ? 'Expected keyboard navigation to fail, but it passed'
          : `Keyboard navigation issues: ${navResults.issues.join(', ')}`,
        pass: navResults.passed
      }
    } catch (error) {
      return {
        message: () => `Failed to test keyboard navigation: ${error}`,
        pass: false
      }
    }
  },

  // Color contrast assertion
  async toHaveValidColorContrast(page: Page, minRatio: number = 4.5) {
    try {
      const a11yHelper = new AccessibilityHelper(page)
      const contrastResults = await a11yHelper.testColorContrast()
      
      return {
        message: () => contrastResults.passed
          ? 'Expected color contrast to fail, but all elements passed'
          : `Color contrast issues: ${contrastResults.issues.slice(0, 5).join(', ')}${contrastResults.issues.length > 5 ? '...' : ''}`,
        pass: contrastResults.passed
      }
    } catch (error) {
      return {
        message: () => `Failed to check color contrast: ${error}`,
        pass: false
      }
    }
  }
})

// Helper functions for common assertion patterns
export const assertionHelpers = {
  // Assert analysis workflow completion
  async assertAnalysisComplete(page: Page, expectedUrl: string) {
    await expect(page).toHaveValidUrl()
    await expect(page.locator('[data-testid="results-container"], .results-display')).toBeVisible()
    
    // Check that URL matches
    const displayedUrl = await page.evaluate(() => {
      const urlElement = document.querySelector('[data-testid*="url"], input[type="url"]')
      return urlElement?.textContent || (urlElement as HTMLInputElement)?.value || ''
    })
    
    expect(displayedUrl.toLowerCase()).toContain(expectedUrl.toLowerCase())
  },

  // Assert error state properly displayed
  async assertErrorState(page: Page, errorType: string) {
    await expect(page.locator('[role="alert"], .error-message')).toBeVisible()
    await expect(page).toHandleError(errorType)
    
    // Check for retry/recovery options
    const hasRetry = await page.locator('button:has-text("retry"), button:has-text("try again")').count() > 0
    const hasNewAnalysis = await page.locator('button:has-text("analyze"), button:has-text("new")').count() > 0
    
    expect(hasRetry || hasNewAnalysis).toBeTruthy()
  },

  // Assert loading state behavior
  async assertLoadingState(page: Page) {
    // Check loading indicator appears
    await expect(page.locator('[data-testid*="loading"], .loading, .spinner')).toBeVisible({ timeout: 5000 })
    
    // Check loading indicator disappears
    await expect(page.locator('[data-testid*="loading"], .loading, .spinner')).not.toBeVisible({ timeout: 30000 })
  },

  // Assert view switching works
  async assertViewSwitching(page: Page) {
    // Test simple view
    await page.getByRole('tab', { name: /simple/i }).click()
    await expect(page.getByRole('tabpanel')).toBeVisible()
    
    // Test technical view
    await page.getByRole('tab', { name: /technical/i }).click()
    await expect(page.getByRole('tabpanel')).toBeVisible()
  },

  // Assert mobile responsiveness
  async assertMobileResponsive(page: Page) {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('body')).toBeVisible()
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('body')).toBeVisible()
    
    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
  },

  // Assert comprehensive accessibility
  async assertA11yCompliance(page: Page) {
    await expect(page).toBeAccessible()
    await expect(page).toSupportKeyboardNavigation()
    await expect(page).toHaveValidColorContrast()
  },

  // Assert performance within acceptable ranges
  async assertPerformanceCompliance(page: Page, thresholds?: Partial<PerformanceThresholds>) {
    const defaultThresholds = {
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      ttfb: 600,
      fcp: 1800
    }
    
    await expect(page).toHavePerformanceWithin(thresholds || defaultThresholds)
  }
}

export { expect }