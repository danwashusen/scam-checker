/**
 * AI Service Infrastructure
 * Handles AI provider integration with retry logic, cost tracking, and error handling
 */

import OpenAI from 'openai'
import type {
  AIServiceOptions,
  AIServiceResult,
  TokenUsage,
} from '../../types/ai'
import {
  AIProvider,
  AIErrorCode,
} from '../../types/ai'
import { estimateRequestCost } from '../../config/ai'
import { Logger } from '../logger'

// Create logger instance - this will be replaced with dependency injection later
const logger = new Logger()

/**
 * AI Service class for handling different AI providers
 */
export class AIService {
  private openaiClient?: OpenAI
  private options: AIServiceOptions
  private requestCount: number = 0
  private totalCost: number = 0

  constructor(options: AIServiceOptions) {
    this.options = options
    this.initializeProvider()
  }

  /**
   * Initialize AI provider client
   */
  private initializeProvider(): void {
    switch (this.options.provider) {
      case AIProvider.OPENAI:
        this.openaiClient = new OpenAI({
          apiKey: this.options.apiKey,
          timeout: this.options.timeout,
        })
        break
      case AIProvider.CLAUDE:
        // Note: Claude API integration would go here
        // For now, we'll focus on OpenAI implementation
        throw new Error('Claude provider not yet implemented')
      default:
        throw new Error(`Unsupported AI provider: ${this.options.provider}`)
    }
  }

  /**
   * Analyze text with AI provider
   */
  async analyzeText(prompt: string): Promise<AIServiceResult<string>> {
    const startTime = Date.now()

    try {
      // Check cost threshold
      const estimatedCost = estimateRequestCost(
        this.options.provider,
        this.options.model || 'gpt-4',
        this.estimateTokens(prompt)
      )

      if (this.totalCost + estimatedCost > (this.options.costThreshold || 0.02)) {
        return this.createErrorResult(AIErrorCode.COST_THRESHOLD_EXCEEDED, 'Cost threshold would be exceeded')
      }

      // Perform analysis with retry logic
      const result = await this.executeWithRetry(prompt)

      const processingTime = Date.now() - startTime

      // Update usage tracking
      this.requestCount++
      this.totalCost += result.metadata.cost || estimatedCost

      logger.info('AI analysis completed', {
        provider: this.options.provider,
        model: this.options.model,
        processingTime,
        tokenUsage: result.metadata.tokenUsage,
        cost: result.metadata.cost,
        requestCount: this.requestCount,
        totalCost: this.totalCost,
      })

      return {
        success: true,
        data: result.content,
        fromCache: false,
        metadata: {
          processingTime,
          tokenUsage: result.metadata.tokenUsage,
          cost: result.metadata.cost,
        },
      }
    } catch (error) {
      const processingTime = Date.now() - startTime

      logger.error('AI analysis failed', {
        provider: this.options.provider,
        error: error instanceof Error ? error : new Error(String(error)),
        processingTime,
      })

      return this.createErrorResult(
        this.mapErrorToCode(error),
        error instanceof Error ? error.message : 'Unknown error occurred',
        { processingTime, tokenUsage: undefined, cost: undefined }
      )
    }
  }

  /**
   * Execute AI request with retry logic
   */
  private async executeWithRetry(prompt: string): Promise<{
    content: string
    metadata: { tokenUsage?: TokenUsage; cost?: number }
  }> {
    let lastError: Error | null = null
    const maxRetries = this.options.retryAttempts || 2

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
          await new Promise(resolve => setTimeout(resolve, delay))

          logger.info('Retrying AI request', {
            attempt,
            maxRetries,
            delay,
          })
        }

        switch (this.options.provider) {
          case AIProvider.OPENAI:
            return await this.executeOpenAIRequest(prompt)
          default:
            throw new Error(`Unsupported provider: ${this.options.provider}`)
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Don't retry on certain errors
        if (this.isNonRetryableError(lastError)) {
          throw lastError
        }

        if (attempt === maxRetries) {
          throw lastError
        }
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }

  /**
   * Execute OpenAI API request
   */
  private async executeOpenAIRequest(prompt: string): Promise<{
    content: string
    metadata: { tokenUsage?: TokenUsage; cost?: number }
  }> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized')
    }

    const response = await this.openaiClient.chat.completions.create({
      model: this.options.model || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
      ],
      max_tokens: this.options.maxTokens,
      temperature: this.options.temperature,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response content received from OpenAI')
    }

    const tokenUsage: TokenUsage | undefined = response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined

    const cost = tokenUsage
      ? estimateRequestCost(
          this.options.provider,
          this.options.model || 'gpt-4',
          tokenUsage.promptTokens,
          tokenUsage.completionTokens
        )
      : undefined

    return {
      content,
      metadata: {
        tokenUsage,
        cost,
      },
    }
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      'api_key',
      'invalid_request',
      'permission',
      'billing',
      'quota',
      'context_length_exceeded',
    ]

    return nonRetryablePatterns.some(pattern =>
      error.message.toLowerCase().includes(pattern)
    )
  }

  /**
   * Map error to AI error code
   */
  private mapErrorToCode(error: unknown): AIErrorCode {
    if (!(error instanceof Error)) {
      return AIErrorCode.UNKNOWN_ERROR
    }

    const message = error.message.toLowerCase()

    if (message.includes('api_key') || message.includes('authentication')) {
      return AIErrorCode.API_KEY_INVALID
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return AIErrorCode.RATE_LIMIT_EXCEEDED
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return AIErrorCode.TIMEOUT
    }
    if (message.includes('network') || message.includes('connection')) {
      return AIErrorCode.NETWORK_ERROR
    }
    if (message.includes('cost') || message.includes('threshold')) {
      return AIErrorCode.COST_THRESHOLD_EXCEEDED
    }

    return AIErrorCode.UNKNOWN_ERROR
  }

  /**
   * Create error result
   */
  private createErrorResult<T>(
    code: AIErrorCode,
    message: string,
    metadata?: { processingTime: number; tokenUsage?: TokenUsage; cost?: number }
  ): AIServiceResult<T> {
    return {
      success: false,
      data: null,
      error: {
        code,
        message,
      },
      fromCache: false,
      metadata: metadata || { processingTime: 0 },
    }
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough approximation: ~4 characters per token for English text
    return Math.ceil(text.length / 4)
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    requestCount: number
    totalCost: number
    averageCost: number
  } {
    return {
      requestCount: this.requestCount,
      totalCost: this.totalCost,
      averageCost: this.requestCount > 0 ? this.totalCost / this.requestCount : 0,
    }
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.requestCount = 0
    this.totalCost = 0
  }
}

/**
 * Create AI service instance with configuration
 */
export function createAIService(options: AIServiceOptions): AIService {
  return new AIService(options)
}