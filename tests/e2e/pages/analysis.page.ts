import { Page, Locator, expect } from '@playwright/test'
import { BasePage, PerformanceMetrics } from './base.page'
import { TestAnalysisResult, ShareMethod, ExportFormat } from '../types/test-types'

/**
 * Analysis Page Object Model for URL analysis functionality
 * Handles all interactions with the main analysis workflow
 */
export class AnalysisPage extends BasePage {
  // URL Input Form Selectors
  readonly urlInput: Locator
  readonly analyzeButton: Locator
  readonly formErrorMessage: Locator

  // Loading and Results Selectors
  readonly loadingIndicator: Locator
  readonly resultsContainer: Locator
  readonly analysisTitle: Locator
  
  // View Toggle Selectors
  readonly viewTabs: Locator
  readonly simpleViewTab: Locator
  readonly technicalViewTab: Locator
  readonly simpleViewContent: Locator
  readonly technicalViewContent: Locator

  // Error Handling Selectors
  readonly errorAlert: Locator
  readonly retryButton: Locator
  readonly analyzeNewButton: Locator

  // Share/Export Selectors
  readonly shareExportButton: Locator
  readonly checkAnotherUrlButton: Locator

  // Risk Score and Status Selectors
  readonly riskScore: Locator
  readonly riskGauge: Locator
  readonly riskStatus: Locator

  constructor(page: Page) {
    super(page)
    
    // Initialize locators based on actual component structure
    this.urlInput = this.page.getByPlaceholder(/enter.*url/i)
    this.analyzeButton = this.page.getByRole('button', { name: /analyze/i })
    this.formErrorMessage = this.page.locator('[role="alert"]').first()

    // Loading states
    this.loadingIndicator = this.page.getByText(/analyzing|loading/i)
    this.resultsContainer = this.page.locator('[data-testid="results-display"], [data-testid="results-container"], .results-display, .results-container').first()
    this.analysisTitle = this.page.getByText('URL Security Report')

    // View toggles
    this.viewTabs = this.page.getByRole('tablist')
    this.simpleViewTab = this.page.getByRole('tab', { name: 'Simple View' })
    this.technicalViewTab = this.page.getByRole('tab', { name: 'Technical View' })
    this.simpleViewContent = this.page.getByRole('tabpanel').filter({ hasText: /risk score|findings/i })
    this.technicalViewContent = this.page.getByRole('tabpanel').filter({ hasText: /domain age|ssl|whois/i })

    // Error handling
    this.errorAlert = this.page.locator('[role="alert"]').filter({ hasText: /analysis failed|unable to/i })
    this.retryButton = this.page.getByRole('button', { name: /retry/i })
    this.analyzeNewButton = this.page.getByRole('button', { name: /analyze new|check another/i })

    // Share/Export
    this.shareExportButton = this.page.getByRole('button', { name: /share|export/i })
    this.checkAnotherUrlButton = this.page.getByRole('button', { name: /check another/i })

    // Risk display - improved locator strategies
    this.riskScore = this.page.locator('[data-testid="risk-score"], [data-testid*="score"], .risk-score').first()
    this.riskGauge = this.page.locator('[data-testid="risk-gauge"], [data-testid*="gauge"], .risk-gauge, [role="progressbar"]').first()
    this.riskStatus = this.page.locator('[data-testid="risk-status"], [data-testid*="status"], .risk-status').first()
  }

  /**
   * Navigate to the analysis page
   */
  async goto(): Promise<void> {
    await this.navigate('/')
    await this.waitForLoad()
  }

  /**
   * Enter URL in the input field with validation
   */
  async enterUrl(url: string): Promise<void> {
    await this.urlInput.fill(url)
    // Trigger validation by blurring the input
    await this.urlInput.blur()
  }

  /**
   * Clear the URL input field
   */
  async clearUrl(): Promise<void> {
    await this.urlInput.clear()
  }

  /**
   * Submit the URL for analysis
   */
  async submitUrl(): Promise<void> {
    await this.analyzeButton.click()
  }

  /**
   * Perform complete URL analysis workflow
   */
  async analyzeUrl(url: string): Promise<void> {
    await this.enterUrl(url)
    await this.submitUrl()
  }

  /**
   * Wait for analysis to complete
   */
  async waitForResults(timeout = 30000): Promise<void> {
    // Wait for loading to start (optional)
    try {
      await this.loadingIndicator.waitFor({ state: 'visible', timeout: 5000 })
    } catch {
      // Loading indicator might not appear for fast responses
    }

    // Wait for loading to complete and results to appear
    await this.waitForLoadingToComplete()
    await expect(this.resultsContainer).toBeVisible({ timeout })
  }

  /**
   * Check if analysis is currently in progress
   */
  async isAnalyzing(): Promise<boolean> {
    try {
      await expect(this.loadingIndicator).toBeVisible({ timeout: 1000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get the current analysis results
   */
  async getResults(): Promise<TestAnalysisResult | null> {
    // Wait for results to be visible
    await expect(this.resultsContainer).toBeVisible()

    try {
      // Extract basic result data
      const url = await this.page.locator('[data-testid="analyzed-url"], [data-testid*="url"], .analyzed-url')
        .first()
        .textContent() || ''

      // Extract risk score (might be in various formats)
      const scoreText = await this.riskScore.first().textContent() || '0'
      const riskScore = parseInt(scoreText.match(/\d+/)?.[0] || '0')

      // Extract risk level/status
      const statusText = await this.riskStatus.first().textContent() || 'moderate'
      const riskLevel = this.mapRiskStatus(statusText.toLowerCase())

      // Extract risk status
      const riskStatus = this.mapRiskLevel(riskLevel)

      return {
        url: url.trim(),
        riskScore,
        riskLevel,
        riskStatus,
        factors: [], // Could be extracted if needed
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.warn('Could not extract results:', error)
      return null
    }
  }

  /**
   * Switch between simple and technical views
   */
  async switchView(view: 'simple' | 'technical'): Promise<void> {
    const tab = view === 'simple' ? this.simpleViewTab : this.technicalViewTab
    await tab.click()
    
    // Wait for view to switch
    const content = view === 'simple' ? this.simpleViewContent : this.technicalViewContent
    await expect(content).toBeVisible()
  }

  /**
   * Check if technical view is visible
   */
  async isTechnicalViewVisible(): Promise<boolean> {
    try {
      await expect(this.technicalViewContent).toBeVisible({ timeout: 2000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if simple view is visible
   */
  async isSimpleViewVisible(): Promise<boolean> {
    try {
      await expect(this.simpleViewContent).toBeVisible({ timeout: 2000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Expand a section in technical view
   */
  async expandSection(sectionName: string): Promise<void> {
    const sectionButton = this.page.locator(`[data-testid*="${sectionName.toLowerCase()}"], [data-testid="${sectionName.toLowerCase()}-section"]`)
      .or(this.page.getByRole('button', { name: new RegExp(sectionName, 'i') }))
    
    await sectionButton.click()
    
    // Wait for section to expand
    await this.page.waitForTimeout(500)
  }

  /**
   * Get form validation error message
   */
  async getValidationError(): Promise<string> {
    await expect(this.formErrorMessage).toBeVisible()
    return await this.formErrorMessage.textContent() || ''
  }

  /**
   * Check if form has validation errors
   */
  async hasValidationError(): Promise<boolean> {
    try {
      await expect(this.formErrorMessage).toBeVisible({ timeout: 2000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Retry failed analysis
   */
  async retryAnalysis(): Promise<void> {
    await this.retryButton.click()
  }

  /**
   * Start new analysis
   */
  async startNewAnalysis(): Promise<void> {
    await this.analyzeNewButton.click()
  }

  /**
   * Check if error is displayed
   */
  async hasError(): Promise<boolean> {
    try {
      await expect(this.errorAlert).toBeVisible({ timeout: 2000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    await expect(this.errorAlert).toBeVisible()
    return await this.errorAlert.textContent() || ''
  }

  /**
   * Share results using specified method
   */
  async shareResults(method: ShareMethod): Promise<void> {
    await this.shareExportButton.click()
    
    // This would need to be implemented based on the actual share UI
    const shareButton = this.page.getByRole('button', { name: new RegExp(method, 'i') })
    await shareButton.click()
  }

  /**
   * Export results in specified format
   */
  async exportResults(format: ExportFormat): Promise<void> {
    await this.shareExportButton.click()
    
    // This would need to be implemented based on the actual export UI
    const exportButton = this.page.getByRole('button', { name: new RegExp(format, 'i') })
    await exportButton.click()
  }

  /**
   * Measure performance during analysis
   */
  async measureAnalysisPerformance(url: string): Promise<PerformanceMetrics> {
    const startTime = Date.now()
    
    await this.analyzeUrl(url)
    await this.waitForResults()
    
    const metrics = await this.measurePerformance()
    const totalTime = Date.now() - startTime
    
    // Add custom analysis timing
    return {
      ...metrics,
      analysisTime: totalTime
    } as PerformanceMetrics & { analysisTime: number }
  }

  /**
   * Map risk status text to standardized levels
   */
  private mapRiskStatus(statusText: string): 'low' | 'medium' | 'high' {
    if (statusText.includes('safe') || statusText.includes('low')) return 'low'
    if (statusText.includes('danger') || statusText.includes('high')) return 'high'
    return 'medium'
  }

  /**
   * Map risk level to status
   */
  private mapRiskLevel(level: 'low' | 'medium' | 'high'): 'safe' | 'caution' | 'danger' {
    switch (level) {
      case 'low': return 'safe'
      case 'medium': return 'caution'
      case 'high': return 'danger'
      default: return 'caution'
    }
  }
}