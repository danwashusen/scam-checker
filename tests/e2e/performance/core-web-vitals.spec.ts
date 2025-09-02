import { test, expect } from '../fixtures'
import { AnalysisPage } from '../pages/analysis.page'
import { PerformanceHelper, defaultThresholds } from '../helpers'

/**
 * Performance Validation E2E Tests (AC-5)
 * Tests Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
 */

test.describe('Core Web Vitals Performance', () => {
  let analysisPage: AnalysisPage
  let performanceHelper: PerformanceHelper

  test.beforeEach(async ({ page }) => {
    analysisPage = new AnalysisPage(page)
    performanceHelper = new PerformanceHelper(page)
    await analysisPage.goto()
  })

  test('should meet LCP (Largest Contentful Paint) target < 2.5s', async ({ page }) => {
    // Measure LCP during page load
    const lcpMetrics = await performanceHelper.measureLCP()
    
    console.log(`LCP: ${lcpMetrics.lcp}ms`)
    
    // LCP should be under 2500ms
    expect(lcpMetrics.lcp).toBeLessThan(2500)
    
    // Should also meet "good" threshold
    expect(lcpMetrics.lcp).toBeLessThan(2500)
  })

  test('should meet FID (First Input Delay) target < 100ms', async ({ page, mockAnalysisSuccess }) => {
    await mockAnalysisSuccess(page, 'https://fid-test.com', 'low')
    
    // Measure FID during user interaction
    const fidMetrics = await performanceHelper.measureInteractionPerformance(async () => {
      await analysisPage.analyzeUrl('https://fid-test.com')
    })
    
    console.log(`FID/Interaction delay: ${fidMetrics.inputDelay || fidMetrics.duration}ms`)
    
    // Input delay should be under 100ms
    if (fidMetrics.inputDelay) {
      expect(fidMetrics.inputDelay).toBeLessThan(100)
    }
    
    // Overall interaction should be responsive
    expect(fidMetrics.duration).toBeLessThan(1000)
  })

  test('should meet CLS (Cumulative Layout Shift) target < 0.1', async ({ page, mockAnalysisSuccess }) => {
    await mockAnalysisSuccess(page, 'https://cls-test.com', 'medium')
    
    // Measure CLS during analysis workflow
    const clsScore = await performanceHelper.measureCLS(async () => {
      await analysisPage.analyzeUrl('https://cls-test.com')
      await analysisPage.waitForResults()
      
      // Switch views to test layout stability
      if (await analysisPage.viewTabs.isVisible()) {
        await analysisPage.switchView('technical')
        await analysisPage.switchView('simple')
      }
    })
    
    console.log(`CLS: ${clsScore}`)
    
    // CLS should be under 0.1
    expect(clsScore).toBeLessThan(0.1)
    
    // Should also meet "good" threshold
    expect(clsScore).toBeLessThan(0.1)
  })

  test('should measure comprehensive Core Web Vitals during analysis', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://comprehensive-vitals-test.com', 'high')
    
    // Measure all Core Web Vitals together
    const allMetrics = await performanceHelper.measureCoreWebVitals()
    
    console.log('All Core Web Vitals:', allMetrics)
    
    // Validate against default thresholds
    const validation = performanceHelper.validatePerformance(allMetrics)
    
    if (!validation.passed) {
      console.log('Performance Issues:', validation.issues)
      console.log('Performance Report:', performanceHelper.createReport(allMetrics, validation))
    }
    
    // All metrics should pass
    expect(validation.passed).toBe(true)
    
    // Individual checks
    expect(allMetrics.lcp).toBeLessThan(defaultThresholds.lcp)
    expect(allMetrics.fid || 0).toBeLessThan(defaultThresholds.fid)
    expect(allMetrics.cls).toBeLessThan(defaultThresholds.cls)
  })

  test('should maintain performance during repeated analyses', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    const testUrls = [
      'https://repeated-test-1.com',
      'https://repeated-test-2.com',
      'https://repeated-test-3.com'
    ]
    
    const performanceResults = []
    
    for (const url of testUrls) {
      await mockAnalysisSuccess(page, url, 'medium')
      
      const startTime = Date.now()
      
      // Measure performance for this analysis
      const metrics = await performanceHelper.measureInteractionPerformance(async () => {
        await analysisPage.clearUrl()
        await analysisPage.analyzeUrl(url)
        await analysisPage.waitForResults()
      })
      
      const totalTime = Date.now() - startTime
      
      performanceResults.push({
        url,
        duration: metrics.duration,
        totalTime,
        lcp: metrics.lcp
      })
    }
    
    console.log('Repeated Analysis Performance:', performanceResults)
    
    // All analyses should complete within reasonable time
    performanceResults.forEach((result, index) => {
      expect(result.totalTime).toBeLessThan(5000) // 5 seconds total
      expect(result.duration).toBeLessThan(3000)   // 3 seconds interaction
      
      // Performance should not degrade significantly over time
      if (index > 0) {
        const previousResult = performanceResults[index - 1]
        const performanceDelta = result.duration - previousResult.duration
        
        // Performance shouldn't degrade by more than 50%
        expect(performanceDelta).toBeLessThan(previousResult.duration * 0.5)
      }
    })
  })

  test('should measure TTFB (Time to First Byte) for API calls', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://ttfb-test.com', 'low')
    
    // Measure TTFB during API call
    const ttfbMetrics = await performanceHelper.measureTTFB(async () => {
      await analysisPage.analyzeUrl('https://ttfb-test.com')
    })
    
    console.log(`TTFB: ${ttfbMetrics.ttfb}ms`)
    
    // TTFB should be under 600ms
    expect(ttfbMetrics.ttfb).toBeLessThan(600)
    
    // Should also meet "good" threshold
    expect(ttfbMetrics.ttfb).toBeLessThan(800)
  })

  test('should measure FCP (First Contentful Paint)', async ({ page }) => {
    // Measure FCP during initial page load
    const fcpMetrics = await performanceHelper.measureFCP()
    
    console.log(`FCP: ${fcpMetrics.fcp}ms`)
    
    // FCP should be under 1.8s
    expect(fcpMetrics.fcp).toBeLessThan(1800)
    
    // Should also meet "good" threshold
    expect(fcpMetrics.fcp).toBeLessThan(1800)
  })

  test('should validate performance across different viewport sizes', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ]
    
    const viewportPerformance = []
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await mockAnalysisSuccess(page, 'https://viewport-perf-test.com', 'medium')
      
      // Measure performance for this viewport
      const metrics = await performanceHelper.measureInteractionPerformance(async () => {
        await analysisPage.analyzeUrl('https://viewport-perf-test.com')
        await analysisPage.waitForResults()
      })
      
      viewportPerformance.push({
        viewport: viewport.name,
        ...metrics
      })
    }
    
    console.log('Viewport Performance:', viewportPerformance)
    
    // All viewports should meet performance targets
    viewportPerformance.forEach((perf) => {
      expect(perf.duration).toBeLessThan(3000) // 3 second interaction limit
      
      // Mobile might be slightly slower, but not excessively
      if (perf.viewport === 'Mobile') {
        expect(perf.duration).toBeLessThan(4000)
      }
    })
  })

  test('should monitor memory usage during analysis', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://memory-test.com', 'high')
    
    // Measure memory usage
    const memoryMetrics = await performanceHelper.measureMemoryUsage(async () => {
      await analysisPage.analyzeUrl('https://memory-test.com')
      await analysisPage.waitForResults()
      
      // Perform some interactions to test memory
      for (let i = 0; i < 5; i++) {
        if (await analysisPage.viewTabs.isVisible()) {
          await analysisPage.switchView('technical')
          await analysisPage.switchView('simple')
        }
      }
    })
    
    console.log('Memory Metrics:', memoryMetrics)
    
    // Memory usage should be reasonable
    if (memoryMetrics.heapUsed) {
      expect(memoryMetrics.heapUsed).toBeLessThan(50 * 1024 * 1024) // 50MB
    }
    
    // No significant memory leaks
    if (memoryMetrics.heapGrowth) {
      expect(memoryMetrics.heapGrowth).toBeLessThan(10 * 1024 * 1024) // 10MB growth
    }
  })
})

test.describe('Performance Under Load', () => {
  let analysisPage: AnalysisPage
  let performanceHelper: PerformanceHelper

  test.beforeEach(async ({ page }) => {
    analysisPage = new AnalysisPage(page)
    performanceHelper = new PerformanceHelper(page)
    await analysisPage.goto()
  })

  test('should maintain performance with slow network conditions', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    // Simulate slow 3G network
    await page.route('/api/analyze', async (route) => {
      // Add delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            url: 'https://slow-network-test.com',
            riskScore: 40,
            riskLevel: 'medium',
            factors: [],
            timestamp: new Date().toISOString(),
            explanation: 'Slow network test'
          }
        })
      })
    })
    
    const startTime = Date.now()
    
    await analysisPage.analyzeUrl('https://slow-network-test.com')
    await analysisPage.waitForResults()
    
    const totalTime = Date.now() - startTime
    
    console.log(`Slow network total time: ${totalTime}ms`)
    
    // Should handle slow network gracefully
    expect(totalTime).toBeLessThan(10000) // 10 second timeout
    
    // Results should still be displayed
    await expect(analysisPage.resultsContainer).toBeVisible()
  })

  test('should handle performance during error scenarios', async ({ 
    page, 
    mockAnalysisError 
  }) => {
    await mockAnalysisError(page, 500, {
      success: false,
      error: 'SERVER_ERROR',
      message: 'Server error for performance test'
    })
    
    const metrics = await performanceHelper.measureInteractionPerformance(async () => {
      await analysisPage.analyzeUrl('https://error-performance-test.com')
      
      // Wait for error to be displayed
      await expect(page).toHandleError('server error')
    })
    
    console.log('Error scenario performance:', metrics)
    
    // Error handling should also be performant
    expect(metrics.duration).toBeLessThan(2000) // 2 seconds for error display
  })

  test('should validate bundle size impact on performance', async ({ page }) => {
    // Check JavaScript bundle loading performance
    const bundleMetrics = await page.evaluate(() => {
      const resourceEntries = performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('.js'))
      
      const totalSize = resourceEntries.reduce((sum, entry) => {
        return sum + (entry.transferSize || 0)
      }, 0)
      
      const totalLoadTime = resourceEntries.reduce((max, entry) => {
        return Math.max(max, entry.responseEnd - entry.startTime)
      }, 0)
      
      return {
        totalSize,
        totalLoadTime,
        scriptCount: resourceEntries.length
      }
    })
    
    console.log('Bundle metrics:', bundleMetrics)
    
    // Bundle should not be too large
    expect(bundleMetrics.totalSize).toBeLessThan(200 * 1024) // 200KB
    
    // Bundle should load quickly
    expect(bundleMetrics.totalLoadTime).toBeLessThan(3000) // 3 seconds
  })
})