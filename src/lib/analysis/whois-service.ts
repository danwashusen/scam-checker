import * as whois from 'whois'
import { CacheManager } from '../cache/cache-manager'
import { WhoisParser } from './whois-parser'
import { getRootDomain } from '../validation/url-parser'
import { Logger } from '../logger'

// Create logger instance - this will be replaced with dependency injection later
const logger = new Logger()
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
  public config: WhoisServiceConfig

  constructor(config?: Partial<WhoisServiceConfig>, cache?: CacheManager<WhoisCacheEntry>) {
    this.config = {
      cacheEnabled: true,
      cacheTtl: 24 * 60 * 60 * 1000, // 24 hours
      defaultTimeout: 5000, // 5 seconds
      maxRetries: 2,
      enablePrivacyDetection: true,
      ...config
    }

    // Use provided cache or initialize dedicated cache instance for WHOIS data
    this.cache = cache || new CacheManager<WhoisCacheEntry>({
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
    let lastError: unknown = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now()
        
        // Perform WHOIS lookup
        const rawResponse = await this.whoisLookup(domain, lookupOptions)
        
        // Check if response indicates domain doesn't exist
        if (this.isDomainNotFound(rawResponse)) {
          throw new Error(`Domain not found: ${domain}`)
        }
        
        const metadata: Partial<WhoisMetadata> = {
          queryTime: Date.now() - startTime,
          followedRedirects: lookupOptions.follow,
          rawResponseSize: rawResponse.length,
          parseErrors: []
        }

        // Parse the response
        const analysis = WhoisParser.parseWhoisResponse(domain, rawResponse, metadata)
        
        // Log successful lookup
        logger.info('WHOIS lookup successful', {
          domain,
          ageInDays: analysis.ageInDays,
          registrar: analysis.registrar,
          score: analysis.score,
          confidence: analysis.confidence,
          attempt: attempt + 1,
          queryTime: metadata.queryTime
        })

        return analysis

      } catch (error: unknown) {
        lastError = error
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
          logger.warn('WHOIS lookup failed, retrying', {
            domain,
            attempt: attempt + 1,
            maxRetries,
            retryDelay: delay,
            error: error instanceof Error ? error : new Error(String(error))
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
  private whoisLookup(domain: string, options: WhoisLookupOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      whois.lookup(domain, options, (err: unknown, data?: string) => {
        if (err) {
          reject(err)
        } else {
          resolve(data || '')
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
      
      // Extract root domain from subdomain (e.g., www.github.com -> github.com)
      const domainParts = withoutPort.toLowerCase().split('.')
      if (domainParts.length >= 2) {
        // Return the last two parts as the root domain (domain.tld)
        return domainParts.slice(-2).join('.')
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
      logger.warn('Cache retrieval failed for WHOIS domain', {
        domain,
        error: error instanceof Error ? error : new Error(String(error))
      })
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
      logger.warn('Failed to cache WHOIS result', {
        domain,
        error: error instanceof Error ? error : new Error(String(error))
      })
      // Don't throw - caching failure shouldn't break the lookup
    }
  }

  /**
   * Handle WHOIS lookup errors
   */
  private handleLookupError(
    domain: string,
    error: unknown,
    startTime: number
  ): WhoisLookupResult {
    const whoisError = this.categorizeError(domain, error)
    
    logger.error('WHOIS lookup failed', {
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
  private categorizeError(domain: string, error: unknown): WhoisError {
    const timestamp = new Date().toISOString()
    
    const err = error as { code?: string; message?: string }
    
    // Check for domain not found in WHOIS response
    if (err.message?.includes('Domain not found')) {
      return {
        type: 'not_found',
        message: 'Domain does not exist in WHOIS database',
        domain,
        retryable: false,
        timestamp,
        details: { reason: 'domain_nonexistent' }
      }
    }
    
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return {
        type: 'not_found',
        message: 'Domain not found in WHOIS database',
        domain,
        retryable: false,
        timestamp,
        details: { code: err.code }
      }
    }
    
    if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'WHOIS query timed out',
        domain,
        retryable: true,
        timestamp,
        details: { timeout: true }
      }
    }
    
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
      return {
        type: 'network',
        message: 'Network connection error during WHOIS lookup',
        domain,
        retryable: true,
        timestamp,
        details: { code: err.code }
      }
    }
    
    if (err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('quota')) {
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
      message: err.message || 'Unknown WHOIS lookup error',
      domain,
      retryable: false,
      timestamp,
      details: err
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
   * Check if WHOIS response indicates domain doesn't exist
   */
  private isDomainNotFound(response: string): boolean {
    const lowercaseResponse = response.toLowerCase()
    
    // Common patterns indicating domain doesn't exist
    const notFoundPatterns = [
      'no match for domain',
      'not found',
      'no matching record',
      'no data found',
      'domain not found',
      'no entries found',
      'status: available',
      'domain status: available',
      'no match'
    ]
    
    return notFoundPatterns.some(pattern => lowercaseResponse.includes(pattern))
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

// Temporary backward compatibility for tests - DEPRECATED, use ServiceFactory instead
/** @deprecated Use ServiceFactory.createWhoisService() instead */
export const defaultWhoisService = new WhoisService()

