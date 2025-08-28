/**
 * Multi-Factor Scoring Calculator
 * Main scoring engine that combines weighted risk factors into final risk scores
 */

import type {
  ScoringInput,
  ScoringResult,
  RiskFactor,
  RiskLevel,
  RiskFactorType,
  ScoringConfig,
  ConfidenceInput
} from '../../types/scoring'
import { DEFAULT_SCORING_CONFIG } from '../../types/scoring'
import { ScoreNormalizer } from './score-normalizer'
import { ConfidenceCalculator } from './confidence-calculator'
import { ScoringConfigManager } from './scoring-config'
import { Logger } from '../logger'

const logger = new Logger()

/**
 * Main scoring calculator that implements the multi-factor weighted algorithm
 * Processes analysis results from all services and produces final risk scores
 */
export class ScoringCalculator {
  private configManager: ScoringConfigManager
  private scoreNormalizer: ScoreNormalizer
  private confidenceCalculator: ConfidenceCalculator
  private scoringHistory: ScoringResult[] = []

  constructor(config?: Partial<ScoringConfig>) {
    this.configManager = new ScoringConfigManager(config)
    const currentConfig = this.configManager.getCurrentConfig()
    
    this.scoreNormalizer = new ScoreNormalizer(currentConfig.normalization)
    this.confidenceCalculator = new ConfidenceCalculator(currentConfig.confidenceAdjustment)

    logger.info('ScoringCalculator initialized', {
      config: currentConfig,
      configHash: this.configManager.getConfigHash()
    })
  }

  /**
   * Calculate final risk score from analysis inputs
   */
  async calculateScore(
    input: ScoringInput,
    experimentId?: string,
    userId?: string
  ): Promise<ScoringResult> {
    const startTime = Date.now()
    
    try {
      // Select configuration (supports A/B testing)
      const { config, experimentId: selectedExperiment, isExperiment } = 
        this.configManager.selectConfiguration(userId, experimentId)

      logger.debug('Starting score calculation', {
        url: input.url,
        availableFactors: this.getAvailableFactors(input),
        experimentId: selectedExperiment,
        isExperiment
      })

      // Extract and normalize risk factors
      const riskFactors = await this.extractRiskFactors(input, config)
      
      // Calculate weighted score
      const weightedScore = this.calculateWeightedScore(riskFactors, config)
      
      // Calculate confidence
      const confidence = this.calculateConfidence(riskFactors, config)
      
      // Apply confidence adjustment to final score
      const finalScore = this.applyConfidenceAdjustment(weightedScore, confidence, config)
      
      // Determine risk level
      const riskLevel = this.determineRiskLevel(finalScore, config)
      
      // Build result metadata
      const metadata = this.buildMetadata(input, config, riskFactors, startTime, selectedExperiment)
      
      // Build score breakdown for transparency
      const breakdown = this.buildScoreBreakdown(riskFactors, config)

      const result: ScoringResult = {
        url: input.url,
        finalScore: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
        riskLevel,
        confidence: Math.round(confidence * 1000) / 1000, // Round to 3 decimal places
        riskFactors,
        metadata,
        breakdown
      }

      // Record result for history/analysis
      this.recordScoringResult(result)

      logger.info('Score calculation completed', {
        url: input.url,
        finalScore: result.finalScore,
        riskLevel: result.riskLevel,
        confidence: result.confidence,
        processingTime: metadata.totalProcessingTimeMs,
        experimentId: selectedExperiment
      })

      return result

    } catch (error) {
      logger.error('Score calculation failed', {
        url: input.url,
        error: error instanceof Error ? error : new Error(String(error)),
        processingTime: Date.now() - startTime
      })

      // Return fallback result
      return this.createFallbackResult(input, Date.now() - startTime)
    }
  }

  /**
   * Get scoring statistics and performance metrics
   */
  getStatistics(): {
    totalScores: number
    averageProcessingTime: number
    scoreDistribution: Record<RiskLevel, number>
    factorAvailability: Record<RiskFactorType, number>
    confidenceDistribution: { high: number; medium: number; low: number }
  } {
    const totalScores = this.scoringHistory.length
    
    if (totalScores === 0) {
      return {
        totalScores: 0,
        averageProcessingTime: 0,
        scoreDistribution: { low: 0, medium: 0, high: 0 },
        factorAvailability: {
          reputation: 0,
          domain_age: 0,
          ssl_certificate: 0,
          ai_analysis: 0,
          technical_indicators: 0
        },
        confidenceDistribution: { high: 0, medium: 0, low: 0 }
      }
    }

    // Calculate average processing time
    const averageProcessingTime = this.scoringHistory.reduce(
      (sum, result) => sum + result.metadata.totalProcessingTimeMs, 0
    ) / totalScores

    // Calculate score distribution
    const scoreDistribution = this.scoringHistory.reduce(
      (dist, result) => {
        dist[result.riskLevel]++
        return dist
      },
      { low: 0, medium: 0, high: 0 } as Record<RiskLevel, number>
    )

    // Calculate factor availability
    const factorAvailability = this.scoringHistory.reduce(
      (availability, result) => {
        result.riskFactors.forEach(factor => {
          if (factor.available) {
            availability[factor.type]++
          }
        })
        return availability
      },
      {
        reputation: 0,
        domain_age: 0,
        ssl_certificate: 0,
        ai_analysis: 0,
        technical_indicators: 0
      } as Record<RiskFactorType, number>
    )

    // Convert to percentages
    Object.keys(factorAvailability).forEach(key => {
      factorAvailability[key as RiskFactorType] = 
        (factorAvailability[key as RiskFactorType] / totalScores) * 100
    })

    // Calculate confidence distribution
    const confidenceDistribution = this.scoringHistory.reduce(
      (dist, result) => {
        if (result.confidence >= 0.8) dist.high++
        else if (result.confidence >= 0.6) dist.medium++
        else dist.low++
        return dist
      },
      { high: 0, medium: 0, low: 0 }
    )

    return {
      totalScores,
      averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
      scoreDistribution,
      factorAvailability,
      confidenceDistribution
    }
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<ScoringConfig>): boolean {
    const validation = this.configManager.updateConfig(newConfig)
    
    if (validation.isValid && validation.normalizedConfig) {
      // Update dependent components
      this.scoreNormalizer = new ScoreNormalizer(validation.normalizedConfig.normalization)
      this.confidenceCalculator = new ConfidenceCalculator(validation.normalizedConfig.confidenceAdjustment)
      
      logger.info('Scoring configuration updated successfully')
      return true
    }
    
    return false
  }

  /**
   * Clear scoring history (for memory management)
   */
  clearHistory(): void {
    this.scoringHistory = []
    logger.info('Scoring history cleared')
  }

  /**
   * Extract risk factors from analysis input
   */
  private async extractRiskFactors(input: ScoringInput, config: ScoringConfig): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = []

    // Process reputation analysis
    if (input.reputation?.analysis) {
      const factor = await this.processReputationFactor(input.reputation, config)
      factors.push(factor)
    } else {
      factors.push(this.createMissingFactor('reputation', config.weights.reputation))
    }

    // Process WHOIS/domain age analysis
    if (input.whois?.analysis) {
      const factor = await this.processDomainAgeFactor(input.whois, config)
      factors.push(factor)
    } else {
      factors.push(this.createMissingFactor('domain_age', config.weights.domain_age))
    }

    // Process SSL analysis
    if (input.ssl?.analysis) {
      const factor = await this.processSSLFactor(input.ssl, config)
      factors.push(factor)
    } else {
      factors.push(this.createMissingFactor('ssl_certificate', config.weights.ssl_certificate))
    }

    // Process AI analysis
    if (input.ai?.analysis) {
      const factor = await this.processAIFactor(input.ai, config)
      factors.push(factor)
    } else {
      factors.push(this.createMissingFactor('ai_analysis', config.weights.ai_analysis))
    }

    return factors
  }

  /**
   * Process reputation analysis into risk factor
   */
  private async processReputationFactor(
    reputation: NonNullable<ScoringInput['reputation']>,
    config: ScoringConfig
  ): Promise<RiskFactor> {
    const analysis = reputation.analysis
    
    // Use existing score from reputation service (already 0-100)
    const normalizedResult = this.scoreNormalizer.normalize(
      analysis.score,
      'reputation',
      analysis.confidence
    )

    // Apply confidence adjustments based on data quality
    const factorConfidence = this.confidenceCalculator.calculateFactorConfidence(
      'reputation',
      analysis.confidence,
      {
        processingTime: reputation.processingTimeMs,
        fromCache: reputation.fromCache
      }
    )

    return {
      type: 'reputation',
      score: normalizedResult.normalizedScore,
      confidence: factorConfidence,
      weight: config.weights.reputation,
      description: this.generateReputationDescription(analysis),
      available: true,
      processingTimeMs: reputation.processingTimeMs
    }
  }

  /**
   * Process domain age analysis into risk factor
   */
  private async processDomainAgeFactor(
    whois: NonNullable<ScoringInput['whois']>,
    config: ScoringConfig
  ): Promise<RiskFactor> {
    const analysis = whois.analysis
    
    // Use domain age to calculate risk (younger = riskier)
    const normalizedResult = this.scoreNormalizer.normalize(
      analysis.ageInDays || 0,
      'domain_age',
      analysis.confidence,
      { min: 0, max: 365 * 5 } // 0 to 5 years
    )

    const factorConfidence = this.confidenceCalculator.calculateFactorConfidence(
      'domain_age',
      analysis.confidence,
      {
        processingTime: whois.processingTimeMs,
        fromCache: whois.fromCache
      }
    )

    return {
      type: 'domain_age',
      score: normalizedResult.normalizedScore,
      confidence: factorConfidence,
      weight: config.weights.domain_age,
      description: this.generateDomainAgeDescription(analysis),
      available: true,
      processingTimeMs: whois.processingTimeMs
    }
  }

  /**
   * Process SSL analysis into risk factor
   */
  private async processSSLFactor(
    ssl: NonNullable<ScoringInput['ssl']>,
    config: ScoringConfig
  ): Promise<RiskFactor> {
    const analysis = ssl.analysis
    
    // Use existing SSL risk score
    const normalizedResult = this.scoreNormalizer.normalize(
      analysis.score,
      'ssl_certificate',
      analysis.confidence
    )

    const factorConfidence = this.confidenceCalculator.calculateFactorConfidence(
      'ssl_certificate',
      analysis.confidence,
      {
        processingTime: ssl.processingTimeMs,
        fromCache: ssl.fromCache
      }
    )

    return {
      type: 'ssl_certificate',
      score: normalizedResult.normalizedScore,
      confidence: factorConfidence,
      weight: config.weights.ssl_certificate,
      description: this.generateSSLDescription(analysis),
      available: true,
      processingTimeMs: ssl.processingTimeMs
    }
  }

  /**
   * Process AI analysis into risk factor
   */
  private async processAIFactor(
    ai: NonNullable<ScoringInput['ai']>,
    config: ScoringConfig
  ): Promise<RiskFactor> {
    const analysis = ai.analysis
    
    // Convert AI risk score (already 0-100) or derive from category
    const aiScore = analysis.riskScore || this.convertScamCategoryToScore(analysis.scamCategory)
    
    const normalizedResult = this.scoreNormalizer.normalize(
      aiScore,
      'ai_analysis',
      analysis.confidence || 0.8
    )

    const factorConfidence = this.confidenceCalculator.calculateFactorConfidence(
      'ai_analysis',
      analysis.confidence || 0.8,
      {
        processingTime: ai.processingTimeMs,
        fromCache: ai.fromCache
      }
    )

    return {
      type: 'ai_analysis',
      score: normalizedResult.normalizedScore,
      confidence: factorConfidence,
      weight: config.weights.ai_analysis,
      description: this.generateAIDescription(analysis),
      available: true,
      processingTimeMs: ai.processingTimeMs
    }
  }

  /**
   * Create missing factor placeholder
   */
  private createMissingFactor(type: RiskFactorType, weight: number): RiskFactor {
    return {
      type,
      score: 50, // Default medium risk for missing data
      confidence: 0.3, // Low confidence for missing data
      weight,
      description: `${type.replace('_', ' ')} analysis not available`,
      available: false,
      processingTimeMs: 0
    }
  }

  /**
   * Calculate weighted score from risk factors
   */
  private calculateWeightedScore(factors: RiskFactor[], config: ScoringConfig): number {
    let weightedSum = 0
    let totalWeight = 0

    const availableFactors = factors.filter(f => f.available)
    
    if (availableFactors.length === 0) {
      logger.warn('No available factors for scoring, using default medium risk')
      return 50
    }

    // Handle missing data strategy
    const adjustedWeights = this.handleMissingDataStrategy(factors, config)

    // Calculate weighted sum
    factors.forEach((factor) => {
      if (factor.available) {
        const adjustedWeight = adjustedWeights[factor.type]
        weightedSum += factor.score * adjustedWeight
        totalWeight += adjustedWeight
        
        logger.debug('Factor contribution', {
          type: factor.type,
          score: factor.score,
          weight: adjustedWeight,
          contribution: factor.score * adjustedWeight
        })
      }
    })

    const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 50
    
    logger.debug('Weighted score calculation', {
      weightedSum,
      totalWeight,
      finalScore,
      availableFactors: availableFactors.length,
      totalFactors: factors.length
    })

    return finalScore
  }

  /**
   * Handle missing data according to configured strategy
   */
  private handleMissingDataStrategy(
    factors: RiskFactor[],
    config: ScoringConfig
  ): Record<RiskFactorType, number> {
    const availableFactors = factors.filter(f => f.available)
    const missingFactors = factors.filter(f => !f.available)
    
    if (config.missingDataStrategy === 'redistribute' && availableFactors.length > 0) {
      // Redistribute missing weights proportionally to available factors
      const totalMissingWeight = missingFactors.reduce((sum, f) => sum + f.weight, 0)
      const totalAvailableWeight = availableFactors.reduce((sum, f) => sum + f.weight, 0)
      
      const adjustedWeights = {} as Record<RiskFactorType, number>
      
      factors.forEach(factor => {
        if (factor.available && totalAvailableWeight > 0) {
          const redistributionBonus = (factor.weight / totalAvailableWeight) * totalMissingWeight
          adjustedWeights[factor.type] = factor.weight + redistributionBonus
        } else {
          adjustedWeights[factor.type] = factor.weight
        }
      })
      
      return adjustedWeights
    }

    // Default: use original weights
    const weights = {} as Record<RiskFactorType, number>
    factors.forEach(factor => {
      weights[factor.type] = factor.weight
    })
    
    return weights
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(factors: RiskFactor[], _config: ScoringConfig): number {
    const availableFactors = factors.filter(f => f.available).map(f => f.type)
    const missingFactors = factors.filter(f => !f.available).map(f => f.type)
    const factorConfidences = factors.filter(f => f.available).map(f => f.confidence)

    const confidenceInput: ConfidenceInput = {
      factorConfidences,
      availableFactors,
      missingFactors,
      totalFactors: factors.length
    }

    return this.confidenceCalculator.calculateOverallConfidence(confidenceInput)
  }

  /**
   * Apply confidence adjustment to final score
   */
  private applyConfidenceAdjustment(
    score: number,
    confidence: number,
    _config: ScoringConfig
  ): number {
    // For low confidence, move score towards medium risk (50)
    if (confidence < 0.7) {
      const adjustmentFactor = 1 - confidence
      const adjustment = (50 - score) * adjustmentFactor * 0.3 // Max 30% adjustment
      return score + adjustment
    }
    
    return score
  }

  /**
   * Determine risk level from final score
   */
  private determineRiskLevel(score: number, config: ScoringConfig): RiskLevel {
    if (score <= config.thresholds.lowRiskMax) {
      return 'low'
    } else if (score <= config.thresholds.mediumRiskMax) {
      return 'medium'
    } else {
      return 'high'
    }
  }

  /**
   * Build result metadata
   */
  private buildMetadata(
    input: ScoringInput,
    config: ScoringConfig,
    factors: RiskFactor[],
    startTime: number,
    experimentId?: string
  ): ScoringResult['metadata'] {
    const totalProcessingTime = factors.reduce(
      (sum, factor) => sum + (factor.processingTimeMs || 0), 0
    ) + (Date.now() - startTime)

    const missingFactors = factors.filter(f => !f.available).map(f => f.type)
    
    // Calculate redistributed weights
    const redistributedWeights = this.handleMissingDataStrategy(factors, config)

    return {
      totalProcessingTimeMs: totalProcessingTime,
      configUsed: this.configManager.getConfigHash(config) + (experimentId ? `-${experimentId}` : ''),
      missingFactors,
      redistributedWeights: {
        reputation: redistributedWeights.reputation,
        domain_age: redistributedWeights.domain_age,
        ssl_certificate: redistributedWeights.ssl_certificate,
        ai_analysis: redistributedWeights.ai_analysis
      },
      normalizationMethod: config.normalization.method,
      timestamp: new Date()
    }
  }

  /**
   * Build score breakdown for transparency
   */
  private buildScoreBreakdown(
    factors: RiskFactor[],
    config: ScoringConfig
  ): ScoringResult['breakdown'] {
    const breakdown: ScoringResult['breakdown'] = {
      weightedScores: {} as Record<RiskFactorType, number>,
      normalizedScores: {} as Record<RiskFactorType, number>,
      rawScores: {} as Record<RiskFactorType, number>,
      totalWeight: 0
    }

    const adjustedWeights = this.handleMissingDataStrategy(factors, config)

    factors.forEach(factor => {
      if (factor.available) {
        breakdown.rawScores[factor.type] = factor.score
        breakdown.normalizedScores[factor.type] = factor.score
        breakdown.weightedScores[factor.type] = factor.score * adjustedWeights[factor.type]
        breakdown.totalWeight += adjustedWeights[factor.type]
      }
    })

    return breakdown
  }

  /**
   * Get available factors from input
   */
  private getAvailableFactors(input: ScoringInput): RiskFactorType[] {
    const available: RiskFactorType[] = []
    
    if (input.reputation?.analysis) available.push('reputation')
    if (input.whois?.analysis) available.push('domain_age')
    if (input.ssl?.analysis) available.push('ssl_certificate')
    if (input.ai?.analysis) available.push('ai_analysis')
    
    return available
  }

  /**
   * Convert AI scam category to numeric score
   */
  private convertScamCategoryToScore(category: string): number {
    switch (category.toLowerCase()) {
      case 'legitimate': return 10
      case 'financial': return 80
      case 'phishing': return 90
      case 'ecommerce': return 70
      case 'social_engineering': return 85
      default: return 50
    }
  }

  /**
   * Generate description for reputation factor
   */
  private generateReputationDescription(analysis: { isClean: boolean; threatMatches?: unknown[] }): string {
    if (analysis.isClean) {
      return 'Clean reputation according to Google Safe Browsing'
    }
    
    const threatCount = analysis.threatMatches?.length || 0
    return `${threatCount} threat(s) detected in reputation databases`
  }

  /**
   * Generate description for domain age factor
   */
  private generateDomainAgeDescription(analysis: { ageInDays?: number | null }): string {
    const ageInDays = analysis.ageInDays ?? 0
    if (ageInDays === 0) {
      return 'Domain age information unavailable'
    } else if (ageInDays < 30) {
      return `Very new domain (${ageInDays} days old)`
    } else if (ageInDays < 90) {
      return `Recent domain (${ageInDays} days old)`
    } else {
      const years = Math.floor(ageInDays / 365)
      return `Established domain (${years > 0 ? years + ' years' : ageInDays + ' days'} old)`
    }
  }

  /**
   * Generate description for SSL factor
   */
  private generateSSLDescription(analysis: { 
    validation?: { isExpired?: boolean; isSelfSigned?: boolean }; 
    security?: { hasWeakCrypto?: boolean } 
  }): string {
    if (analysis.validation?.isExpired) {
      return 'Expired SSL certificate'
    } else if (analysis.validation?.isSelfSigned) {
      return 'Self-signed SSL certificate'
    } else if (analysis.security?.hasWeakCrypto) {
      return 'SSL certificate with weak cryptography'
    } else {
      return 'Valid SSL certificate'
    }
  }

  /**
   * Generate description for AI factor
   */
  private generateAIDescription(analysis: { scamCategory?: string; riskScore?: number }): string {
    const category = analysis.scamCategory || 'unknown'
    const score = analysis.riskScore || 50
    return `AI analysis: ${category} category (score: ${score})`
  }

  /**
   * Create fallback result for errors
   */
  private createFallbackResult(input: ScoringInput, processingTime: number): ScoringResult {
    return {
      url: input.url,
      finalScore: 50,
      riskLevel: 'medium',
      confidence: 0.3,
      riskFactors: [
        this.createMissingFactor('reputation', DEFAULT_SCORING_CONFIG.weights.reputation),
        this.createMissingFactor('domain_age', DEFAULT_SCORING_CONFIG.weights.domain_age),
        this.createMissingFactor('ssl_certificate', DEFAULT_SCORING_CONFIG.weights.ssl_certificate),
        this.createMissingFactor('ai_analysis', DEFAULT_SCORING_CONFIG.weights.ai_analysis)
      ],
      metadata: {
        totalProcessingTimeMs: processingTime,
        configUsed: 'fallback',
        missingFactors: ['reputation', 'domain_age', 'ssl_certificate', 'ai_analysis'],
        redistributedWeights: DEFAULT_SCORING_CONFIG.weights,
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
  }

  /**
   * Record scoring result for history and analysis
   */
  private recordScoringResult(result: ScoringResult): void {
    this.scoringHistory.push(result)
    
    // Keep only last 1000 results for memory management
    if (this.scoringHistory.length > 1000) {
      this.scoringHistory.shift()
    }
  }
}