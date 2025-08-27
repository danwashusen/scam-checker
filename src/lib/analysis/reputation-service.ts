import { CacheManager } from '../cache/cache-manager'
import { logger } from '../logger'
import type {
  ReputationAnalysis,
  ReputationServiceResult,
  ReputationServiceInterface,
  SafeBrowsingRequest,
  SafeBrowsingResponse,
  SafeBrowsingConfig,
  ReputationRiskFactor
} from '../../types/reputation'
import {
  ThreatType,
  PlatformType,
  ThreatEntryType
} from '../../types/reputation'
import {
  REPUTATION_RISK_THRESHOLDS,
  THREAT_RISK_SCORES,
  PLATFORM_RISK_MULTIPLIERS
} from '../../types/reputation'

/**
 * Google Safe Browsing API service for URL reputation analysis
 * Uses CacheManager for 24-hour caching of reputation data
 */
export class ReputationService implements ReputationServiceInterface {
  private cache: CacheManager<ReputationAnalysis>
  private config: SafeBrowsingConfig
  private stats = {
    totalRequests: 0,
    apiCalls: 0,
    cacheHits: 0
  }

  constructor(config?: Partial<SafeBrowsingConfig>) {
    this.config = {
      apiKey: process.env.GOOGLE_SAFE_BROWSING_API_KEY,
      clientId: 'scam-checker',
      clientVersion: '1.0.0',
      threatTypes: [
        ThreatType.MALWARE,
        ThreatType.SOCIAL_ENGINEERING,
        ThreatType.UNWANTED_SOFTWARE,
        ThreatType.POTENTIALLY_HARMFUL_APPLICATION
      ],
      platformTypes: [
        PlatformType.ANY_PLATFORM,
        PlatformType.WINDOWS,
        PlatformType.LINUX,
        PlatformType.ANDROID,
        PlatformType.OSX,
        PlatformType.IOS,
        PlatformType.CHROME
      ],
      baseUrl: 'https://safebrowsing.googleapis.com/v4',
      timeout: 5000,
      maxRetries: 2,
      ...config
    }

    // Initialize cache with 24-hour TTL as per story requirements
    this.cache = new CacheManager<ReputationAnalysis>({
      prefix: 'reputation',
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 1000
    })
  }

  /**
   * Analyze a single URL for reputation using Google Safe Browsing
   */
  async analyzeURL(url: string): Promise<ReputationServiceResult> {
    this.stats.totalRequests++

    if (!this.config.apiKey) {
      logger.warn('Google Safe Browsing API key not configured')
      return {
        success: false,
        fromCache: false,
        error: {
          message: 'Google Safe Browsing API key not configured',
          type: 'auth_error'
        }
      }
    }

    const cacheKey = this.buildCacheKey(url)

    try {
      // Try to get from cache first
      const analysis = await this.cache.getOrSet(
        cacheKey,
        () => this.performReputationAnalysis(url)
      )

      const fromCache = analysis.timestamp < new Date(Date.now() - 1000) // More than 1 second old = from cache
      if (fromCache) {
        this.stats.cacheHits++
      }

      return {
        success: true,
        data: analysis,
        fromCache
      }
    } catch (error) {
      logger.error('Reputation analysis error', {
        url,
        error: error instanceof Error ? error : new Error(String(error))
      })

      return {
        success: false,
        fromCache: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during reputation analysis',
          type: 'unknown'
        }
      }
    }
  }

  /**
   * Check multiple URLs for reputation (batch processing)
   */
  async checkMultipleURLs(urls: string[]): Promise<ReputationServiceResult[]> {
    // For now, process sequentially. Can be optimized for batch API calls later
    const results = await Promise.allSettled(
      urls.map(url => this.analyzeURL(url))
    )

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        logger.error('Batch reputation check failed', {
          url: urls[index],
          error: result.reason
        })
        return {
          success: false,
          fromCache: false,
          error: {
            message: result.reason instanceof Error ? result.reason.message : 'Batch check failed',
            type: 'unknown'
          }
        }
      }
    })
  }

  /**
   * Clear the reputation cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear()
  }

  /**
   * Get service statistics
   */
  getStats() {
    const cacheStats = this.cache.getStats()
    return {
      cacheHitRate: cacheStats.hitRate,
      totalRequests: this.stats.totalRequests,
      apiCalls: this.stats.apiCalls
    }
  }

  /**
   * Perform actual reputation analysis via Google Safe Browsing API
   */
  private async performReputationAnalysis(url: string): Promise<ReputationAnalysis> {
    this.stats.apiCalls++

    const request: SafeBrowsingRequest = {
      client: {
        clientId: this.config.clientId,
        clientVersion: this.config.clientVersion
      },
      threatInfo: {
        threatTypes: this.config.threatTypes,
        platformTypes: this.config.platformTypes,
        threatEntryTypes: [ThreatEntryType.URL],
        threatEntries: [{ url }]
      }
    }

    const response = await this.callSafeBrowsingAPI(request)
    return this.processAPIResponse(url, response)
  }

  /**
   * Call Google Safe Browsing API with proper error handling
   */
  private async callSafeBrowsingAPI(request: SafeBrowsingRequest): Promise<SafeBrowsingResponse> {
    const endpoint = `${this.config.baseUrl}/threatMatches:find`
    const apiKey = this.config.apiKey!

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

        const response = await fetch(`${endpoint}?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error(`Rate limit exceeded: ${response.statusText}`)
          } else if (response.status === 403) {
            throw new Error(`Authentication failed: ${response.statusText}`)
          } else {
            throw new Error(`API error: ${response.status} ${response.statusText}`)
          }
        }

        const data: SafeBrowsingResponse = await response.json()
        return data
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt < this.config.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Exponential backoff
          logger.warn(`Safe Browsing API attempt ${attempt} failed, retrying in ${delay}ms`, {
            error: lastError,
            attempt,
            maxRetries: this.config.maxRetries
          })
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('All Safe Browsing API attempts failed')
  }

  /**
   * Process Safe Browsing API response into internal format
   */
  private processAPIResponse(url: string, response: SafeBrowsingResponse): ReputationAnalysis {
    const threatMatches = response.matches || []
    const isClean = threatMatches.length === 0

    // Calculate risk factors based on threat matches
    const riskFactors: ReputationRiskFactor[] = []
    let totalRiskScore = 0

    if (isClean) {
      riskFactors.push({
        type: 'reputation-clean',
        score: 0,
        description: 'URL is clean according to Google Safe Browsing'
      })
    } else {
      threatMatches.forEach(match => {
        const baseScore = THREAT_RISK_SCORES[match.threatType] || 50
        const platformMultiplier = PLATFORM_RISK_MULTIPLIERS[match.platformType] || 1.0
        const riskScore = Math.min(baseScore * platformMultiplier, 100)

        riskFactors.push({
          type: `reputation-${match.threatType.toLowerCase()}`,
          score: riskScore,
          description: this.getThreatDescription(match.threatType, match.platformType),
          threatType: match.threatType,
          platformType: match.platformType
        })

        // Use highest risk score for overall assessment
        totalRiskScore = Math.max(totalRiskScore, riskScore)
      })
    }

    // Determine risk level based on score
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    if (totalRiskScore >= REPUTATION_RISK_THRESHOLDS.HIGH_RISK_MIN) {
      riskLevel = 'high'
    } else if (totalRiskScore >= REPUTATION_RISK_THRESHOLDS.MEDIUM_RISK_MIN) {
      riskLevel = 'medium'
    }

    // High confidence for Google Safe Browsing data
    const confidence = isClean ? 0.95 : 0.98

    return {
      url,
      isClean,
      threatMatches,
      riskFactors,
      score: totalRiskScore,
      riskLevel,
      confidence,
      timestamp: new Date()
    }
  }

  /**
   * Generate human-readable threat descriptions
   */
  private getThreatDescription(threatType: ThreatType, platformType: PlatformType): string {
    const platformText = platformType === PlatformType.ANY_PLATFORM || platformType === PlatformType.ALL_PLATFORMS
      ? 'all platforms'
      : platformType.toLowerCase()

    switch (threatType) {
      case ThreatType.MALWARE:
        return `Google Safe Browsing detected malware threat for ${platformText}`
      case ThreatType.SOCIAL_ENGINEERING:
        return `Google Safe Browsing detected phishing/social engineering threat for ${platformText}`
      case ThreatType.UNWANTED_SOFTWARE:
        return `Google Safe Browsing detected unwanted software for ${platformText}`
      case ThreatType.POTENTIALLY_HARMFUL_APPLICATION:
        return `Google Safe Browsing detected potentially harmful application for ${platformText}`
      default:
        return `Google Safe Browsing detected threat for ${platformText}`
    }
  }

  /**
   * Build cache key for URL reputation data
   */
  private buildCacheKey(url: string): string {
    // Normalize URL for consistent caching
    try {
      const normalized = new URL(url)
      return `${normalized.protocol}//${normalized.host}${normalized.pathname}${normalized.search}`
    } catch {
      // Fallback to original URL if parsing fails
      return url
    }
  }
}

// Default service instance
export const defaultReputationService = new ReputationService()