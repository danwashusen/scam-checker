import { test, expect } from '../fixtures'
import { AnalysisPage } from '../pages/analysis.page'
import { AccessibilityHelper, defaultA11yConfig, assertionHelpers } from '../helpers'

/**
 * Accessibility Compliance E2E Tests (AC-6)
 * Tests keyboard navigation, screen reader compatibility, and WCAG 2.1 AA compliance
 */

test.describe('WCAG 2.1 AA Compliance', () => {
  let analysisPage: AnalysisPage
  let a11yHelper: AccessibilityHelper

  test.beforeEach(async ({ page }) => {
    analysisPage = new AnalysisPage(page)
    a11yHelper = new AccessibilityHelper(page)
    await analysisPage.goto()
  })

  test('should pass automated accessibility audit', async ({ page }) => {
    // Run comprehensive WCAG audit
    const auditResults = await a11yHelper.runWCAGAudit(defaultA11yConfig)
    
    console.log(`Accessibility score: ${auditResults.score}/100`)
    console.log(`Violations found: ${auditResults.violations.length}`)
    
    if (!auditResults.passed) {
      console.log('Accessibility violations:', auditResults.violations.map(v => v.description))
    }
    
    // Should pass WCAG 2.1 AA standards
    expect(auditResults.passed).toBe(true)
    expect(auditResults.score).toBeGreaterThan(95)
    expect(auditResults.violations.length).toBe(0)
  })

  test('should support comprehensive keyboard navigation', async ({ page }) => {
    // Test keyboard navigation through the interface
    const navResults = await a11yHelper.testKeyboardNavigation()
    
    console.log(`Focusable elements: ${navResults.focusableElements}`)
    console.log(`Navigation issues: ${navResults.issues.length}`)
    
    if (!navResults.passed) {
      console.log('Keyboard navigation issues:', navResults.issues)
    }
    
    // Should support full keyboard navigation
    expect(navResults.passed).toBe(true)
    expect(navResults.focusableElements).toBeGreaterThan(0)
    expect(navResults.issues.length).toBe(0)
  })

  test('should maintain focus management during analysis workflow', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://focus-management-test.com', 'medium')
    
    // Start with URL input focused
    await analysisPage.urlInput.focus()
    await expect(page).toHaveFocusVisible()
    
    // Type URL using keyboard
    await page.keyboard.type('https://focus-management-test.com')
    await expect(analysisPage.urlInput).toHaveValue('https://focus-management-test.com')
    
    // Submit using Enter key
    await page.keyboard.press('Enter')
    
    // Focus should be managed during loading
    await analysisPage.waitForResults()
    
    // After results load, focus should be on a meaningful element
    const activeElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(activeElement).not.toBe('BODY') // Should not lose focus to body
    
    // Should be able to navigate results with keyboard
    await page.keyboard.press('Tab')
    await expect(page).toHaveFocusVisible()
  })

  test('should provide proper screen reader announcements', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://screen-reader-test.com', 'high')
    
    // Check for proper ARIA labels and roles
    const ariaLabels = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]')
      return Array.from(elements).map(el => ({
        tag: el.tagName,
        role: el.getAttribute('role'),
        label: el.getAttribute('aria-label'),
        labelledby: el.getAttribute('aria-labelledby'),
        describedby: el.getAttribute('aria-describedby')
      }))
    })
    
    console.log('ARIA labels found:', ariaLabels)
    
    // Key elements should have proper ARIA attributes
    expect(ariaLabels.length).toBeGreaterThan(0)
    
    // Perform analysis
    await analysisPage.analyzeUrl('https://screen-reader-test.com')
    await analysisPage.waitForResults()
    
    // Check for live regions for dynamic content
    const liveRegions = await page.evaluate(() => {
      const regions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]')
      return Array.from(regions).map(el => ({
        tag: el.tagName,
        ariaLive: el.getAttribute('aria-live'),
        role: el.getAttribute('role'),
        content: el.textContent?.substring(0, 100)
      }))
    })
    
    console.log('Live regions:', liveRegions)
    
    // Should have live regions for dynamic updates
    expect(liveRegions.length).toBeGreaterThan(0)
  })

  test('should meet color contrast requirements', async ({ page }) => {
    // Test color contrast ratios
    const contrastResults = await a11yHelper.testColorContrast()
    
    console.log(`Color contrast issues: ${contrastResults.issues.length}`)
    
    if (!contrastResults.passed) {
      console.log('Color contrast issues:', contrastResults.issues.slice(0, 5))
    }
    
    // Should meet WCAG AA contrast requirements (4.5:1 for normal text)
    expect(contrastResults.passed).toBe(true)
    expect(contrastResults.issues.length).toBe(0)
  })

  test('should support keyboard navigation in results views', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://keyboard-results-test.com', 'medium')
    
    await analysisPage.analyzeUrl('https://keyboard-results-test.com')
    await analysisPage.waitForResults()
    
    // Test keyboard navigation through view tabs
    if (await analysisPage.viewTabs.isVisible()) {
      // Focus first tab
      await analysisPage.simpleViewTab.focus()
      await expect(page).toHaveFocusVisible()
      
      // Use arrow keys to navigate tabs (if supported)
      await page.keyboard.press('ArrowRight')
      
      // Should focus technical tab
      const focusedTab = await page.evaluate(() => {
        const activeEl = document.activeElement
        return activeEl?.getAttribute('role') === 'tab' ? activeEl.textContent : null
      })
      
      if (focusedTab) {
        expect(focusedTab.toLowerCase()).toMatch(/technical/)
      }
      
      // Enter should activate tab
      await page.keyboard.press('Enter')
      await expect(analysisPage.isTechnicalViewVisible()).resolves.toBe(true)
    }
  })

  test('should provide meaningful error announcements', async ({ 
    page, 
    mockAnalysisError 
  }) => {
    await mockAnalysisError(page, 400, {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Please enter a valid URL'
    })
    
    // Submit invalid URL
    await analysisPage.analyzeUrl('invalid-url')
    
    // Error should be announced to screen readers
    const errorRegion = page.locator('[role="alert"], [aria-live="assertive"]')
    await expect(errorRegion).toBeVisible()
    
    // Error message should be descriptive
    const errorText = await errorRegion.textContent()
    expect(errorText).toMatch(/valid|url|error/i)
    
    // Focus should move to error or remain on input
    const activeElement = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      type: (document.activeElement as HTMLInputElement)?.type,
      role: document.activeElement?.getAttribute('role')
    }))
    
    // Should focus input or error element
    expect(activeElement.tag).toMatch(/INPUT|DIV/)
  })

  test('should support high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.evaluate(() => {
      document.documentElement.style.filter = 'contrast(200%) brightness(150%)'
    })
    
    // Check that content is still readable
    await expect(analysisPage.urlInput).toBeVisible()
    await expect(analysisPage.analyzeButton).toBeVisible()
    
    // Text should remain readable
    const textElements = page.locator('h1, h2, p, label, button')
    const count = await textElements.count()
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(textElements.nth(i)).toBeVisible()
    }
  })

  test('should support reduced motion preferences', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    // Set prefers-reduced-motion
    await page.evaluate(() => {
      const style = document.createElement('style')
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `
      document.head.appendChild(style)
    })
    
    await mockAnalysisSuccess(page, 'https://reduced-motion-test.com', 'low')
    
    await analysisPage.analyzeUrl('https://reduced-motion-test.com')
    await analysisPage.waitForResults()
    
    // Results should still be functional without animations
    await expect(analysisPage.resultsContainer).toBeVisible()
    await expect(analysisPage.riskGauge).toBeVisible()
    
    // View switching should work without animations
    if (await analysisPage.viewTabs.isVisible()) {
      await analysisPage.switchView('technical')
      await expect(analysisPage.isTechnicalViewVisible()).resolves.toBe(true)
    }
  })

  test('should provide descriptive form labels and instructions', async ({ page }) => {
    // Check form labeling
    const formElements = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, select')
      return Array.from(inputs).map(input => ({
        type: input.type || input.tagName,
        hasLabel: !!input.getAttribute('aria-label') || 
                  !!input.getAttribute('aria-labelledby') ||
                  !!document.querySelector(`label[for="${input.id}"]`),
        hasDescription: !!input.getAttribute('aria-describedby'),
        placeholder: input.getAttribute('placeholder'),
        required: input.hasAttribute('required')
      }))
    })
    
    console.log('Form elements:', formElements)
    
    // All form elements should have proper labels
    formElements.forEach((element, index) => {
      expect(element.hasLabel || element.placeholder).toBe(true)
    })
  })
})

test.describe('Screen Reader Compatibility', () => {
  let analysisPage: AnalysisPage
  let a11yHelper: AccessibilityHelper

  test.beforeEach(async ({ page }) => {
    analysisPage = new AnalysisPage(page)
    a11yHelper = new AccessibilityHelper(page)
    await analysisPage.goto()
  })

  test('should provide proper heading structure', async ({ page }) => {
    // Check heading hierarchy
    const headings = await page.evaluate(() => {
      const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      return Array.from(headingElements).map(h => ({
        level: parseInt(h.tagName.substring(1)),
        text: h.textContent?.trim(),
        visible: h.offsetParent !== null
      }))
    })
    
    console.log('Headings found:', headings)
    
    // Should have logical heading structure
    expect(headings.length).toBeGreaterThan(0)
    
    // Should start with h1
    const firstHeading = headings.find(h => h.visible)
    if (firstHeading) {
      expect(firstHeading.level).toBe(1)
    }
  })

  test('should provide meaningful page titles', async ({ page }) => {
    const title = await page.title()
    console.log('Page title:', title)
    
    // Title should be descriptive
    expect(title).toBeTruthy()
    expect(title.length).toBeGreaterThan(0)
    expect(title).toMatch(/scam|checker|analyzer|security/i)
  })

  test('should support landmark navigation', async ({ page }) => {
    // Check for proper landmark roles
    const landmarks = await page.evaluate(() => {
      const landmarkElements = document.querySelectorAll(
        '[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], ' +
        'main, nav, header, footer, aside'
      )
      
      return Array.from(landmarkElements).map(el => ({
        tag: el.tagName,
        role: el.getAttribute('role') || el.tagName.toLowerCase(),
        visible: el.offsetParent !== null
      }))
    })
    
    console.log('Landmarks found:', landmarks)
    
    // Should have main content area
    const hasMain = landmarks.some(l => l.role === 'main' || l.role === 'MAIN')
    expect(hasMain).toBe(true)
  })

  test('should announce dynamic content changes', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://dynamic-content-test.com', 'medium')
    
    // Check for aria-live regions before analysis
    const initialLiveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').count()
    
    await analysisPage.analyzeUrl('https://dynamic-content-test.com')
    await analysisPage.waitForResults()
    
    // Should have live regions for announcing results
    const finalLiveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').count()
    
    expect(finalLiveRegions).toBeGreaterThanOrEqual(initialLiveRegions)
    
    // Check that results content has proper structure
    const resultsAnnouncements = await page.evaluate(() => {
      const liveElements = document.querySelectorAll('[aria-live], [role="status"]')
      return Array.from(liveElements)
        .map(el => el.textContent?.trim())
        .filter(text => text && text.length > 0)
    })
    
    console.log('Results announcements:', resultsAnnouncements)
    expect(resultsAnnouncements.length).toBeGreaterThan(0)
  })

  test('should provide alternative text for images and graphics', async ({ 
    page, 
    mockAnalysisSuccess 
  }) => {
    await mockAnalysisSuccess(page, 'https://alt-text-test.com', 'high')
    
    await analysisPage.analyzeUrl('https://alt-text-test.com')
    await analysisPage.waitForResults()
    
    // Check for images without alt text
    const imagesWithoutAlt = await page.evaluate(() => {
      const images = document.querySelectorAll('img')
      return Array.from(images).filter(img => 
        !img.hasAttribute('alt') && 
        !img.hasAttribute('aria-label') &&
        !img.hasAttribute('aria-labelledby')
      ).length
    })
    
    // Should not have images without alternative text
    expect(imagesWithoutAlt).toBe(0)
    
    // Check SVGs have proper accessibility
    const svgsWithoutAccess = await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg')
      return Array.from(svgs).filter(svg => 
        !svg.hasAttribute('aria-hidden') &&
        !svg.hasAttribute('aria-label') &&
        !svg.hasAttribute('aria-labelledby') &&
        !svg.querySelector('title')
      ).length
    })
    
    // SVGs should be either hidden or have accessibility info
    expect(svgsWithoutAccess).toBe(0)
  })
})