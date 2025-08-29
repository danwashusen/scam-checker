/**
 * Prompt Version Management System
 * Handles A/B testing, versioning, and performance tracking of AI prompts
 */

import type { AIAnalysisRequest } from '../../../types/ai'
import { Logger } from '../../logger'
import { createUrlAnalysisPrompt as createV2Prompt, URL_ANALYSIS_PROMPT_VERSION } from './url-analysis-prompt'

const logger = new Logger()

/**
 * Prompt version definition
 */
export interface PromptVersion {
  id: string
  version: string
  name: string
  description: string
  createPrompt: (request: AIAnalysisRequest) => string
  isActive: boolean
  trafficAllocation: number // 0-1 percentage of traffic
  createdAt: Date
  metadata: {
    author: string
    changes: string[]
    expectedImprovements: string[]
  }
  performance?: PromptPerformanceMetrics
}

/**
 * Performance metrics for prompt versions
 */
export interface PromptPerformanceMetrics {
  totalRequests: number
  averageConfidence: number
  averageProcessingTime: number
  accuracy?: number
  falsePositiveRate?: number
  falseNegativeRate?: number
  costPerRequest: number
  lastUpdated: Date
}

/**
 * Prompt selection result
 */
export interface PromptSelectionResult {
  version: PromptVersion
  prompt: string
  isExperiment: boolean
  selectionReason: string
}

/**
 * Prompt Manager class for version control and A/B testing
 */
export class PromptManager {
  private versions: Map<string, PromptVersion> = new Map()
  private defaultVersionId: string = 'v2.0'

  constructor() {
    this.initializeVersions()
  }

  /**
   * Initialize available prompt versions
   */
  private initializeVersions(): void {
    // Version 2.0 - Enhanced prompt (current default)
    this.registerVersion({
      id: 'v2.0',
      version: URL_ANALYSIS_PROMPT_VERSION,
      name: 'Enhanced URL Analysis v2.0',
      description: 'Improved prompt with better scam pattern detection and false positive reduction',
      createPrompt: createV2Prompt,
      isActive: true,
      trafficAllocation: 1.0, // 100% traffic initially
      createdAt: new Date('2024-01-15'),
      metadata: {
        author: 'AI Development Team',
        changes: [
          'Added weighted dimension analysis',
          'Enhanced domain trust evaluation',
          'Improved scoring guidelines',
          'Added false positive prevention measures',
          'Enhanced scam pattern matching'
        ],
        expectedImprovements: [
          'Reduced false positive rate by 25%',
          'Improved accuracy for financial scams',
          'Better handling of legitimate subdomains',
          'Enhanced confidence scoring'
        ]
      }
    })

    // Version 1.0 - Original prompt (kept for comparison)
    this.registerVersion({
      id: 'v1.0',
      version: '1.0',
      name: 'Original URL Analysis v1.0',
      description: 'Original basic prompt for URL risk analysis',
      createPrompt: this.createV1Prompt.bind(this),
      isActive: false,
      trafficAllocation: 0.0,
      createdAt: new Date('2024-01-01'),
      metadata: {
        author: 'AI Development Team',
        changes: ['Initial implementation'],
        expectedImprovements: ['Basic URL risk analysis capability']
      }
    })

    logger.info('Prompt manager initialized', {
      totalVersions: this.versions.size,
      activeVersions: this.getActiveVersions().length,
      defaultVersion: this.defaultVersionId
    })
  }

  /**
   * Register a new prompt version
   */
  registerVersion(version: PromptVersion): void {
    // Validate version
    if (!version.id || !version.version || !version.createPrompt) {
      throw new Error('Invalid prompt version: missing required fields')
    }

    if (this.versions.has(version.id)) {
      logger.warn('Overwriting existing prompt version', { versionId: version.id })
    }

    this.versions.set(version.id, version)
    logger.info('Prompt version registered', {
      versionId: version.id,
      version: version.version,
      name: version.name
    })
  }

  /**
   * Select prompt version for request (supports A/B testing)
   */
  selectPrompt(
    request: AIAnalysisRequest,
    userId?: string,
    forceVersionId?: string
  ): PromptSelectionResult {
    // Force specific version if requested
    if (forceVersionId) {
      const version = this.versions.get(forceVersionId)
      if (!version) {
        throw new Error(`Prompt version not found: ${forceVersionId}`)
      }

      return {
        version,
        prompt: version.createPrompt(request),
        isExperiment: forceVersionId !== this.defaultVersionId,
        selectionReason: `Forced version: ${forceVersionId}`
      }
    }

    // Select version based on traffic allocation (A/B testing)
    const selectedVersion = this.selectVersionByTrafficAllocation(userId)

    return {
      version: selectedVersion,
      prompt: selectedVersion.createPrompt(request),
      isExperiment: selectedVersion.id !== this.defaultVersionId,
      selectionReason: selectedVersion.id === this.defaultVersionId 
        ? 'Default version'
        : `A/B test allocation (${Math.round(selectedVersion.trafficAllocation * 100)}%)`
    }
  }

  /**
   * Select version based on traffic allocation
   */
  private selectVersionByTrafficAllocation(userId?: string): PromptVersion {
    const activeVersions = this.getActiveVersions()
    
    if (activeVersions.length === 0) {
      throw new Error('No active prompt versions available')
    }

    // Single version scenario
    if (activeVersions.length === 1) {
      return activeVersions[0]
    }

    // Generate deterministic random number based on userId for consistent selection
    const random = userId ? this.hashUserId(userId) : Math.random()
    
    // Select based on traffic allocation
    let cumulativeAllocation = 0
    for (const version of activeVersions) {
      cumulativeAllocation += version.trafficAllocation
      if (random <= cumulativeAllocation) {
        return version
      }
    }

    // Fallback to default version
    return this.getDefaultVersion()
  }

  /**
   * Get active versions sorted by traffic allocation
   */
  private getActiveVersions(): PromptVersion[] {
    return Array.from(this.versions.values())
      .filter(v => v.isActive && v.trafficAllocation > 0)
      .sort((a, b) => b.trafficAllocation - a.trafficAllocation)
  }

  /**
   * Get default version
   */
  private getDefaultVersion(): PromptVersion {
    const defaultVersion = this.versions.get(this.defaultVersionId)
    if (!defaultVersion) {
      throw new Error(`Default prompt version not found: ${this.defaultVersionId}`)
    }
    return defaultVersion
  }

  /**
   * Generate deterministic hash for user ID (0-1)
   */
  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647 // Normalize to 0-1
  }

  /**
   * Update version performance metrics
   */
  updatePerformanceMetrics(
    versionId: string,
    metrics: Partial<PromptPerformanceMetrics>
  ): void {
    const version = this.versions.get(versionId)
    if (!version) {
      logger.error('Cannot update performance metrics: version not found', { versionId })
      return
    }

    const currentMetrics = version.performance || {
      totalRequests: 0,
      averageConfidence: 0,
      averageProcessingTime: 0,
      costPerRequest: 0,
      lastUpdated: new Date()
    }

    version.performance = {
      ...currentMetrics,
      ...metrics,
      lastUpdated: new Date()
    }

    logger.debug('Prompt performance metrics updated', {
      versionId,
      metrics: version.performance
    })
  }

  /**
   * Get version performance comparison
   */
  getPerformanceComparison(): Array<{
    versionId: string
    version: string
    name: string
    isActive: boolean
    performance: PromptPerformanceMetrics | undefined
  }> {
    return Array.from(this.versions.values()).map(v => ({
      versionId: v.id,
      version: v.version,
      name: v.name,
      isActive: v.isActive,
      performance: v.performance
    }))
  }

  /**
   * Activate/deactivate version
   */
  setVersionActive(versionId: string, isActive: boolean, trafficAllocation?: number): void {
    const version = this.versions.get(versionId)
    if (!version) {
      throw new Error(`Prompt version not found: ${versionId}`)
    }

    version.isActive = isActive
    if (trafficAllocation !== undefined) {
      version.trafficAllocation = Math.max(0, Math.min(1, trafficAllocation))
    }

    logger.info('Prompt version status updated', {
      versionId,
      isActive,
      trafficAllocation: version.trafficAllocation
    })
  }

  /**
   * Get version information
   */
  getVersion(versionId: string): PromptVersion | undefined {
    return this.versions.get(versionId)
  }

  /**
   * List all versions
   */
  listVersions(): PromptVersion[] {
    return Array.from(this.versions.values())
  }

  /**
   * V1.0 prompt implementation (for comparison)
   */
  private createV1Prompt(request: AIAnalysisRequest): string {
    const systemPrompt = `You are an expert cybersecurity analyst specializing in URL-based scam detection. Analyze the provided URL for scam likelihood and risk patterns.

**INPUT DATA:**
URL: ${request.url}
Domain: ${request.domain}
Path: ${request.path}
Parameters: ${JSON.stringify(request.parameters)}

**ANALYSIS FRAMEWORK:**
Evaluate the URL across these dimensions:

1. **Domain Analysis:**
   - Homograph/typosquatting attacks
   - Suspicious TLD usage
   - Domain age and reputation indicators
   - Brand impersonation patterns

2. **URL Structure Analysis:**
   - Suspicious path patterns
   - Parameter manipulation indicators
   - Redirect/shortener usage
   - Obfuscation techniques

3. **Scam Category Assessment:**
   - Financial scams (crypto, investment, loans)
   - Phishing attempts (banking, social, government)
   - E-commerce fraud (fake stores, deals)
   - Social engineering patterns

**OUTPUT REQUIREMENTS:**
Respond ONLY with valid JSON in this exact format:
{
  "risk_score": <integer 0-100>,
  "confidence": <integer 0-100>,
  "primary_risks": ["<risk1>", "<risk2>", "<risk3>"],
  "scam_category": "<financial|phishing|ecommerce|social_engineering|legitimate>",
  "indicators": ["<indicator1>", "<indicator2>", "<indicator3>"],
  "explanation": "<brief 1-2 sentence explanation>"
}

**CRITICAL INSTRUCTIONS:**
- Base analysis primarily on URL structure and domain patterns
- Consider technical context from previous analysis stages
- Prioritize high-confidence assessments over uncertain scores
- Flag legitimate services accurately to minimize false positives
- Provide specific, actionable indicators in your response`

    return systemPrompt
  }
}

/**
 * Default prompt manager instance
 */
export const defaultPromptManager = new PromptManager()

/**
 * Create prompt with version management
 */
export function createVersionedPrompt(
  request: AIAnalysisRequest,
  userId?: string,
  forceVersionId?: string
): PromptSelectionResult {
  return defaultPromptManager.selectPrompt(request, userId, forceVersionId)
}