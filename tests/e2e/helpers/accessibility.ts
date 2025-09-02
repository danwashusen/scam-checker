import { Page } from '@playwright/test'
import { injectAxe, checkA11y, type AxeResults } from '@axe-core/playwright'
import { AccessibilityViolation, AccessibilityConfig } from '../types/test-types'

/**
 * Accessibility testing utilities for WCAG compliance and keyboard navigation
 * Provides comprehensive a11y testing during E2E flows
 */

// Default accessibility configuration
export const defaultA11yConfig: AccessibilityConfig = {
  level: 'AA',
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  exclude: [],
  include: []
}

export class AccessibilityHelper {
  private page: Page
  
  constructor(page: Page) {
    this.page = page
  }

  /**
   * Run comprehensive WCAG accessibility audit
   */
  async runWCAGAudit(config: AccessibilityConfig = defaultA11yConfig): Promise<{
    passed: boolean
    violations: AccessibilityViolation[]
    score: number
  }> {
    await injectAxe(this.page)
    
    const axeConfig = {
      tags: config.tags,
      exclude: config.exclude,
      include: config.include.length > 0 ? config.include : undefined
    }
    
    try {
      const results = await checkA11y(this.page, undefined, {
        axeOptions: axeConfig,
        detailedReport: true,
        detailedReportOptions: { html: true }
      })
      
      const violations: AccessibilityViolation[] = results.violations.map(violation => ({
        id: violation.id,
        impact: violation.impact as 'minor' | 'moderate' | 'serious' | 'critical',
        description: violation.description,
        nodes: violation.nodes.map(node => ({
          html: node.html,
          target: node.target,
          failureSummary: node.failureSummary
        }))
      }))
      
      const criticalCount = violations.filter(v => v.impact === 'critical').length
      const seriousCount = violations.filter(v => v.impact === 'serious').length
      const moderateCount = violations.filter(v => v.impact === 'moderate').length
      const minorCount = violations.filter(v => v.impact === 'minor').length
      
      // Calculate score (100 - weighted violation count)
      const score = Math.max(0, 100 - (criticalCount * 10 + seriousCount * 5 + moderateCount * 2 + minorCount * 1))
      
      return {
        passed: criticalCount === 0 && seriousCount === 0,
        violations,
        score
      }
    } catch (error) {
      console.error('Accessibility audit failed:', error)
      return {
        passed: false,
        violations: [],
        score: 0
      }
    }
  }

  /**
   * Test keyboard navigation throughout the application
   */
  async testKeyboardNavigation(): Promise<{
    passed: boolean
    issues: string[]
    focusableElements: number
  }> {
    const issues: string[] = []
    
    // Get all focusable elements
    const focusableElements = await this.page.evaluate(() => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[role="button"]',
        '[role="link"]'
      ]
      
      return document.querySelectorAll(focusableSelectors.join(',')).length
    })
    
    if (focusableElements === 0) {
      issues.push('No focusable elements found on page')
      return { passed: false, issues, focusableElements }
    }
    
    // Test tab navigation
    try {
      await this.page.keyboard.press('Tab')
      const firstFocused = await this.page.evaluate(() => document.activeElement?.tagName)
      
      if (!firstFocused || firstFocused === 'BODY') {
        issues.push('First Tab does not focus on any element')
      }
      
      // Test multiple tab presses
      let currentElement = firstFocused
      let tabCount = 1
      const maxTabs = Math.min(focusableElements, 10) // Test up to 10 elements
      
      while (tabCount < maxTabs) {
        await this.page.keyboard.press('Tab')
        const newElement = await this.page.evaluate(() => ({
          tagName: document.activeElement?.tagName,
          id: document.activeElement?.id,
          className: document.activeElement?.className,
          ariaLabel: document.activeElement?.getAttribute('aria-label'),
          visible: document.activeElement ? window.getComputedStyle(document.activeElement).display !== 'none' : false
        }))
        
        if (!newElement.visible) {
          issues.push(`Tab ${tabCount + 1} focused on invisible element: ${newElement.tagName}`)
        }
        
        tabCount++
      }
      
      // Test Shift+Tab (reverse navigation)
      await this.page.keyboard.press('Shift+Tab')
      const reversedElement = await this.page.evaluate(() => document.activeElement?.tagName)
      
      if (!reversedElement) {
        issues.push('Shift+Tab does not work for reverse navigation')
      }
      
    } catch (error) {
      issues.push(`Keyboard navigation test failed: ${error}`)
    }
    
    // Test Enter/Space on focusable elements
    try {
      const buttons = await this.page.locator('button, [role="button"]').count()
      if (buttons > 0) {
        await this.page.locator('button, [role="button"]').first().focus()
        
        // Test Enter key
        await this.page.keyboard.press('Enter')
        
        // Test Space key
        await this.page.keyboard.press('Space')
      }
    } catch (error) {
      issues.push(`Button activation test failed: ${error}`)
    }
    
    return {
      passed: issues.length === 0,
      issues,
      focusableElements
    }
  }

  /**
   * Test screen reader compatibility
   */
  async testScreenReaderCompatibility(): Promise<{
    passed: boolean
    issues: string[]
    ariaElements: number
  }> {
    const issues: string[] = []
    
    const analysis = await this.page.evaluate(() => {
      const results = {
        missingAltImages: 0,
        missingAriaLabels: 0,
        missingHeadings: false,
        invalidAriaRoles: 0,
        missingLandmarks: 0,
        ariaElements: 0
      }
      
      // Check images without alt text
      const images = document.querySelectorAll('img')
      images.forEach(img => {
        if (!img.alt && !img.getAttribute('aria-label') && !img.getAttribute('aria-labelledby')) {
          results.missingAltImages++
        }
      })
      
      // Check interactive elements without labels
      const interactiveElements = document.querySelectorAll('button, input, select, textarea')
      interactiveElements.forEach(element => {
        const hasLabel = element.getAttribute('aria-label') || 
                         element.getAttribute('aria-labelledby') ||
                         element.getAttribute('title') ||
                         document.querySelector(`label[for="${element.id}"]`)
        
        if (!hasLabel) {
          results.missingAriaLabels++
        }
      })
      
      // Check heading structure
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      results.missingHeadings = headings.length === 0
      
      // Check ARIA roles
      const ariaElements = document.querySelectorAll('[role]')
      results.ariaElements = ariaElements.length
      
      const validRoles = [
        'alert', 'button', 'checkbox', 'dialog', 'gridcell', 'link', 'log', 'marquee',
        'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'progressbar',
        'radio', 'scrollbar', 'slider', 'spinbutton', 'status', 'tab', 'tabpanel',
        'textbox', 'timer', 'tooltip', 'treeitem', 'combobox', 'grid', 'listbox',
        'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid', 'banner',
        'complementary', 'contentinfo', 'form', 'main', 'navigation', 'region', 'search'
      ]
      
      ariaElements.forEach(element => {
        const role = element.getAttribute('role')
        if (role && !validRoles.includes(role)) {
          results.invalidAriaRoles++
        }
      })
      
      // Check landmarks
      const landmarks = document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"], header, nav, main, footer')
      results.missingLandmarks = landmarks.length
      
      return results
    })
    
    if (analysis.missingAltImages > 0) {
      issues.push(`${analysis.missingAltImages} images missing alt text`)
    }
    
    if (analysis.missingAriaLabels > 0) {
      issues.push(`${analysis.missingAriaLabels} interactive elements missing accessible labels`)
    }
    
    if (analysis.missingHeadings) {
      issues.push('No heading elements found - page structure unclear for screen readers')
    }
    
    if (analysis.invalidAriaRoles > 0) {
      issues.push(`${analysis.invalidAriaRoles} elements have invalid ARIA roles`)
    }
    
    if (analysis.missingLandmarks < 2) {
      issues.push('Insufficient landmark elements for navigation')
    }
    
    return {
      passed: issues.length === 0,
      issues,
      ariaElements: analysis.ariaElements
    }
  }

  /**
   * Test color contrast compliance
   */
  async testColorContrast(): Promise<{
    passed: boolean
    issues: string[]
    totalElements: number
    failedElements: number
  }> {
    const contrastResults = await this.page.evaluate(() => {
      const results: Array<{
        element: string
        foreground: string
        background: string
        ratio: number
        passed: boolean
      }> = []
      
      // Get all text elements
      const textElements = document.querySelectorAll('*')
      let checkedCount = 0
      
      Array.from(textElements).forEach(element => {
        const computedStyle = window.getComputedStyle(element)
        const color = computedStyle.color
        const backgroundColor = computedStyle.backgroundColor
        
        // Skip if no text content or transparent background
        if (!element.textContent?.trim() || backgroundColor === 'rgba(0, 0, 0, 0)') {
          return
        }
        
        if (checkedCount > 50) return // Limit for performance
        
        try {
          // Simple contrast ratio calculation (simplified)
          const foregroundLuminance = getLuminance(color)
          const backgroundLuminance = getLuminance(backgroundColor)
          
          const ratio = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / 
                       (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
          
          const passed = ratio >= 4.5 // WCAG AA standard
          
          results.push({
            element: element.tagName + (element.className ? '.' + element.className.split(' ')[0] : ''),
            foreground: color,
            background: backgroundColor,
            ratio: Math.round(ratio * 100) / 100,
            passed
          })
          
          checkedCount++
        } catch (error) {
          // Skip elements that cause errors
        }
      })
      
      function getLuminance(color: string): number {
        // Simplified luminance calculation
        const rgb = color.match(/\d+/g)
        if (!rgb) return 0
        
        const [r, g, b] = rgb.map(val => {
          const normalized = parseInt(val) / 255
          return normalized <= 0.03928 ? 
            normalized / 12.92 : 
            Math.pow((normalized + 0.055) / 1.055, 2.4)
        })
        
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      
      return results
    })
    
    const failedElements = contrastResults.filter(result => !result.passed)
    const issues: string[] = []
    
    failedElements.forEach(failed => {
      issues.push(`${failed.element}: contrast ratio ${failed.ratio} < 4.5 required`)
    })
    
    return {
      passed: failedElements.length === 0,
      issues: issues.slice(0, 10), // Limit issues for readability
      totalElements: contrastResults.length,
      failedElements: failedElements.length
    }
  }

  /**
   * Test focus management and visibility
   */
  async testFocusManagement(): Promise<{
    passed: boolean
    issues: string[]
  }> {
    const issues: string[] = []
    
    try {
      // Test focus visibility
      await this.page.keyboard.press('Tab')
      const focusVisible = await this.page.evaluate(() => {
        const activeElement = document.activeElement
        if (!activeElement) return false
        
        const computedStyle = window.getComputedStyle(activeElement)
        const hasOutline = computedStyle.outline !== 'none' && computedStyle.outline !== '0px'
        const hasBoxShadow = computedStyle.boxShadow !== 'none'
        const hasBorder = computedStyle.border !== 'none'
        
        return hasOutline || hasBoxShadow || hasBorder
      })
      
      if (!focusVisible) {
        issues.push('Focused elements do not have visible focus indicators')
      }
      
      // Test focus trap in modals/dialogs
      const modals = await this.page.locator('[role="dialog"], .modal, [aria-modal="true"]').count()
      if (modals > 0) {
        // Test focus trap functionality would go here
        // This is a simplified check
        await this.page.keyboard.press('Tab')
        const focusInsideModal = await this.page.evaluate(() => {
          const activeElement = document.activeElement
          const modal = document.querySelector('[role="dialog"], .modal, [aria-modal="true"]')
          return modal?.contains(activeElement) || false
        })
        
        if (!focusInsideModal) {
          issues.push('Focus not properly trapped within modal dialogs')
        }
      }
      
    } catch (error) {
      issues.push(`Focus management test failed: ${error}`)
    }
    
    return {
      passed: issues.length === 0,
      issues
    }
  }

  /**
   * Generate comprehensive accessibility report
   */
  async generateReport(): Promise<{
    passed: boolean
    score: number
    wcagAudit: Awaited<ReturnType<typeof this.runWCAGAudit>>
    keyboardNav: Awaited<ReturnType<typeof this.testKeyboardNavigation>>
    screenReader: Awaited<ReturnType<typeof this.testScreenReaderCompatibility>>
    colorContrast: Awaited<ReturnType<typeof this.testColorContrast>>
    focusManagement: Awaited<ReturnType<typeof this.testFocusManagement>>
  }> {
    const [wcagAudit, keyboardNav, screenReader, colorContrast, focusManagement] = await Promise.all([
      this.runWCAGAudit(),
      this.testKeyboardNavigation(),
      this.testScreenReaderCompatibility(),
      this.testColorContrast(),
      this.testFocusManagement()
    ])
    
    const overallPassed = wcagAudit.passed && keyboardNav.passed && 
                         screenReader.passed && colorContrast.passed && 
                         focusManagement.passed
    
    const averageScore = Math.round((
      wcagAudit.score + 
      (keyboardNav.passed ? 100 : 70) + 
      (screenReader.passed ? 100 : 60) + 
      (colorContrast.passed ? 100 : 50) + 
      (focusManagement.passed ? 100 : 80)
    ) / 5)
    
    return {
      passed: overallPassed,
      score: averageScore,
      wcagAudit,
      keyboardNav,
      screenReader,
      colorContrast,
      focusManagement
    }
  }
}

// Static helper functions
export const accessibilityHelpers = {
  // Create accessibility helper instance
  create: (page: Page): AccessibilityHelper => new AccessibilityHelper(page),
  
  // Quick accessibility check
  quickCheck: async (page: Page, config?: AccessibilityConfig): Promise<boolean> => {
    const helper = new AccessibilityHelper(page)
    const wcag = await helper.runWCAGAudit(config)
    return wcag.passed
  },
  
  // Test specific accessibility feature
  testFeature: async (
    page: Page, 
    feature: 'wcag' | 'keyboard' | 'screenreader' | 'contrast' | 'focus'
  ): Promise<{ passed: boolean, issues: string[] }> => {
    const helper = new AccessibilityHelper(page)
    
    switch (feature) {
      case 'wcag':
        const wcag = await helper.runWCAGAudit()
        return { passed: wcag.passed, issues: wcag.violations.map(v => v.description) }
      case 'keyboard':
        return await helper.testKeyboardNavigation()
      case 'screenreader':
        return await helper.testScreenReaderCompatibility()
      case 'contrast':
        return await helper.testColorContrast()
      case 'focus':
        return await helper.testFocusManagement()
      default:
        throw new Error(`Unknown accessibility feature: ${feature}`)
    }
  },
  
  // Common accessibility test scenarios
  getTestScenarios: () => ({
    'basic-compliance': {
      name: 'Basic WCAG AA Compliance',
      config: { level: 'AA', tags: ['wcag2aa'] } as AccessibilityConfig
    },
    'enhanced-compliance': {
      name: 'Enhanced WCAG AAA Compliance',
      config: { level: 'AAA', tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag21aaa'] } as AccessibilityConfig
    },
    'keyboard-only': {
      name: 'Keyboard-Only Navigation',
      config: { level: 'AA', tags: ['wcag2aa'], include: ['[tabindex]', 'button', 'a'] } as AccessibilityConfig
    }
  })
}