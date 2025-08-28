/**
 * AI URL Analyzer
 * Integrates AI service with CacheManager for URL risk analysis
 */

import { CacheManager } from '../cache/cache-manager'
import { AIService, createAIService } from './ai-service'
import {
  createUrlAnalysisPrompt,
  generateCacheKey,
  validateAIResponse,
  URL_ANALYSIS_PROMPT_VERSION,
} from './prompts/url-analysis-prompt'
import { loadAIConfig, createServiceOptions, validateAIConfig } from '../../config/ai'
import { logger } from '../logger'
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

/**
 * AI URL Analyzer class with caching integration
 */
export class AIURLAnalyzer {
  private aiService?: AIService
  private cache: CacheManager<AIAnalysisResult>
  private config: ReturnType<typeof loadAIConfig>
  private isEnabled: boolean = false

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
   * Analyze URL with AI and return structured risk assessment
   */
  async analyzeURL(
    url: string,
    parsedUrl: ParsedURL,
    technicalContext: TechnicalAnalysisContext
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

      // Prepare analysis request
      const analysisRequest = this.prepareAnalysisRequest(url, parsedUrl, technicalContext)
      
      // Generate cache key
      const cacheKey = generateCacheKey(analysisRequest)

      // Try to get from cache first
      if (this.config.cache.enabled) {
        const cachedResult = await this.cache.get(cacheKey)
        if (cachedResult) {
          logger.info('AI analysis cache hit', {
            url: this.sanitizeUrlForLogging(url),
            cacheKey,
            age: Date.now() - new Date(cachedResult.metadata.timestamp).getTime(),
          })

          return {
            success: true,
            data: cachedResult,
            fromCache: true,
            metadata: { processingTime: Date.now() - startTime },
          }
        }
      }

      // Generate prompt
      const prompt = createUrlAnalysisPrompt(analysisRequest)

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

      // Parse and validate AI response
      const analysisResult = this.parseAIResponse(aiResult.data, aiResult.metadata)

      // Cache the result
      if (this.config.cache.enabled && analysisResult.success) {
        await this.cache.set(cacheKey, analysisResult.data!)
      }

      logger.info('AI URL analysis completed', {
        url: this.sanitizeUrlForLogging(url),
        riskScore: analysisResult.data?.riskScore,
        confidence: analysisResult.data?.confidence,
        scamCategory: analysisResult.data?.scamCategory,
        processingTime: Date.now() - startTime,
        tokenUsage: aiResult.metadata.tokenUsage,
        cost: aiResult.metadata.cost,
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
}

// Default instance for use throughout the application
export const defaultAIURLAnalyzer = new AIURLAnalyzer()