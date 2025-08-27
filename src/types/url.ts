// Re-export types from validation modules for centralized access
export type {
  URLValidationResult,
  URLValidationOptions,
} from '../lib/validation/url-validator'

export type {
  ParsedURL,
} from '../lib/validation/url-parser'

export type {
  URLSanitizationResult,
  SanitizationOptions,
} from '../lib/validation/url-sanitizer'

// Import for local use
import type {
  URLValidationResult,
  URLValidationOptions,
} from '../lib/validation/url-validator'

import type {
  ParsedURL,
} from '../lib/validation/url-parser'

import type {
  URLSanitizationResult,
  SanitizationOptions,
} from '../lib/validation/url-sanitizer'

// Additional shared types for the URL validation system
export interface URLAnalysisInput {
  url: string
  options?: {
    validation?: URLValidationOptions
    sanitization?: SanitizationOptions
    skipValidation?: boolean
    skipSanitization?: boolean
  }
}

export interface URLAnalysisResult {
  original: string
  validation: URLValidationResult
  parsed?: ParsedURL
  sanitization?: URLSanitizationResult
  final: string
  metadata: {
    timestamp: string
    processingTimeMs: number
    version: string
  }
}

export interface URLValidationError {
  type: 'validation' | 'parsing' | 'sanitization' | 'unknown'
  message: string
  details?: Record<string, unknown>
  input: string
  timestamp: string
}

// Frontend-specific types
export interface URLInputState {
  value: string
  isValid: boolean
  isValidating: boolean
  error?: string
  errorType?: URLValidationResult['errorType']
  normalizedUrl?: string
  showSuggestion?: boolean
  suggestion?: string
}

export interface URLValidationFeedback {
  level: 'success' | 'warning' | 'error' | 'info'
  message: string
  suggestion?: string
  action?: {
    label: string
    onClick: () => void
  }
}

// API types
export interface URLValidationRequest {
  url: string
  options?: URLAnalysisInput['options']
}

export interface URLValidationResponse {
  success: boolean
  data?: URLAnalysisResult
  error?: {
    message: string
    type: string
    details?: Record<string, unknown>
  }
  timestamp: string
}

// Utility types
export type URLProtocol = 'http:' | 'https:'
export type URLValidationErrorType = NonNullable<URLValidationResult['errorType']>
export type SanitizationChangeType = URLSanitizationResult['changes'][number]['type']

// Domain analysis types
export interface DomainInfo {
  root: string
  subdomain?: string
  tld: string
  isIP: boolean
  ipVersion?: 'v4' | 'v6'
  depth: number
}

// URL classification types
export interface URLClassification {
  category: 'social' | 'ecommerce' | 'news' | 'blog' | 'corporate' | 'government' | 'education' | 'unknown'
  confidence: number
  indicators: string[]
}

// Security analysis types
export interface SecurityIndicators {
  hasHTTPS: boolean
  hasTrackingParams: boolean
  isShortener: boolean
  suspiciousPatterns: string[]
  riskFactors: Array<{
    type: string
    severity: 'low' | 'medium' | 'high'
    description: string
  }>
}

// URL comparison types
export interface URLComparison {
  original: string
  normalized: string
  differences: Array<{
    type: 'protocol' | 'domain' | 'path' | 'query' | 'fragment'
    original: string
    normalized: string
    impact: 'low' | 'medium' | 'high'
  }>
  similarity: number // 0-1 scale
}

// Batch processing types
export interface URLBatchRequest {
  urls: string[]
  options?: URLAnalysisInput['options']
  batchId?: string
}

export interface URLBatchResult {
  batchId: string
  total: number
  processed: number
  successful: number
  failed: number
  results: Array<{
    input: string
    success: boolean
    data?: URLAnalysisResult
    error?: URLValidationError
  }>
  startTime: string
  endTime: string
  processingTimeMs: number
}

// Configuration types
export interface URLValidationConfig {
  maxLength: number
  allowedProtocols: string[]
  allowPrivateIPs: boolean
  allowLocalhost: boolean
  trackingParams: string[]
  customRules: Array<{
    name: string
    pattern: RegExp
    action: 'allow' | 'block' | 'warn'
    message: string
  }>
}

// Monitoring and analytics types
export interface URLValidationMetrics {
  totalValidations: number
  successRate: number
  averageProcessingTime: number
  errorCounts: Record<URLValidationErrorType, number>
  topFailureReasons: Array<{
    reason: string
    count: number
    percentage: number
  }>
  timeRange: {
    start: string
    end: string
  }
}