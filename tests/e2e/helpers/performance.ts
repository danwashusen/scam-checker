import { Page } from '@playwright/test'
import { PerformanceMetrics, PerformanceThresholds } from '../types/test-types'
import lighthouse from 'lighthouse'

/**
 * Performance testing utilities for measuring and validating Core Web Vitals
 * and other performance metrics during E2E tests
 */

// Default performance thresholds based on implementation plan
export const defaultThresholds: PerformanceThresholds = {
  lcp: 2500,    // Largest Contentful Paint < 2.5s
  fid: 100,     // First Input Delay < 100ms
  cls: 0.1,     // Cumulative Layout Shift < 0.1
  ttfb: 600,    // Time to First Byte < 600ms
  fcp: 1800,    // First Contentful Paint < 1.8s
  bundleSize: 204800  // Bundle size < 200KB
}

export class PerformanceHelper {
  private page: Page
  
  constructor(page: Page) {
    this.page = page
  }

  /**
   * Measure Core Web Vitals during page load
   */
  async measureCoreWebVitals(): Promise<PerformanceMetrics> {
    return await this.page.evaluate(() => {
      return new Promise<PerformanceMetrics>((resolve) => {
        const metrics: Partial<PerformanceMetrics> = {}
        let metricsCollected = 0
        const totalMetrics = 5

        // Function to check if all metrics are collected
        const checkComplete = () => {
          if (metricsCollected >= totalMetrics - 2) { // FID might not always be available
            resolve({
              lcp: metrics.lcp || 0,
              fid: metrics.fid || 0,
              cls: metrics.cls || 0,
              ttfb: metrics.ttfb || 0,
              fcp: metrics.fcp || 0
            })
          }
        }

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          if (entries.length > 0) {
            metrics.lcp = entries[entries.length - 1].startTime
            metricsCollected++
            checkComplete()
          }
        })
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

        // First Input Delay
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          entries.forEach((entry: any) => {
            if (entry.name === 'first-input') {
              metrics.fid = entry.processingStart - entry.startTime
              metricsCollected++
              checkComplete()
            }
          })
        })
        try {
          fidObserver.observe({ type: 'first-input', buffered: true })
        } catch (e) {
          // FID might not be available in all browsers
          metricsCollected++
          checkComplete()
        }

        // Cumulative Layout Shift
        let clsValue = 0
        const clsObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          })
          metrics.cls = clsValue
          metricsCollected++
          checkComplete()
        })
        clsObserver.observe({ type: 'layout-shift', buffered: true })

        // Navigation timing for TTFB and FCP
        const processNavigationTiming = () => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          if (navigation) {
            metrics.ttfb = navigation.responseStart - navigation.requestStart
            metricsCollected++
          }

          const paintEntries = performance.getEntriesByType('paint')
          const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
          if (fcpEntry) {
            metrics.fcp = fcpEntry.startTime
            metricsCollected++
          }
          
          checkComplete()
        }

        // Wait for navigation to complete
        if (document.readyState === 'complete') {
          processNavigationTiming()
        } else {
          window.addEventListener('load', processNavigationTiming)
        }

        // Fallback timeout
        setTimeout(() => {
          processNavigationTiming()
          resolve({
            lcp: metrics.lcp || 0,
            fid: metrics.fid || 0,
            cls: metrics.cls || 0,
            ttfb: metrics.ttfb || 0,
            fcp: metrics.fcp || 0
          })
        }, 10000)
      })
    })
  }

  /**
   * Run Lighthouse performance audit
   */
  async runLighthouseAudit(): Promise<number> {
    try {
      const url = this.page.url()
      const result = await lighthouse(url, {
        port: 9222, // Chrome DevTools port
        output: 'json',
        onlyCategories: ['performance'],
        settings: {
          onlyAudits: [
            'first-contentful-paint',
            'largest-contentful-paint',
            'first-input-delay',
            'cumulative-layout-shift',
            'speed-index'
          ]
        }
      })

      return result?.lhr?.categories?.performance?.score ? 
        Math.round(result.lhr.categories.performance.score * 100) : 0
    } catch (error) {
      console.warn('Lighthouse audit failed:', error)
      return 0
    }
  }

  /**
   * Measure bundle size and resource loading
   */
  async measureResourceMetrics(): Promise<{
    totalSize: number
    jsSize: number
    cssSize: number
    imageSize: number
    resourceCount: number
  }> {
    return await this.page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      
      let totalSize = 0
      let jsSize = 0
      let cssSize = 0
      let imageSize = 0
      
      resources.forEach(resource => {
        const size = resource.transferSize || 0
        totalSize += size
        
        if (resource.name.includes('.js')) {
          jsSize += size
        } else if (resource.name.includes('.css')) {
          cssSize += size
        } else if (resource.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          imageSize += size
        }
      })
      
      return {
        totalSize,
        jsSize,
        cssSize,
        imageSize,
        resourceCount: resources.length
      }
    })
  }

  /**
   * Monitor performance during user interactions
   */
  async measureInteractionPerformance(interaction: () => Promise<void>): Promise<{
    duration: number
    memoryUsage?: number
    fcp?: number
  }> {
    const startTime = Date.now()
    
    // Clear existing performance marks
    await this.page.evaluate(() => {
      performance.clearMarks()
      performance.clearMeasures()
      performance.mark('interaction-start')
    })
    
    await interaction()
    
    const metrics = await this.page.evaluate(() => {
      performance.mark('interaction-end')
      performance.measure('interaction-duration', 'interaction-start', 'interaction-end')
      
      const measure = performance.getEntriesByName('interaction-duration')[0]
      const memoryInfo = (performance as any).memory
      
      return {
        duration: measure?.duration || 0,
        memoryUsage: memoryInfo ? {
          used: memoryInfo.usedJSHeapSize,
          total: memoryInfo.totalJSHeapSize,
          limit: memoryInfo.jsHeapSizeLimit
        } : undefined
      }
    })
    
    return {
      duration: Date.now() - startTime,
      memoryUsage: metrics.memoryUsage?.used,
      ...metrics
    }
  }

  /**
   * Validate performance against thresholds
   */
  validatePerformance(metrics: PerformanceMetrics, thresholds: PerformanceThresholds = defaultThresholds): {
    passed: boolean
    failures: string[]
    details: Record<string, { actual: number, threshold: number, passed: boolean }>
  } {
    const failures: string[] = []
    const details: Record<string, { actual: number, threshold: number, passed: boolean }> = {}
    
    // Check each metric
    Object.keys(thresholds).forEach(key => {
      const metricKey = key as keyof PerformanceMetrics
      const actual = metrics[metricKey]
      const threshold = thresholds[metricKey as keyof PerformanceThresholds]
      const passed = actual <= threshold
      
      details[key] = { actual, threshold, passed }
      
      if (!passed) {
        failures.push(`${key.toUpperCase()}: ${actual}ms > ${threshold}ms`)
      }
    })
    
    return {
      passed: failures.length === 0,
      failures,
      details
    }
  }

  /**
   * Wait for page to be fully loaded and stable
   */
  async waitForStablePerformance(timeout: number = 30000): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const isStable = await this.page.evaluate(() => {
        // Check if there are any ongoing network requests
        const resources = performance.getEntriesByType('resource')
        const recentResources = resources.filter(resource => 
          Date.now() - resource.startTime < 1000
        )
        
        // Check if layout is stable (no recent layout shifts)
        let hasRecentShifts = false
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          hasRecentShifts = entries.some((entry: any) => 
            Date.now() - entry.startTime < 1000 && !entry.hadRecentInput
          )
        })
        
        try {
          observer.observe({ type: 'layout-shift', buffered: true })
        } catch (e) {
          // Layout shift observer not available
        }
        
        return recentResources.length === 0 && !hasRecentShifts
      })
      
      if (isStable) {
        await this.page.waitForTimeout(500) // Wait a bit more to be sure
        break
      }
      
      await this.page.waitForTimeout(100)
    }
  }

  /**
   * Create performance report
   */
  createReport(metrics: PerformanceMetrics, validation: ReturnType<typeof this.validatePerformance>): string {
    const report = [
      '=== Performance Report ===',
      `LCP: ${metrics.lcp.toFixed(2)}ms (${validation.details.lcp?.passed ? 'PASS' : 'FAIL'})`,
      `FID: ${metrics.fid.toFixed(2)}ms (${validation.details.fid?.passed ? 'PASS' : 'FAIL'})`,
      `CLS: ${metrics.cls.toFixed(3)} (${validation.details.cls?.passed ? 'PASS' : 'FAIL'})`,
      `TTFB: ${metrics.ttfb.toFixed(2)}ms (${validation.details.ttfb?.passed ? 'PASS' : 'FAIL'})`,
      `FCP: ${metrics.fcp.toFixed(2)}ms (${validation.details.fcp?.passed ? 'PASS' : 'FAIL'})`,
      '',
      `Overall: ${validation.passed ? 'PASS' : 'FAIL'}`,
      validation.failures.length > 0 ? `Failures: ${validation.failures.join(', ')}` : ''
    ].filter(Boolean).join('\n')
    
    return report
  }
}

// Static helper functions
export const performanceHelpers = {
  // Create performance helper instance
  create: (page: Page): PerformanceHelper => new PerformanceHelper(page),
  
  // Quick performance check
  quickCheck: async (page: Page, thresholds?: Partial<PerformanceThresholds>): Promise<boolean> => {
    const helper = new PerformanceHelper(page)
    const metrics = await helper.measureCoreWebVitals()
    const validation = helper.validatePerformance(metrics, { ...defaultThresholds, ...thresholds })
    return validation.passed
  },
  
  // Performance test with automatic retry
  testWithRetry: async (
    page: Page, 
    testFn: () => Promise<void>, 
    maxRetries: number = 3,
    thresholds?: Partial<PerformanceThresholds>
  ): Promise<{ passed: boolean, attempts: number, lastMetrics?: PerformanceMetrics }> => {
    let attempts = 0
    let lastMetrics: PerformanceMetrics | undefined
    
    while (attempts < maxRetries) {
      attempts++
      
      await testFn()
      
      const helper = new PerformanceHelper(page)
      await helper.waitForStablePerformance()
      lastMetrics = await helper.measureCoreWebVitals()
      
      const validation = helper.validatePerformance(lastMetrics, { ...defaultThresholds, ...thresholds })
      
      if (validation.passed) {
        return { passed: true, attempts, lastMetrics }
      }
      
      if (attempts < maxRetries) {
        console.log(`Performance test failed (attempt ${attempts}/${maxRetries}), retrying...`)
        await page.waitForTimeout(1000)
      }
    }
    
    return { passed: false, attempts, lastMetrics }
  },

  // Get common performance test scenarios
  getTestScenarios: () => ({
    'fast-3g': {
      name: 'Fast 3G Network',
      conditions: { offline: false, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 150 }
    },
    'slow-3g': {
      name: 'Slow 3G Network',
      conditions: { offline: false, downloadThroughput: 500 * 1024 / 8, uploadThroughput: 500 * 1024 / 8, latency: 400 }
    },
    'offline': {
      name: 'Offline',
      conditions: { offline: true, downloadThroughput: 0, uploadThroughput: 0, latency: 0 }
    }
  })
}