import { Page, Locator, expect } from '@playwright/test'
import { injectAxe, checkA11y, type AxeResults } from '@axe-core/playwright'

/**
 * Base Page Object Model class providing common functionality
 * for all page objects in the E2E test suite
 */
export abstract class BasePage {
  protected readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Navigate to a specific path relative to the base URL
   */
  async navigate(path: string): Promise<void> {
    await this.page.goto(path)
  }

  /**
   * Wait for the page to fully load including network idle state
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    })
  }

  /**
   * Perform accessibility check using axe-core
   */
  async checkAccessibility(): Promise<AxeResults> {
    await injectAxe(this.page)
    const results = await checkA11y(this.page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    })
    return results
  }

  /**
   * Measure Core Web Vitals performance metrics
   */
  async measurePerformance(): Promise<PerformanceMetrics> {
    const metrics = await this.page.evaluate(() => {
      return new Promise<PerformanceMetrics>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const metricsData: Partial<PerformanceMetrics> = {}

          for (const entry of entries) {
            if (entry.entryType === 'largest-contentful-paint') {
              metricsData.lcp = entry.startTime
            }
            if (entry.entryType === 'first-input') {
              metricsData.fid = entry.processingStart - entry.startTime
            }
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              metricsData.cls = (metricsData.cls || 0) + entry.value
            }
          }

          // Navigation timing for TTFB and FCP
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          if (navigation) {
            metricsData.ttfb = navigation.responseStart - navigation.requestStart
          }

          const paintEntries = performance.getEntriesByType('paint')
          const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
          if (fcpEntry) {
            metricsData.fcp = fcpEntry.startTime
          }

          resolve(metricsData as PerformanceMetrics)
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })

        // Fallback timeout
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          const paintEntries = performance.getEntriesByType('paint')
          const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
          
          resolve({
            lcp: 0, // Will be populated by observer if available
            fid: 0, // Will be populated by observer if available
            cls: 0, // Will be populated by observer if available
            ttfb: navigation ? navigation.responseStart - navigation.requestStart : 0,
            fcp: fcpEntry ? fcpEntry.startTime : 0
          })
        }, 5000)
      })
    })

    return metrics
  }

  /**
   * Wait for a specific selector to be visible
   */
  protected async waitForSelector(selector: string, timeout = 10000): Promise<Locator> {
    const locator = this.page.locator(selector)
    await expect(locator).toBeVisible({ timeout })
    return locator
  }

  /**
   * Wait for text content to be visible on the page
   */
  protected async waitForText(text: string, timeout = 10000): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible({ timeout })
  }

  /**
   * Scroll element into view
   */
  protected async scrollIntoView(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded()
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url()
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title()
  }

  /**
   * Check if page has error messages visible
   */
  async hasErrorMessages(): Promise<boolean> {
    const errorSelectors = [
      '[role="alert"]',
      '.error-message',
      '[data-testid*="error"]',
      '.text-red-500' // Tailwind error text
    ]

    for (const selector of errorSelectors) {
      const elements = this.page.locator(selector)
      const count = await elements.count()
      if (count > 0) {
        return true
      }
    }
    return false
  }

  /**
   * Wait for loading states to complete
   */
  async waitForLoadingToComplete(): Promise<void> {
    // Wait for common loading indicators to disappear
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      'text=Loading...',
      'text=Analyzing...'
    ]

    for (const selector of loadingSelectors) {
      try {
        await this.page.waitForSelector(selector, { state: 'detached', timeout: 30000 })
      } catch (error) {
        // Loading selector might not exist, continue
        continue
      }
    }
  }
}

/**
 * Performance metrics interface matching implementation plan
 */
export interface PerformanceMetrics {
  lcp: number  // Largest Contentful Paint
  fid: number  // First Input Delay
  cls: number  // Cumulative Layout Shift
  ttfb: number // Time to First Byte
  fcp: number  // First Contentful Paint
}