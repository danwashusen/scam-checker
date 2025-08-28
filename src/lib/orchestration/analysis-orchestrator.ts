/**
 * Analysis Orchestrator
 * Coordinates parallel execution of all analysis services and aggregates results for scoring
 */

import type {
  ScoringInput,
  ScoringResult,
  ScoringConfig,
  RiskFactorType
} from '../../types/scoring'
import type { ReputationAnalysis } from '../../types/reputation'
import type { DomainAgeAnalysis } from '../../types/whois'
import type { SSLCertificateAnalysis } from '../../types/ssl'
import type { AIAnalysisResult, TechnicalAnalysisContext } from '../../types/ai'
import type {
  AnalysisServices,
  ServicesConfig
} from '../../types/services'
import type { ParsedURL } from '../validation/url-parser'
import { ScoringCalculator } from '../scoring/scoring-calculator'
import { ServiceFactory } from '../services/service-factory'
import { parseURL } from '../validation/url-parser'
import { validateURL } from '../validation/url-validator'
import { Logger } from '../logger'

const logger = new Logger()

/**
 * Service execution result
 */
interface ServiceResult {
  data?: unknown
  processingTime: number
  fromCache: boolean
  error?: string
}

/**
 * All service results
 */
interface ServiceResults {
  reputation?: ServiceResult
  whois?: ServiceResult
  ssl?: ServiceResult
  ai?: ServiceResult
}

/**
 * Configuration for analysis orchestration
 */
export interface OrchestrationConfig {
  scoring?: Partial<ScoringConfig>
  services?: ServicesConfig
  timeouts: {
    totalAnalysisTimeout: number // Maximum time for complete analysis
    serviceTimeout: number // Maximum time per service
    scoringTimeout: number // Maximum time for scoring calculation
  }
  parallelExecution: {
    enabled: boolean
    maxConcurrency: number
  }
  errorHandling: {
    continueOnPartialFailure: boolean // Continue analysis if some services fail
    minimumRequiredServices: number // Minimum services needed for valid result
    retryFailedServices: boolean
    maxRetries: number
  }
  caching: {
    respectServiceCaching: boolean // Use individual service caching
    aggregateResults: boolean // Cache final orchestration results
    cacheTtl: number
  }
}

/**
 * Result of orchestrated analysis including performance metrics
 */
export interface OrchestrationResult {
  scoringResult: ScoringResult
  serviceResults: {
    reputation?: { success: boolean; processingTime: number; fromCache: boolean; error?: string }
    whois?: { success: boolean; processingTime: number; fromCache: boolean; error?: string }
    ssl?: { success: boolean; processingTime: number; fromCache: boolean; error?: string }
    ai?: { success: boolean; processingTime: number; fromCache: boolean; error?: string }
  }
  orchestrationMetrics: {
    totalProcessingTime: number
    servicesExecuted: number
    servicesSucceeded: number
    servicesFailed: number
    cachingEnabled: boolean
    parallelExecution: boolean
  }
}

/**
 * Default orchestration configuration
 */
export const DEFAULT_ORCHESTRATION_CONFIG: OrchestrationConfig = {
  timeouts: {
    totalAnalysisTimeout: 60000, // 60 seconds
    serviceTimeout: 30000, // 30 seconds per service
    scoringTimeout: 5000 // 5 seconds for scoring
  },
  parallelExecution: {
    enabled: true,
    maxConcurrency: 4 // Run all services in parallel
  },
  errorHandling: {
    continueOnPartialFailure: true,
    minimumRequiredServices: 2, // Need at least 2 services for valid result
    retryFailedServices: false, // Services handle their own retries
    maxRetries: 1
  },
  caching: {
    respectServiceCaching: true,
    aggregateResults: false, // Don't cache orchestration results by default
    cacheTtl: 5 * 60 * 1000 // 5 minutes
  }
}

/**
 * Main orchestrator that coordinates all analysis services
 * Manages parallel execution, error handling, and result aggregation
 */
export class AnalysisOrchestrator {
  private config: OrchestrationConfig
  private scoringCalculator: ScoringCalculator
  private services: AnalysisServices
  private analysisHistory: Array<{ url: string; result: OrchestrationResult; timestamp: Date }> = []

  constructor(config?: Partial<OrchestrationConfig>) {
    this.config = { ...DEFAULT_ORCHESTRATION_CONFIG, ...config }
    
    // Initialize services
    this.services = ServiceFactory.createAnalysisServices(this.config.services)
    
    // Initialize scoring calculator
    this.scoringCalculator = new ScoringCalculator(this.config.scoring)

    logger.info('AnalysisOrchestrator initialized', {
      config: this.config,
      parallelExecution: this.config.parallelExecution.enabled,
      maxConcurrency: this.config.parallelExecution.maxConcurrency
    })
  }

  /**
   * Orchestrate complete URL analysis with all services
   */
  async analyzeURL(
    url: string,
    options?: {
      experimentId?: string
      userId?: string
      forceRefresh?: boolean
    }
  ): Promise<OrchestrationResult> {
    const startTime = Date.now()
    
    try {
      logger.info('Starting orchestrated analysis', { url, options })

      // Validate and parse URL
      const parsedUrl = this.parseAndValidateURL(url)
      
      // Execute analysis services
      const serviceResults = await this.executeAnalysisServices(
        url, 
        parsedUrl, 
        options?.forceRefresh
      )

      // Check if we have minimum required services
      const succeededCount = this.countSuccessfulServices(serviceResults)
      if (succeededCount < this.config.errorHandling.minimumRequiredServices) {
        throw new Error(
          `Insufficient successful services: ${succeededCount}/${this.config.errorHandling.minimumRequiredServices} required`
        )
      }

      // Build scoring input from service results
      const scoringInput = this.buildScoringInput(url, serviceResults)

      // Calculate final score
      const scoringResult = await this.executeScoring(
        scoringInput,
        options?.experimentId,
        options?.userId
      )

      // Build orchestration result
      const orchestrationResult: OrchestrationResult = {
        scoringResult,
        serviceResults: this.buildServiceResultsSummary(serviceResults),
        orchestrationMetrics: {
          totalProcessingTime: Date.now() - startTime,
          servicesExecuted: Object.keys(serviceResults).length,
          servicesSucceeded: succeededCount,
          servicesFailed: Object.keys(serviceResults).length - succeededCount,
          cachingEnabled: this.config.caching.respectServiceCaching,
          parallelExecution: this.config.parallelExecution.enabled
        }
      }

      // Record result for history
      this.recordAnalysisResult(url, orchestrationResult)

      logger.info('Orchestrated analysis completed', {
        url,
        finalScore: scoringResult.finalScore,
        riskLevel: scoringResult.riskLevel,
        totalProcessingTime: orchestrationResult.orchestrationMetrics.totalProcessingTime,
        servicesSucceeded: succeededCount
      })

      return orchestrationResult

    } catch (error) {
      logger.error('Orchestrated analysis failed', {
        url,
        error: error instanceof Error ? error : new Error(String(error)),
        processingTime: Date.now() - startTime
      })

      // Return fallback result
      return this.createFallbackResult(url, Date.now() - startTime, error)
    }
  }

  /**
   * Get orchestrator performance statistics
   */
  getStatistics(): {
    totalAnalyses: number
    averageProcessingTime: number
    averageSuccessRate: number
    serviceAvailability: Record<RiskFactorType, number>
    recentAnalyses: Array<{ url: string; score: number; timestamp: Date }>
  } {
    const totalAnalyses = this.analysisHistory.length
    
    if (totalAnalyses === 0) {
      return {
        totalAnalyses: 0,
        averageProcessingTime: 0,
        averageSuccessRate: 0,
        serviceAvailability: {
          reputation: 0,
          domain_age: 0,
          ssl_certificate: 0,
          ai_analysis: 0,
          technical_indicators: 0
        },
        recentAnalyses: []
      }
    }

    // Calculate average processing time
    const averageProcessingTime = this.analysisHistory.reduce(
      (sum, entry) => sum + entry.result.orchestrationMetrics.totalProcessingTime, 0
    ) / totalAnalyses

    // Calculate average success rate
    const averageSuccessRate = this.analysisHistory.reduce(
      (sum, entry) => sum + (entry.result.orchestrationMetrics.servicesSucceeded / entry.result.orchestrationMetrics.servicesExecuted), 0
    ) / totalAnalyses

    // Calculate service availability
    const serviceAvailability = this.calculateServiceAvailability()

    // Get recent analyses (last 10)
    const recentAnalyses = this.analysisHistory
      .slice(-10)
      .map(entry => ({
        url: entry.url,
        score: entry.result.scoringResult.finalScore,
        timestamp: entry.timestamp
      }))

    return {
      totalAnalyses,
      averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
      averageSuccessRate: Math.round(averageSuccessRate * 100) / 100,
      serviceAvailability,
      recentAnalyses
    }
  }

  /**
   * Update orchestrator configuration
   */
  updateConfiguration(newConfig: Partial<OrchestrationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Update scoring calculator if scoring config changed
    if (newConfig.scoring) {
      this.scoringCalculator.updateConfiguration(newConfig.scoring)
    }

    logger.info('Orchestrator configuration updated', { config: this.config })
  }

  /**
   * Clear analysis history (for memory management)
   */
  clearHistory(): void {
    this.analysisHistory = []
    this.scoringCalculator.clearHistory()
    logger.info('Orchestrator history cleared')
  }

  /**
   * Parse and validate URL
   */
  private parseAndValidateURL(url: string): ParsedURL {
    try {
      // First validate the URL
      const validation = validateURL(url)
      if (!validation.isValid) {
        throw new Error(`Invalid URL: ${validation.error}`)
      }
      
      // Then parse it
      const parsed = parseURL(url)
      return parsed
    } catch (error) {
      throw new Error(`URL parsing failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Execute all analysis services with orchestration
   */
  private async executeAnalysisServices(
    url: string,
    parsedUrl: ParsedURL,
    forceRefresh = false
  ): Promise<ServiceResults> {
    const servicePromises: Promise<unknown>[] = []
    const serviceNames: string[] = []

    // Prepare service execution promises
    if (this.config.parallelExecution.enabled) {
      // Parallel execution
      servicePromises.push(
        this.executeReputationService(url, forceRefresh),
        this.executeWhoisService(parsedUrl, forceRefresh),
        this.executeSSLService(parsedUrl, forceRefresh),
        this.executeAIService(url, parsedUrl, forceRefresh)
      )
      serviceNames.push('reputation', 'whois', 'ssl', 'ai')
    } else {
      // Sequential execution (fallback)
      const results = await this.executeServicesSequentially(url, parsedUrl, forceRefresh)
      return results
    }

    // Execute services with timeout
    const results = await Promise.allSettled(
      servicePromises.map(promise => 
        this.withTimeout(promise, this.config.timeouts.serviceTimeout, 'Service timeout')
      )
    )

    // Process results
    const processedResults: Record<string, unknown> = {}
    results.forEach((result, index) => {
      const serviceName = serviceNames[index]
      if (result.status === 'fulfilled') {
        processedResults[serviceName] = result.value
      } else {
        processedResults[serviceName] = {
          data: null,
          processingTime: this.config.timeouts.serviceTimeout,
          fromCache: false,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason)
        }
      }
    })

    return processedResults
  }

  /**
   * Execute services sequentially (fallback for parallel execution issues)
   */
  private async executeServicesSequentially(
    url: string,
    parsedUrl: ParsedURL,
    forceRefresh: boolean
  ): Promise<ServiceResults> {
    const results: ServiceResults = {}

    try {
      results.reputation = await this.executeReputationService(url, forceRefresh)
    } catch (error) {
      results.reputation = { data: null, processingTime: 0, fromCache: false, error: String(error) }
    }

    try {
      results.whois = await this.executeWhoisService(parsedUrl, forceRefresh)
    } catch (error) {
      results.whois = { data: null, processingTime: 0, fromCache: false, error: String(error) }
    }

    try {
      results.ssl = await this.executeSSLService(parsedUrl, forceRefresh)
    } catch (error) {
      results.ssl = { data: null, processingTime: 0, fromCache: false, error: String(error) }
    }

    try {
      results.ai = await this.executeAIService(url, parsedUrl, forceRefresh)
    } catch (error) {
      results.ai = { data: null, processingTime: 0, fromCache: false, error: String(error) }
    }

    return results
  }

  /**
   * Execute reputation service
   */
  private async executeReputationService(url: string, forceRefresh: boolean): Promise<ServiceResult> {
    const startTime = Date.now()
    
    if (forceRefresh) {
      await this.services.reputation.clearCache()
    }

    const result = await this.services.reputation.analyzeURL(url)
    
    return {
      data: result.success ? result.data : null,
      processingTime: Date.now() - startTime,
      fromCache: result.fromCache || false,
      error: result.success ? undefined : result.error?.message
    }
  }

  /**
   * Execute WHOIS service
   */
  private async executeWhoisService(parsedUrl: ParsedURL, forceRefresh: boolean): Promise<ServiceResult> {
    const startTime = Date.now()
    
    if (forceRefresh) {
      await this.services.whois.clearCache()
    }

    const result = await this.services.whois.analyzeDomain(parsedUrl)
    
    return {
      data: result.success ? result.data : null,
      processingTime: Date.now() - startTime,
      fromCache: result.fromCache || false,
      error: result.success ? undefined : result.error?.message
    }
  }

  /**
   * Execute SSL service
   */
  private async executeSSLService(parsedUrl: ParsedURL, forceRefresh: boolean): Promise<ServiceResult> {
    const startTime = Date.now()
    
    if (forceRefresh) {
      await this.services.ssl.clearCache()
    }

    const result = await this.services.ssl.analyzeCertificate(parsedUrl.hostname)
    
    return {
      data: result.success ? result.data : null,
      processingTime: Date.now() - startTime,
      fromCache: result.fromCache || false,
      error: result.success ? undefined : result.error?.message
    }
  }

  /**
   * Execute AI service
   */
  private async executeAIService(url: string, parsedUrl: ParsedURL, _forceRefresh: boolean): Promise<ServiceResult> {
    const startTime = Date.now()
    
    // Build technical analysis context for AI service
    const context: TechnicalAnalysisContext = {
      urlStructure: {
        isIP: parsedUrl.isIP,
        subdomain: parsedUrl.subdomain || undefined,
        pathDepth: parsedUrl.components.pathParts.length,
        queryParamCount: parsedUrl.components.queryParams.length,
        hasHttps: parsedUrl.protocol === 'https:'
      }
    }
    
    const result = await this.services.aiAnalyzer.analyzeURL(url, parsedUrl, context)
    
    return {
      data: result.success ? result.data : null,
      processingTime: Date.now() - startTime,
      fromCache: result.fromCache || false,
      error: result.success ? undefined : result.error?.message
    }
  }

  /**
   * Build scoring input from service results
   */
  private buildScoringInput(url: string, serviceResults: ServiceResults): ScoringInput {
    const input: ScoringInput = { url }

    if (serviceResults.reputation?.data) {
      input.reputation = {
        analysis: serviceResults.reputation.data as ReputationAnalysis,
        processingTimeMs: serviceResults.reputation.processingTime,
        fromCache: serviceResults.reputation.fromCache
      }
    }

    if (serviceResults.whois?.data) {
      input.whois = {
        analysis: serviceResults.whois.data as DomainAgeAnalysis,
        processingTimeMs: serviceResults.whois.processingTime,
        fromCache: serviceResults.whois.fromCache
      }
    }

    if (serviceResults.ssl?.data) {
      input.ssl = {
        analysis: serviceResults.ssl.data as SSLCertificateAnalysis,
        processingTimeMs: serviceResults.ssl.processingTime,
        fromCache: serviceResults.ssl.fromCache
      }
    }

    if (serviceResults.ai?.data) {
      input.ai = {
        analysis: serviceResults.ai.data as AIAnalysisResult,
        processingTimeMs: serviceResults.ai.processingTime,
        fromCache: serviceResults.ai.fromCache
      }
    }

    return input
  }

  /**
   * Execute scoring calculation with timeout
   */
  private async executeScoring(
    input: ScoringInput,
    experimentId?: string,
    userId?: string
  ): Promise<ScoringResult> {
    return this.withTimeout(
      this.scoringCalculator.calculateScore(input, experimentId, userId),
      this.config.timeouts.scoringTimeout,
      'Scoring calculation timeout'
    )
  }

  /**
   * Count successful service executions
   */
  private countSuccessfulServices(serviceResults: ServiceResults): number {
    return Object.values(serviceResults).filter((result: unknown) => 
      typeof result === 'object' && result && 'data' in result && 'error' in result &&
      (result as Record<string, unknown>).data && !(result as Record<string, unknown>).error
    ).length
  }

  /**
   * Build service results summary
   */
  private buildServiceResultsSummary(serviceResults: ServiceResults): OrchestrationResult['serviceResults'] {
    const summary: OrchestrationResult['serviceResults'] = {}

    Object.entries(serviceResults).forEach(([serviceName, result]) => {
      if (result) {
        summary[serviceName as keyof OrchestrationResult['serviceResults']] = {
          success: !!result.data && !result.error,
          processingTime: result.processingTime,
          fromCache: result.fromCache,
          error: result.error
        }
      }
    })

    return summary
  }

  /**
   * Calculate service availability percentages
   */
  private calculateServiceAvailability(): Record<RiskFactorType, number> {
    const availability = {
      reputation: 0,
      domain_age: 0,
      ssl_certificate: 0,
      ai_analysis: 0,
      technical_indicators: 0
    }

    if (this.analysisHistory.length === 0) return availability

    this.analysisHistory.forEach(entry => {
      const services = entry.result.serviceResults
      if (services.reputation?.success) availability.reputation++
      if (services.whois?.success) availability.domain_age++
      if (services.ssl?.success) availability.ssl_certificate++
      if (services.ai?.success) availability.ai_analysis++
    })

    const total = this.analysisHistory.length
    Object.keys(availability).forEach(key => {
      availability[key as RiskFactorType] = (availability[key as RiskFactorType] / total) * 100
    })

    return availability
  }

  /**
   * Record analysis result for history
   */
  private recordAnalysisResult(url: string, result: OrchestrationResult): void {
    this.analysisHistory.push({
      url,
      result,
      timestamp: new Date()
    })

    // Keep only last 100 analyses
    if (this.analysisHistory.length > 100) {
      this.analysisHistory.shift()
    }
  }

  /**
   * Create fallback result for errors
   */
  private createFallbackResult(url: string, processingTime: number, error: unknown): OrchestrationResult {
    const fallbackScoringResult = {
      url,
      finalScore: 50,
      riskLevel: 'medium' as const,
      confidence: 0.3,
      riskFactors: [],
      metadata: {
        totalProcessingTimeMs: processingTime,
        configUsed: 'fallback',
        missingFactors: ['reputation', 'domain_age', 'ssl_certificate', 'ai_analysis'] as RiskFactorType[],
        redistributedWeights: {
          reputation: 0.4,
          domain_age: 0.25,
          ssl_certificate: 0.2,
          ai_analysis: 0.15
        },
        normalizationMethod: 'linear',
        timestamp: new Date()
      },
      breakdown: {
        weightedScores: {} as Record<RiskFactorType, number>,
        normalizedScores: {} as Record<RiskFactorType, number>,
        rawScores: {} as Record<RiskFactorType, number>,
        totalWeight: 0
      }
    }

    return {
      scoringResult: fallbackScoringResult,
      serviceResults: {
        reputation: { success: false, processingTime: 0, fromCache: false, error: String(error) },
        whois: { success: false, processingTime: 0, fromCache: false, error: String(error) },
        ssl: { success: false, processingTime: 0, fromCache: false, error: String(error) },
        ai: { success: false, processingTime: 0, fromCache: false, error: String(error) }
      },
      orchestrationMetrics: {
        totalProcessingTime: processingTime,
        servicesExecuted: 4,
        servicesSucceeded: 0,
        servicesFailed: 4,
        cachingEnabled: this.config.caching.respectServiceCaching,
        parallelExecution: this.config.parallelExecution.enabled
      }
    }
  }

  /**
   * Add timeout wrapper to promises
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      )
    ])
  }
}