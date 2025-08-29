/**
 * AI URL Analyzer
 * Integrates AI service with CacheManager for URL risk analysis
 */

import { CacheManager } from '../cache/cache-manager'
import { AIService, createAIService } from './ai-service'
import {
  generateCacheKey,
  validateAIResponse,
  URL_ANALYSIS_PROMPT_VERSION,
} from './prompts/url-analysis-prompt'
import { createVersionedPrompt, defaultPromptManager, type PromptSelectionResult } from './prompts/prompt-manager'
import { analyzeURLPatterns, type URLPatternAnalysis } from './url-pattern-detector'
import { loadAIConfig, createServiceOptions, validateAIConfig } from '../../config/ai'
import { Logger } from '../logger'
import type {
  AIAnalysisResult,
  AIAnalysisRequest,
  AIServiceResult,
  AIRawResponse,
  TechnicalAnalysisContext,
  AIProvider,
  TokenUsage,
} from '../../types/ai'
import {
  ScamCategory,
} from '../../types/ai'
import type { ParsedURL } from '../../types/url'

// Create logger instance - this will be replaced with dependency injection later
const logger = new Logger()

/**
 * AI URL Analyzer class with caching integration
 */
export class AIURLAnalyzer {
  private aiService?: AIService
  private cache: CacheManager<AIAnalysisResult>
  private config: ReturnType<typeof loadAIConfig>
  private isEnabled: boolean = false
  private promptSelectionHistory: PromptSelectionResult[] = []

  constructor() {
    this.config = loadAIConfig()
    
    // Validate configuration
    const validation = validateAIConfig(this.config)
    if (!validation.valid) {
      logger.warn('AI configuration invalid, disabling AI analysis', {
        errors: validation.errors,
      })
      this.isEnabled = false
    } else {
      this.isEnabled = this.config.enabled
    }

    // Initialize cache
    this.cache = new CacheManager<AIAnalysisResult>({
      prefix: 'ai-url-analysis',
      ttl: this.config.cache.ttl,
      maxSize: this.config.cache.maxSize,
    })

    // Initialize AI service if enabled
    if (this.isEnabled && this.config.apiKey) {
      try {
        const serviceOptions = createServiceOptions(this.config)
        this.aiService = createAIService(serviceOptions)
        logger.info('AI URL analyzer initialized', {
          provider: this.config.provider,
          model: this.config.model,
          cacheEnabled: this.config.cache.enabled,
        })
      } catch (error) {
        logger.error('Failed to initialize AI service', {
          error: error instanceof Error ? error : new Error(String(error)),
        })
        this.isEnabled = false
      }
    }
  }

  /**
   * Analyze URL with AI and return structured risk assessment (enhanced version)
   */
  async analyzeURL(
    url: string,
    parsedUrl: ParsedURL,
    technicalContext: TechnicalAnalysisContext,
    userId?: string,
    forcePromptVersion?: string
  ): Promise<AIServiceResult<AIAnalysisResult>> {
    const startTime = Date.now()

    try {
      // Check if AI analysis is enabled
      if (!this.isEnabled) {
        return {
          success: false,
          data: null,
          error: {
            code: 'ai_disabled',
            message: 'AI analysis is disabled or not configured',
          },
          fromCache: false,
          metadata: { processingTime: Date.now() - startTime },
        }
      }

      // Perform URL pattern analysis first
      const patternAnalysis = analyzeURLPatterns(url, parsedUrl.domain, parsedUrl.pathname)

      // Prepare enhanced analysis request with pattern analysis
      const analysisRequest = this.prepareEnhancedAnalysisRequest(url, parsedUrl, technicalContext, patternAnalysis)
      
      // Select prompt version (supports A/B testing)
      const promptSelection = createVersionedPrompt(analysisRequest, userId, forcePromptVersion)
      this.recordPromptSelection(promptSelection)

      // Generate cache key based on prompt version and request
      const cacheKey = this.generateEnhancedCacheKey(analysisRequest, promptSelection.version.id)

      // Try to get from cache first
      if (this.config.cache.enabled) {
        const cachedResult = await this.cache.get(cacheKey)
        if (cachedResult) {
          logger.info('AI analysis cache hit', {
            url: this.sanitizeUrlForLogging(url),
            cacheKey,
            promptVersion: promptSelection.version.version,
            age: Date.now() - new Date(cachedResult.metadata.timestamp).getTime(),
          })

          // Update prompt performance metrics for cache hit
          this.updatePromptPerformance(promptSelection.version.id, {
            fromCache: true,
            processingTime: Date.now() - startTime
          })

          return {
            success: true,
            data: cachedResult,
            fromCache: true,
            metadata: { processingTime: Date.now() - startTime },
          }
        }
      }

      // Use the selected prompt
      const prompt = promptSelection.prompt

      // Call AI service
      const aiResult = await this.aiService!.analyzeText(prompt)

      if (!aiResult.success || !aiResult.data) {
        logger.warn('AI service analysis failed', {
          url: this.sanitizeUrlForLogging(url),
          error: new Error(aiResult.error?.message || 'AI service failed'),
        })
        
        return {
          success: false,
          data: null,
          error: aiResult.error || { code: 'ai_service_failed', message: 'AI service failed' },
          fromCache: false,
          metadata: aiResult.metadata,
        }
      }

      // Parse and validate AI response with enhanced context
      const analysisResult = this.parseEnhancedAIResponse(
        aiResult.data, 
        aiResult.metadata, 
        promptSelection,
        patternAnalysis
      )

      // Cache the result
      if (this.config.cache.enabled && analysisResult.success) {
        await this.cache.set(cacheKey, analysisResult.data!)
      }

      // Update prompt performance metrics
      this.updatePromptPerformance(promptSelection.version.id, {
        fromCache: false,
        processingTime: Date.now() - startTime,
        confidence: analysisResult.data?.confidence || 0,
        cost: aiResult.metadata.cost || 0
      })

      logger.info('AI URL analysis completed', {
        url: this.sanitizeUrlForLogging(url),
        promptVersion: promptSelection.version.version,
        riskScore: analysisResult.data?.riskScore,
        confidence: analysisResult.data?.confidence,
        scamCategory: analysisResult.data?.scamCategory,
        patternScore: patternAnalysis.suspiciousScore,
        processingTime: Date.now() - startTime,
        tokenUsage: aiResult.metadata.tokenUsage,
        cost: aiResult.metadata.cost,
        isExperiment: promptSelection.isExperiment
      })

      return analysisResult
    } catch (error) {
      const processingTime = Date.now() - startTime

      logger.error('AI URL analysis error', {
        url: this.sanitizeUrlForLogging(url),
        error: error instanceof Error ? error : new Error(String(error)),
        processingTime,
      })

      return {
        success: false,
        data: null,
        error: {
          code: 'analysis_error',
          message: error instanceof Error ? error.message : 'Unknown analysis error',
        },
        fromCache: false,
        metadata: { processingTime },
      }
    }
  }

  /**
   * Prepare analysis request from URL and context
   */
  private prepareAnalysisRequest(
    url: string,
    parsedUrl: ParsedURL,
    technicalContext: TechnicalAnalysisContext
  ): AIAnalysisRequest {
    return {
      url,
      domain: parsedUrl.domain,
      path: parsedUrl.pathname,
      parameters: parsedUrl.components.queryParams.reduce((acc, param) => {
        acc[param.key] = param.value
        return acc
      }, {} as Record<string, string>),
      technicalContext,
    }
  }

  /**
   * Parse AI response into structured analysis result
   */
  private parseAIResponse(
    responseText: string,
    metadata: { processingTime: number; tokenUsage?: TokenUsage; cost?: number }
  ): AIServiceResult<AIAnalysisResult> {
    try {
      // Validate response format
      const validation = validateAIResponse(responseText)
      if (!validation.valid) {
        return {
          success: false,
          data: null,
          error: {
            code: 'invalid_response',
            message: validation.error || 'Invalid AI response format',
          },
          fromCache: false,
          metadata,
        }
      }

      // Parse JSON response
      const rawResponse: AIRawResponse = JSON.parse(responseText)

      // Convert to our internal format
      const analysisResult: AIAnalysisResult = {
        riskScore: rawResponse.risk_score,
        confidence: rawResponse.confidence,
        primaryRisks: rawResponse.primary_risks,
        scamCategory: this.mapScamCategory(rawResponse.scam_category),
        indicators: rawResponse.indicators,
        explanation: rawResponse.explanation,
        metadata: {
          timestamp: new Date().toISOString(),
          promptVersion: URL_ANALYSIS_PROMPT_VERSION,
          provider: this.config.provider,
          processingTimeMs: metadata.processingTime,
          tokenUsage: metadata.tokenUsage,
          cost: metadata.cost,
        },
      }

      return {
        success: true,
        data: analysisResult,
        fromCache: false,
        metadata,
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: {
          code: 'parse_error',
          message: `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        fromCache: false,
        metadata,
      }
    }
  }

  /**
   * Map string scam category to enum
   */
  private mapScamCategory(category: string): ScamCategory {
    switch (category.toLowerCase()) {
      case 'financial':
        return ScamCategory.FINANCIAL
      case 'phishing':
        return ScamCategory.PHISHING
      case 'ecommerce':
        return ScamCategory.ECOMMERCE
      case 'social_engineering':
        return ScamCategory.SOCIAL_ENGINEERING
      case 'legitimate':
        return ScamCategory.LEGITIMATE
      default:
        return ScamCategory.LEGITIMATE // Default to legitimate for unknown categories
    }
  }

  /**
   * Sanitize URL for logging (remove sensitive parameters)
   */
  private sanitizeUrlForLogging(url: string): string {
    try {
      const parsed = new URL(url)
      // Keep domain and path, remove query parameters for privacy
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`
    } catch {
      // If URL parsing fails, just return the first 50 characters
      return url.substring(0, 50) + (url.length > 50 ? '...' : '')
    }
  }

  /**
   * Check if AI analysis is available
   */
  isAvailable(): boolean {
    return this.isEnabled
  }

  /**
   * Get configuration info
   */
  getConfig(): {
    enabled: boolean
    provider: AIProvider
    model: string
    cacheEnabled: boolean
  } {
    return {
      enabled: this.isEnabled,
      provider: this.config.provider,
      model: this.config.model,
      cacheEnabled: this.config.cache.enabled,
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * Get AI service usage statistics
   */
  getUsageStats() {
    if (!this.isEnabled || !this.aiService) {
      return {
        requestCount: 0,
        totalCost: 0,
        averageCost: 0,
      }
    }

    return this.aiService.getUsageStats()
  }

  /**
   * Clear analysis cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear()
  }

  /**
   * Cleanup expired cache entries
   */
  async cleanupCache(): Promise<number> {
    return await this.cache.cleanup()
  }

  /**
   * Prepare enhanced analysis request with pattern analysis
   */
  private prepareEnhancedAnalysisRequest(
    url: string,
    parsedUrl: ParsedURL,
    technicalContext: TechnicalAnalysisContext,
    patternAnalysis: URLPatternAnalysis
  ): AIAnalysisRequest & { patternAnalysis: URLPatternAnalysis } {
    const baseRequest = this.prepareAnalysisRequest(url, parsedUrl, technicalContext)
    return {
      ...baseRequest,
      patternAnalysis
    }
  }

  /**
   * Generate enhanced cache key including prompt version
   */
  private generateEnhancedCacheKey(
    request: AIAnalysisRequest & { patternAnalysis: URLPatternAnalysis },
    promptVersionId: string
  ): string {
    const baseKey = generateCacheKey(request)
    const patternHash = this.hashPatternAnalysis(request.patternAnalysis)
    return `${baseKey}:v${promptVersionId}:p${patternHash}`
  }

  /**
   * Create simple hash of pattern analysis for cache key
   */
  private hashPatternAnalysis(analysis: URLPatternAnalysis): string {
    const elements = [
      analysis.isHomograph ? 'h' : '',
      analysis.isTyposquat ? 't' : '',
      analysis.hasSuspiciousTLD ? 'tld' : '',
      analysis.hasPhishingPatterns ? 'phish' : '',
      analysis.hasObfuscation ? 'obf' : '',
      analysis.suspiciousScore.toString()
    ].filter(Boolean)
    
    return elements.join('-')
  }

  /**
   * Parse AI response with enhanced context
   */
  private parseEnhancedAIResponse(
    responseText: string,
    metadata: { processingTime: number; tokenUsage?: TokenUsage; cost?: number },
    promptSelection: PromptSelectionResult,
    patternAnalysis: URLPatternAnalysis
  ): AIServiceResult<AIAnalysisResult> {
    try {
      // Use existing validation
      const validation = validateAIResponse(responseText)
      if (!validation.valid) {
        return {
          success: false,
          data: null,
          error: {
            code: 'invalid_response',
            message: validation.error || 'Invalid AI response format',
          },
          fromCache: false,
          metadata,
        }
      }

      // Parse JSON response
      const rawResponse: AIRawResponse = JSON.parse(responseText)

      // Enhanced analysis result with pattern analysis context
      const analysisResult: AIAnalysisResult = {
        riskScore: rawResponse.risk_score,
        confidence: rawResponse.confidence,
        primaryRisks: rawResponse.primary_risks,
        scamCategory: this.mapScamCategory(rawResponse.scam_category),
        indicators: [...rawResponse.indicators, ...patternAnalysis.detectedPatterns],
        explanation: rawResponse.explanation,
        metadata: {
          timestamp: new Date().toISOString(),
          promptVersion: promptSelection.version.version,
          provider: this.config.provider,
          processingTimeMs: metadata.processingTime,
          tokenUsage: metadata.tokenUsage,
          cost: metadata.cost,
          // Enhanced metadata
          patternAnalysis: {
            suspiciousScore: patternAnalysis.suspiciousScore,
            detectedPatterns: patternAnalysis.detectedPatterns,
            isHomograph: patternAnalysis.isHomograph,
            isTyposquat: patternAnalysis.isTyposquat,
            brandImpersonation: patternAnalysis.brandImpersonation
          },
          promptSelection: {
            versionId: promptSelection.version.id,
            isExperiment: promptSelection.isExperiment,
            selectionReason: promptSelection.selectionReason
          }
        },
      }

      return {
        success: true,
        data: analysisResult,
        fromCache: false,
        metadata,
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: {
          code: 'parse_error',
          message: `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        fromCache: false,
        metadata,
      }
    }
  }

  /**
   * Record prompt selection for analysis
   */
  private recordPromptSelection(selection: PromptSelectionResult): void {
    this.promptSelectionHistory.push(selection)
    
    // Keep only last 100 selections for memory management
    if (this.promptSelectionHistory.length > 100) {
      this.promptSelectionHistory.shift()
    }
  }

  /**
   * Update prompt performance metrics
   */
  private updatePromptPerformance(
    versionId: string,
    metrics: {
      fromCache: boolean
      processingTime: number
      confidence?: number
      cost?: number
    }
  ): void {
    defaultPromptManager.updatePerformanceMetrics(versionId, {
      totalRequests: 1,
      averageProcessingTime: metrics.processingTime,
      averageConfidence: metrics.confidence || 0,
      costPerRequest: metrics.cost || 0
    })
  }

  /**
   * Get prompt performance statistics
   */
  getPromptPerformanceStats() {
    return defaultPromptManager.getPerformanceComparison()
  }

  /**
   * Get prompt selection history
   */
  getPromptSelectionHistory(): PromptSelectionResult[] {
    return [...this.promptSelectionHistory]
  }

  /**
   * Force specific prompt version for testing
   */
  async analyzeURLWithVersion(
    url: string,
    parsedUrl: ParsedURL,
    technicalContext: TechnicalAnalysisContext,
    promptVersionId: string
  ): Promise<AIServiceResult<AIAnalysisResult>> {
    return this.analyzeURL(url, parsedUrl, technicalContext, undefined, promptVersionId)
  }
}

// Temporary backward compatibility for tests - DEPRECATED, use ServiceFactory instead
/** @deprecated Use ServiceFactory.createAIURLAnalyzer() instead */
export const defaultAIURLAnalyzer = new AIURLAnalyzer()

