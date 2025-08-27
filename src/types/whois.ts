/**
 * Raw WHOIS response data from the whois library
 */
export interface WhoisData {
  raw: string
  parsed?: {
    creationDate?: string | null
    expirationDate?: string | null
    updatedDate?: string | null
    registrar?: string | null
    nameservers?: string[] | null
    status?: string[] | null
    registrant?: {
      organization?: string | null
      country?: string | null
    } | null
    admin?: {
      organization?: string | null
      country?: string | null
    } | null
    tech?: {
      organization?: string | null
      country?: string | null
    } | null
  }
}

/**
 * Processed domain age analysis results
 * Aligns with DomainAnalysis from data models
 */
export interface DomainAgeAnalysis {
  ageInDays: number | null
  registrationDate: Date | null
  expirationDate: Date | null
  updatedDate: Date | null
  registrar: string | null
  nameservers: string[]
  status: string[]
  score: number // Risk score 0-1 (higher is more risky)
  confidence: number // Confidence in analysis 0-1
  privacyProtected: boolean
  registrantCountry: string | null
  riskFactors: Array<{
    type: 'age' | 'privacy' | 'registrar' | 'location' | 'status'
    description: string
    score: number
  }>
}

/**
 * Cache entry for WHOIS data
 */
export interface WhoisCacheEntry {
  domain: string
  whoisData: WhoisData
  analysis: DomainAgeAnalysis
  timestamp: string
  ttl: number
}

/**
 * WHOIS lookup options
 */
export interface WhoisLookupOptions {
  timeout?: number // Timeout in milliseconds (default: 5000)
  follow?: number // Number of redirects to follow (default: 2)
  verbose?: boolean // Return all server responses (default: false)
  server?: string // Custom WHOIS server
  retries?: number // Number of retries on failure (default: 2)
}

/**
 * WHOIS service configuration
 */
export interface WhoisServiceConfig {
  cacheEnabled: boolean
  cacheTtl: number // Cache TTL in milliseconds
  defaultTimeout: number
  maxRetries: number
  enablePrivacyDetection: boolean
}

/**
 * WHOIS lookup result
 */
export interface WhoisLookupResult {
  success: boolean
  domain: string
  data?: DomainAgeAnalysis
  error?: WhoisError
  fromCache: boolean
  processingTimeMs: number
}

/**
 * WHOIS error types
 */
export interface WhoisError {
  type: 'network' | 'timeout' | 'parsing' | 'not_found' | 'rate_limit' | 'invalid_domain' | 'unknown'
  message: string
  domain: string
  retryable: boolean
  details?: any
  timestamp: string
}

/**
 * Domain age risk categories
 */
export type DomainAgeRisk = 'very_new' | 'new' | 'recent' | 'established' | 'mature'

/**
 * Risk scoring thresholds for domain age
 */
export interface DomainAgeThresholds {
  very_new: number // < 30 days
  new: number // 30-90 days  
  recent: number // 90-365 days
  established: number // 1-2 years
  mature: number // > 2 years
}

/**
 * Common WHOIS date formats for parsing
 */
export type WhoisDateFormat = 
  | 'iso' // 2023-01-15T00:00:00Z
  | 'us' // 01/15/2023
  | 'eu' // 15/01/2023  
  | 'dot' // 15.01.2023
  | 'dash' // 2023-01-15
  | 'text' // 15-Jan-2023

/**
 * Registrar reputation data
 */
export interface RegistrarInfo {
  name: string
  normalized: string
  trustScore: number // 0-1 (higher is more trustworthy)
  knownForScams: boolean
  registrationVolume: 'low' | 'medium' | 'high'
}

/**
 * Privacy protection indicators
 */
export interface PrivacyProtection {
  enabled: boolean
  service?: string // Privacy service provider
  indicators: string[] // Text patterns that indicate privacy protection
}

/**
 * WHOIS response metadata
 */
export interface WhoisMetadata {
  server: string | null
  queryTime: number // Time taken for query in ms
  followedRedirects: number
  rawResponseSize: number
  parseErrors: string[]
}