/**
 * AI Analysis Types
 * Defines interfaces for AI-powered URL risk analysis
 */

export interface AIAnalysisResult {
  riskScore: number // 0-100
  confidence: number // 0-100
  primaryRisks: string[]
  scamCategory: ScamCategory
  indicators: string[]
  explanation: string
  metadata: AIAnalysisMetadata
}

export interface AIAnalysisMetadata {
  timestamp: string
  promptVersion: string
  provider: AIProvider
  processingTimeMs: number
  tokenUsage?: TokenUsage
  cost?: number
  // Enhanced metadata for v2.0
  patternAnalysis?: {
    suspiciousScore: number
    detectedPatterns: string[]
    isHomograph: boolean
    isTyposquat: boolean
    brandImpersonation?: {
      likelyTarget: string
      confidence: number
    }
  }
  promptSelection?: {
    versionId: string
    isExperiment: boolean
    selectionReason: string
  }
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export enum ScamCategory {
  LEGITIMATE = 'legitimate',
  FINANCIAL = 'financial',
  PHISHING = 'phishing',
  ECOMMERCE = 'ecommerce',
  SOCIAL_ENGINEERING = 'social_engineering'
}

export enum AIProvider {
  OPENAI = 'openai',
  CLAUDE = 'claude'
}

export interface AIServiceOptions {
  provider: AIProvider
  apiKey: string
  model?: string
  maxTokens?: number
  temperature?: number
  timeout?: number
  retryAttempts?: number
  costThreshold?: number
}

export interface AIAnalysisRequest {
  url: string
  domain: string
  path: string
  parameters: Record<string, string>
  technicalContext: TechnicalAnalysisContext
}

export interface TechnicalAnalysisContext {
  domainAge?: {
    ageInDays: number | null
    registrationDate: string | null
    registrar: string | null
  }
  sslCertificate?: {
    certificateType: string | null
    certificateAuthority: string | null
    daysUntilExpiry: number | null
    issuedDate: string | null
  }
  reputation?: {
    isClean: boolean
    riskLevel: 'low' | 'medium' | 'high'
    threatCount: number
    threatTypes: string[]
  }
  urlStructure: {
    isIP: boolean
    subdomain?: string
    pathDepth: number
    queryParamCount: number
    hasHttps: boolean
  }
}

export interface AIPromptConfig {
  version: string
  systemPrompt: string
  responseFormat: string
  maxRetries: number
  cacheKey: string
}

export interface AIServiceResult<T> {
  success: boolean
  data: T | null
  error?: AIServiceError
  fromCache: boolean
  metadata: {
    processingTime: number
    tokenUsage?: TokenUsage
    cost?: number
  }
}

export interface AIServiceError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export enum AIErrorCode {
  API_KEY_MISSING = 'api_key_missing',
  API_KEY_INVALID = 'api_key_invalid',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  COST_THRESHOLD_EXCEEDED = 'cost_threshold_exceeded',
  INVALID_RESPONSE = 'invalid_response',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Expected structure of AI response for URL analysis
 */
export interface AIRawResponse {
  risk_score: number
  confidence: number
  primary_risks: string[]
  scam_category: string
  indicators: string[]
  explanation: string
}