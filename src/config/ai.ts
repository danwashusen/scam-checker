/**
 * AI Configuration Management
 * Centralized configuration for AI services
 */

import { AIProvider, AIServiceOptions } from '../types/ai'

export interface AIConfig {
  enabled: boolean
  provider: AIProvider
  apiKey: string | null
  model: string
  maxTokens: number
  temperature: number
  timeout: number
  retryAttempts: number
  costThreshold: number // Maximum cost per analysis in USD
  cache: {
    enabled: boolean
    ttl: number // Cache TTL in milliseconds
    maxSize: number
  }
  rateLimit: {
    enabled: boolean
    maxRequestsPerMinute: number
  }
}

export const defaultAIConfig: AIConfig = {
  enabled: true,
  provider: AIProvider.OPENAI,
  apiKey: null,
  model: 'gpt-4',
  maxTokens: 1000,
  temperature: 0.1, // Low temperature for consistent analysis
  timeout: 30000, // 30 seconds
  retryAttempts: 2,
  costThreshold: 0.02, // $0.02 per analysis
  cache: {
    enabled: true,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 1000,
  },
  rateLimit: {
    enabled: true,
    maxRequestsPerMinute: 60,
  },
}

/**
 * Load AI configuration from environment variables
 */
export function loadAIConfig(): AIConfig {
  const config: AIConfig = {
    ...defaultAIConfig,
    enabled: process.env.AI_ANALYSIS_ENABLED !== 'false',
    provider: getAIProvider(),
    apiKey: getAPIKey(),
    model: process.env.AI_MODEL || defaultAIConfig.model,
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || String(defaultAIConfig.maxTokens)),
    temperature: parseFloat(process.env.AI_TEMPERATURE || String(defaultAIConfig.temperature)),
    timeout: parseInt(process.env.AI_TIMEOUT || String(defaultAIConfig.timeout)),
    retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS || String(defaultAIConfig.retryAttempts)),
    costThreshold: parseFloat(process.env.AI_COST_THRESHOLD || String(defaultAIConfig.costThreshold)),
    cache: {
      enabled: process.env.AI_CACHE_ENABLED !== 'false',
      ttl: parseInt(process.env.AI_CACHE_TTL || String(defaultAIConfig.cache.ttl)),
      maxSize: parseInt(process.env.AI_CACHE_MAX_SIZE || String(defaultAIConfig.cache.maxSize)),
    },
    rateLimit: {
      enabled: process.env.AI_RATE_LIMIT_ENABLED !== 'false',
      maxRequestsPerMinute: parseInt(
        process.env.AI_RATE_LIMIT_RPM || String(defaultAIConfig.rateLimit.maxRequestsPerMinute)
      ),
    },
  }

  return config
}

/**
 * Convert AI config to service options
 */
export function createServiceOptions(config: AIConfig): AIServiceOptions {
  if (!config.apiKey) {
    throw new Error(`${config.provider.toUpperCase()} API key is required for AI analysis`)
  }

  return {
    provider: config.provider,
    apiKey: config.apiKey,
    model: config.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    timeout: config.timeout,
    retryAttempts: config.retryAttempts,
    costThreshold: config.costThreshold,
  }
}

/**
 * Validate AI configuration
 */
export function validateAIConfig(config: AIConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.enabled) {
    return { valid: true, errors: [] } // Valid to disable AI
  }

  if (!config.apiKey) {
    errors.push(`${config.provider.toUpperCase()} API key is required when AI analysis is enabled`)
  }

  if (config.maxTokens < 100 || config.maxTokens > 4000) {
    errors.push('AI max tokens must be between 100 and 4000')
  }

  if (config.temperature < 0 || config.temperature > 2) {
    errors.push('AI temperature must be between 0 and 2')
  }

  if (config.timeout < 5000 || config.timeout > 120000) {
    errors.push('AI timeout must be between 5 and 120 seconds')
  }

  if (config.costThreshold <= 0 || config.costThreshold > 1.0) {
    errors.push('AI cost threshold must be between $0.001 and $1.00')
  }

  if (config.cache.ttl < 60000 || config.cache.ttl > 7 * 24 * 60 * 60 * 1000) {
    errors.push('AI cache TTL must be between 1 minute and 7 days')
  }

  if (config.rateLimit.maxRequestsPerMinute < 1 || config.rateLimit.maxRequestsPerMinute > 1000) {
    errors.push('AI rate limit must be between 1 and 1000 requests per minute')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get AI provider from environment
 */
function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase()
  
  switch (provider) {
    case 'openai':
      return AIProvider.OPENAI
    case 'claude':
      return AIProvider.CLAUDE
    default:
      return defaultAIConfig.provider
  }
}

/**
 * Get API key based on provider
 */
function getAPIKey(): string | null {
  const provider = getAIProvider()
  
  switch (provider) {
    case AIProvider.OPENAI:
      return process.env.OPENAI_API_KEY || null
    case AIProvider.CLAUDE:
      return process.env.CLAUDE_API_KEY || null
    default:
      return null
  }
}

/**
 * Get model configuration for provider
 */
export function getProviderModels(provider: AIProvider): string[] {
  switch (provider) {
    case AIProvider.OPENAI:
      return ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
    case AIProvider.CLAUDE:
      return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
    default:
      return []
  }
}

/**
 * Calculate estimated cost for a request
 */
export function estimateRequestCost(
  provider: AIProvider,
  model: string,
  promptTokens: number,
  completionTokens: number = 0
): number {
  // Rough cost estimation based on current pricing (as of 2024)
  // These should be updated with actual pricing
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
    'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
    'gpt-3.5-turbo': { input: 0.0015 / 1000, output: 0.002 / 1000 },
    'claude-3-opus-20240229': { input: 0.015 / 1000, output: 0.075 / 1000 },
    'claude-3-sonnet-20240229': { input: 0.003 / 1000, output: 0.015 / 1000 },
    'claude-3-haiku-20240307': { input: 0.00025 / 1000, output: 0.00125 / 1000 },
  }

  const modelPricing = pricing[model]
  if (!modelPricing) {
    return 0.01 // Default estimate
  }

  return promptTokens * modelPricing.input + completionTokens * modelPricing.output
}