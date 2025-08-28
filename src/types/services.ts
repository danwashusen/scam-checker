import type { SafeBrowsingConfig, ReputationAnalysis } from './reputation'
import type { WhoisServiceConfig, DomainAgeAnalysis } from './whois'
import type { SSLServiceConfig, SSLCertificateAnalysis } from './ssl'
import type { ScoringConfig } from './scoring'
import type { AIAnalysisResult, TechnicalAnalysisContext, AIServiceResult } from './ai'
import type { ParsedURL } from '../lib/validation/url-parser'
import type { LogContext } from '../lib/logger'
// Define CacheStats locally since ./cache module may not exist
interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  size: number
  maxSize: number
}

// Re-export the config types for easier access
export type { SafeBrowsingConfig, WhoisServiceConfig, SSLServiceConfig, ScoringConfig }

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level?: 'silent' | 'error' | 'warn' | 'info' | 'debug'
  format?: 'json' | 'pretty'
  destination?: 'console' | 'file' | 'lambda'
}

/**
 * AI Analyzer configuration interface
 */
export interface AIAnalyzerConfig {
  enabled?: boolean
  provider?: 'openai' | 'anthropic'
  model?: string
  apiKey?: string
  timeout?: number
  maxRetries?: number
  cacheEnabled?: boolean
  cacheTtl?: number
  maxTokens?: number
  temperature?: number
}

/**
 * Orchestration configuration interface
 */
export interface OrchestrationConfig {
  timeouts?: {
    totalAnalysisTimeout?: number
    serviceTimeout?: number
    scoringTimeout?: number
  }
  parallelExecution?: {
    enabled?: boolean
    maxConcurrency?: number
  }
  errorHandling?: {
    continueOnPartialFailure?: boolean
    minimumRequiredServices?: number
    retryFailedServices?: boolean
    maxRetries?: number
  }
}

/**
 * Combined configuration for all services
 */
export interface ServicesConfig {
  reputation?: Partial<SafeBrowsingConfig>
  whois?: Partial<WhoisServiceConfig>
  ssl?: Partial<SSLServiceConfig>
  ai?: Partial<AIAnalyzerConfig>
  logger?: Partial<LoggerConfig>
  scoring?: Partial<ScoringConfig>
  orchestration?: Partial<OrchestrationConfig>
}

/**
 * Bundle of all analysis services
 */
export interface AnalysisServices {
  reputation: {
    analyzeURL: (url: string) => Promise<{ success: boolean; data?: ReputationAnalysis; fromCache: boolean; error?: { message: string } }>
    checkMultipleURLs: (urls: string[]) => Promise<Array<{ success: boolean; data?: ReputationAnalysis; fromCache: boolean; error?: { message: string } }>>
    clearCache: () => Promise<void>
    getStats: () => { cacheHitRate: number; totalRequests: number; apiCalls: number }
    config: SafeBrowsingConfig
  }
  whois: {
    analyzeDomain: (domain: string | ParsedURL) => Promise<{ success: boolean; data?: DomainAgeAnalysis; fromCache: boolean; error?: { message: string } }>
    getCacheStats: () => CacheStats
    clearCache: () => Promise<void>
    isCached: (domain: string) => Promise<boolean>
    config: WhoisServiceConfig
  }
  ssl: {
    analyzeCertificate: (domain: string, options?: { timeout?: number }) => Promise<{ success: boolean; data?: SSLCertificateAnalysis; fromCache: boolean; error?: { message: string } }>
    getCacheStats: () => CacheStats
    clearCache: () => Promise<void>
    isCached: (domain: string, port?: number) => Promise<boolean>
    config: SSLServiceConfig
  }
  aiAnalyzer: {
    analyzeURL: (url: string, parsedUrl: ParsedURL, context: TechnicalAnalysisContext) => Promise<AIServiceResult<AIAnalysisResult>>
    isAvailable: () => boolean
    getConfig: () => Record<string, unknown>
    getCacheStats: () => CacheStats
  }
  logger: {
    debug: (message: string, context?: LogContext) => void
    info: (message: string, context?: LogContext) => void
    warn: (message: string, context?: LogContext) => void
    error: (message: string, context?: LogContext) => void
    timer: (message: string, context?: LogContext) => { end: (additionalContext?: LogContext) => void }
  }
}

/**
 * Environment-specific service configuration
 */
export type ServiceEnvironment = 'development' | 'staging' | 'production'

/**
 * Service factory configuration options
 */
export interface ServiceFactoryOptions {
  environment?: ServiceEnvironment
  config?: ServicesConfig
  overrides?: Partial<ServicesConfig>
}