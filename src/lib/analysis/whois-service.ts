const whois = require('whois')
import { CacheManager } from '../cache/cache-manager'
import { WhoisParser } from './whois-parser'
import { getRootDomain } from '../validation/url-parser'
import type { ParsedURL } from '../validation/url-parser'
import type {
  DomainAgeAnalysis,
  WhoisLookupResult,
  WhoisError,
  WhoisLookupOptions,
  WhoisServiceConfig,
  WhoisCacheEntry,
  WhoisMetadata
} from '../../types/whois'

/**
 * WHOIS Service with CacheManager integration for domain age analysis
 * 
 * Usage:
 * const whoisService = new WhoisService();
 * const result = await whoisService.analyzeDomain('example.com');
 */
export class WhoisService {
  private cache: CacheManager<WhoisCacheEntry>
  private config: WhoisServiceConfig

  constructor(config?: Partial<WhoisServiceConfig>) {
    this.config = {
      cacheEnabled: true,
      cacheTtl: 24 * 60 * 60 * 1000, // 24 hours
      defaultTimeout: 5000, // 5 seconds
      maxRetries: 2,
      enablePrivacyDetection: true,
      ...config
    }

    // Initialize dedicated cache instance for WHOIS data
    this.cache = new CacheManager<WhoisCacheEntry>({
      prefix: 'whois',
      ttl: this.config.cacheTtl,
      maxSize: 1000
    })
  }

  /**
   * Analyze domain age and registration data
   * Supports both domain strings and ParsedURL objects
   */
  async analyzeDomain(
    domainInput: string | ParsedURL,
    options?: WhoisLookupOptions
  ): Promise<WhoisLookupResult> {
    const startTime = Date.now()
    
    try {
      // Extract domain from input
      const domain = typeof domainInput === 'string' 
        ? this.extractDomain(domainInput)
        : getRootDomain(domainInput)

      if (!domain) {
        return this.createErrorResult(domain || 'unknown', {
          type: 'invalid_domain',
          message: 'Could not extract valid domain from input',
          domain: domain || 'unknown',
          retryable: false,
          timestamp: new Date().toISOString()
        }, startTime)
      }

      // Check cache first if enabled
      if (this.config.cacheEnabled) {
        const cached = await this.getCachedResult(domain)
        if (cached) {
          return {
            success: true,
            domain,
            data: cached.analysis,
            fromCache: true,
            processingTimeMs: Date.now() - startTime
          }
        }
      }

      // Perform WHOIS lookup
      const analysis = await this.performWhoisLookup(domain, options)
      
      // Cache the result if successful
      if (this.config.cacheEnabled && analysis) {
        await this.cacheResult(domain, analysis)
      }

      return {
        success: true,
        domain,
        data: analysis,
        fromCache: false,
        processingTimeMs: Date.now() - startTime
      }

    } catch (error) {
      return this.handleLookupError(
        typeof domainInput === 'string' ? domainInput : domainInput.domain,
        error,
        startTime
      )
    }
  }

  /**
   * Perform the actual WHOIS lookup with retry logic
   */
  private async performWhoisLookup(
    domain: string,
    options?: WhoisLookupOptions
  ): Promise<DomainAgeAnalysis> {
    const lookupOptions = {
      timeout: options?.timeout || this.config.defaultTimeout,
      follow: options?.follow || 2,
      verbose: options?.verbose || false,
      server: options?.server,
    }

    const maxRetries = options?.retries || this.config.maxRetries
    let lastError: any = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now()
        
        // Perform WHOIS lookup
        const rawResponse = await this.whoisLookup(domain, lookupOptions)
        
        const metadata: Partial<WhoisMetadata> = {
          queryTime: Date.now() - startTime,
          followedRedirects: lookupOptions.follow,
          rawResponseSize: rawResponse.length,
          parseErrors: []
        }

        // Parse the response
        const analysis = WhoisParser.parseWhoisResponse(domain, rawResponse, metadata)
        
        // Log successful lookup
        console.info(`WHOIS lookup successful for domain: ${domain}`, {
          domain,
          ageInDays: analysis.ageInDays,
          registrar: analysis.registrar,
          score: analysis.score,
          confidence: analysis.confidence,
          attempt: attempt + 1,
          queryTime: metadata.queryTime
        })

        return analysis

      } catch (error: any) {
        lastError = error
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
          console.warn(`WHOIS lookup failed for ${domain}, retrying in ${delay}ms`, {
            domain,
            attempt: attempt + 1,
            maxRetries,
            error: error.message
          })
          
          await this.sleep(delay)
        }
      }
    }

    // All retries failed, throw the last error
    throw lastError
  }

  /**
   * Wrapper around whois.lookup with Promise support
   */
  private whoisLookup(domain: string, options: any): Promise<string> {
    return new Promise((resolve, reject) => {
      whois.lookup(domain, options, (err: any, data: string) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  }

  /**
   * Extract domain from various input formats
   */
  private extractDomain(input: string): string | null {
    try {
      // Remove protocol and path if present
      const cleaned = input.replace(/^https?:\/\//, '').split('/')[0].split('?')[0]
      
      // Handle port numbers
      const withoutPort = cleaned.split(':')[0]
      
      // Basic domain validation - allow subdomains
      if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(withoutPort)) {
        return null
      }
      
      return withoutPort.toLowerCase()
    } catch {
      return null
    }
  }

  /**
   * Get cached WHOIS result if available and not expired
   */
  private async getCachedResult(domain: string): Promise<WhoisCacheEntry | null> {
    try {
      return await this.cache.get(domain)
    } catch (error) {
      console.warn(`Cache retrieval failed for domain ${domain}:`, error)
      return null
    }
  }

  /**
   * Cache WHOIS analysis result
   */
  private async cacheResult(domain: string, analysis: DomainAgeAnalysis): Promise<void> {
    try {
      const cacheEntry: WhoisCacheEntry = {
        domain,
        whoisData: { raw: '' }, // Raw data not needed for cache
        analysis,
        timestamp: new Date().toISOString(),
        ttl: this.config.cacheTtl
      }

      await this.cache.set(domain, cacheEntry)
    } catch (error) {
      console.warn(`Failed to cache WHOIS result for domain ${domain}:`, error)
      // Don't throw - caching failure shouldn't break the lookup
    }
  }

  /**
   * Handle WHOIS lookup errors
   */
  private handleLookupError(
    domain: string,
    error: any,
    startTime: number
  ): WhoisLookupResult {
    const whoisError = this.categorizeError(domain, error)
    
    console.error(`WHOIS lookup failed for domain: ${domain}`, {
      domain,
      errorType: whoisError.type,
      errorMessage: whoisError.message,
      retryable: whoisError.retryable,
      processingTime: Date.now() - startTime
    })

    return this.createErrorResult(domain, whoisError, startTime)
  }

  /**
   * Categorize errors for better handling
   */
  private categorizeError(domain: string, error: any): WhoisError {
    const timestamp = new Date().toISOString()
    
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return {
        type: 'not_found',
        message: 'Domain not found in WHOIS database',
        domain,
        retryable: false,
        timestamp,
        details: { code: error.code }
      }
    }
    
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'WHOIS query timed out',
        domain,
        retryable: true,
        timestamp,
        details: { timeout: true }
      }
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      return {
        type: 'network',
        message: 'Network connection error during WHOIS lookup',
        domain,
        retryable: true,
        timestamp,
        details: { code: error.code }
      }
    }
    
    if (error.message?.toLowerCase().includes('rate limit') || error.message?.toLowerCase().includes('quota')) {
      return {
        type: 'rate_limit',
        message: 'WHOIS server rate limit exceeded',
        domain,
        retryable: true,
        timestamp,
        details: { rateLimited: true }
      }
    }
    
    return {
      type: 'unknown',
      message: error.message || 'Unknown WHOIS lookup error',
      domain,
      retryable: false,
      timestamp,
      details: error
    }
  }

  /**
   * Create error result object
   */
  private createErrorResult(
    domain: string,
    error: WhoisError,
    startTime: number
  ): WhoisLookupResult {
    return {
      success: false,
      domain,
      error,
      fromCache: false,
      processingTimeMs: Date.now() - startTime
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * Clear WHOIS cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear()
  }

  /**
   * Check if domain analysis is cached
   */
  async isCached(domain: string): Promise<boolean> {
    return await this.cache.has(domain)
  }
}

/**
 * Default WHOIS service instance
 */
export const defaultWhoisService = new WhoisService()