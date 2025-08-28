import type { SafeBrowsingConfig } from './reputation'
import type { WhoisServiceConfig } from './whois'
import type { SSLServiceConfig } from './ssl'

// Re-export the config types for easier access
export type { SafeBrowsingConfig, WhoisServiceConfig, SSLServiceConfig }

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
 * Combined configuration for all services
 */
export interface ServicesConfig {
  reputation?: Partial<SafeBrowsingConfig>
  whois?: Partial<WhoisServiceConfig>
  ssl?: Partial<SSLServiceConfig>
  ai?: Partial<AIAnalyzerConfig>
  logger?: Partial<LoggerConfig>
}

/**
 * Bundle of all analysis services
 */
export interface AnalysisServices {
  reputation: {
    analyzeURL: (url: string) => Promise<{ success: boolean; data?: any; fromCache: boolean; error?: { message: string } }>
    checkMultipleURLs: (urls: string[]) => Promise<any[]>
    clearCache: () => Promise<void>
    getStats: () => any
    config: Record<string, any>
  }
  whois: {
    analyzeDomain: (domain: string | any) => Promise<{ success: boolean; data?: any; fromCache: boolean; error?: { message: string } }>
    getCacheStats: () => any
    clearCache: () => Promise<void>
    isCached: (domain: string) => Promise<boolean>
    config: Record<string, any>
  }
  ssl: {
    analyzeCertificate: (domain: string | any, options?: any) => Promise<{ success: boolean; data?: any; fromCache: boolean; error?: { message: string } }>
    getCacheStats: () => any
    clearCache: () => Promise<void>
    isCached: (domain: string, port?: number) => Promise<boolean>
    config: Record<string, any>
  }
  aiAnalyzer: {
    analyzeURL: (url: string, parsedUrl: any, context: any) => Promise<{ success: boolean; data?: any; fromCache: boolean; error?: { message: string } }>
    isAvailable: () => boolean
    getConfig: () => any
    getCacheStats: () => any
  }
  logger: {
    debug: (message: string, context?: any) => void
    info: (message: string, context?: any) => void
    warn: (message: string, context?: any) => void
    error: (message: string, context?: any) => void
    timer: (message: string, context?: any) => { end: (additionalContext?: any) => void }
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