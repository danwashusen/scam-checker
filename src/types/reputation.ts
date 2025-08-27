// Google Safe Browsing API types and reputation analysis interfaces

// Safe Browsing API v4 Types
export enum ThreatType {
  MALWARE = 'MALWARE',
  SOCIAL_ENGINEERING = 'SOCIAL_ENGINEERING', 
  UNWANTED_SOFTWARE = 'UNWANTED_SOFTWARE',
  POTENTIALLY_HARMFUL_APPLICATION = 'POTENTIALLY_HARMFUL_APPLICATION'
}

export enum PlatformType {
  ANY_PLATFORM = 'ANY_PLATFORM',
  ALL_PLATFORMS = 'ALL_PLATFORMS',
  WINDOWS = 'WINDOWS',
  LINUX = 'LINUX',
  ANDROID = 'ANDROID',
  OSX = 'OSX',
  IOS = 'IOS',
  CHROME = 'CHROME'
}

export enum ThreatEntryType {
  URL = 'URL'
}

// Safe Browsing API Request/Response
export interface SafeBrowsingRequest {
  client: {
    clientId: string
    clientVersion: string
  }
  threatInfo: {
    threatTypes: ThreatType[]
    platformTypes: PlatformType[]
    threatEntryTypes: ThreatEntryType[]
    threatEntries: Array<{
      url: string
    }>
  }
}

export interface ThreatMatch {
  threatType: ThreatType
  platformType: PlatformType
  threatEntryType: ThreatEntryType
  threat: {
    url: string
  }
  threatEntryMetadata?: {
    entries: Array<{
      key: string
      value: string
    }>
  }
  cacheDuration: string
}

export interface SafeBrowsingResponse {
  matches?: ThreatMatch[]
}

// Internal reputation analysis types
export interface ReputationRiskFactor {
  type: string
  score: number
  description: string
  threatType?: ThreatType
  platformType?: PlatformType
}

export interface ReputationAnalysis {
  url: string
  isClean: boolean
  threatMatches: ThreatMatch[]
  riskFactors: ReputationRiskFactor[]
  score: number // 0-100 risk score
  riskLevel: 'low' | 'medium' | 'high'
  confidence: number // 0-1 confidence level
  timestamp: Date
  cacheDuration?: number
  error?: string
}

export interface ReputationServiceResult {
  success: boolean
  data?: ReputationAnalysis
  fromCache: boolean
  error?: {
    message: string
    code?: string
    type: 'api_error' | 'network_error' | 'auth_error' | 'quota_exceeded' | 'unknown'
  }
}

// Configuration types
export interface SafeBrowsingConfig {
  apiKey?: string
  clientId: string
  clientVersion: string
  threatTypes: ThreatType[]
  platformTypes: PlatformType[]
  baseUrl: string
  timeout: number
  maxRetries: number
}

// Reputation service interface
export interface ReputationServiceInterface {
  analyzeURL(url: string): Promise<ReputationServiceResult>
  checkMultipleURLs(urls: string[]): Promise<ReputationServiceResult[]>
  clearCache(): Promise<void>
  getStats(): {
    cacheHitRate: number
    totalRequests: number
    apiCalls: number
  }
}

// Risk scoring constants
export const REPUTATION_RISK_THRESHOLDS = {
  HIGH_RISK_MIN: 70,
  MEDIUM_RISK_MIN: 30,
  LOW_RISK_MAX: 29
} as const

export const THREAT_RISK_SCORES = {
  [ThreatType.MALWARE]: 100,
  [ThreatType.SOCIAL_ENGINEERING]: 95,
  [ThreatType.UNWANTED_SOFTWARE]: 80,
  [ThreatType.POTENTIALLY_HARMFUL_APPLICATION]: 60
} as const

// Platform risk multipliers
export const PLATFORM_RISK_MULTIPLIERS = {
  [PlatformType.ANY_PLATFORM]: 1.0,
  [PlatformType.ALL_PLATFORMS]: 1.0,
  [PlatformType.WINDOWS]: 0.9,
  [PlatformType.ANDROID]: 0.8,
  [PlatformType.CHROME]: 0.7,
  [PlatformType.LINUX]: 0.6,
  [PlatformType.OSX]: 0.6,
  [PlatformType.IOS]: 0.5
} as const