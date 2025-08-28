/**
 * Confidence Calculation Utilities
 * Handles confidence scoring based on data availability and quality
 */

import type {
  ConfidenceInput,
  ScoringConfig,
  RiskFactorType,
  ScoringContext
} from '../../types/scoring'
import { Logger } from '../logger'

const logger = new Logger()

/**
 * Calculator for overall confidence in scoring results
 * Considers factor availability, individual confidences, and data quality
 */
export class ConfidenceCalculator {
  private config: ScoringConfig['confidenceAdjustment']

  constructor(config: ScoringConfig['confidenceAdjustment']) {
    this.config = config
  }

  /**
   * Calculate overall confidence based on individual factor confidences
   */
  calculateOverallConfidence(input: ConfidenceInput): number {
    const {
      factorConfidences,
      availableFactors,
      missingFactors,
      totalFactors
    } = input

    // Base confidence from available factors
    const baseConfidence = this.calculateBaseConfidence(factorConfidences)

    // Apply penalty for missing factors
    const missingPenalty = this.calculateMissingFactorPenalty(missingFactors.length, totalFactors)

    // Apply data quality adjustments
    const qualityAdjustment = this.calculateQualityAdjustment(availableFactors, factorConfidences)

    // Calculate final confidence
    const finalConfidence = Math.max(
      this.config.minimumConfidence,
      baseConfidence - missingPenalty + qualityAdjustment
    )

    logger.debug('Confidence calculation completed', {
      baseConfidence,
      missingPenalty,
      qualityAdjustment,
      finalConfidence,
      availableFactors: availableFactors.length,
      missingFactors: missingFactors.length
    })

    return Math.max(0, Math.min(1, finalConfidence))
  }

  /**
   * Calculate confidence for individual risk factor
   */
  calculateFactorConfidence(
    factorType: RiskFactorType,
    baseConfidence: number,
    dataQuality: {
      processingTime?: number
      fromCache?: boolean
      errorCount?: number
      dataAge?: number // in milliseconds
    }
  ): number {
    let adjustedConfidence = baseConfidence

    // Processing time adjustment (faster = more confident, up to a point)
    if (dataQuality.processingTime !== undefined) {
      adjustedConfidence = this.applyProcessingTimeAdjustment(
        adjustedConfidence,
        dataQuality.processingTime,
        factorType
      )
    }

    // Cache age adjustment (fresher = more confident)
    if (dataQuality.fromCache && dataQuality.dataAge !== undefined) {
      adjustedConfidence = this.applyCacheAgeAdjustment(
        adjustedConfidence,
        dataQuality.dataAge,
        factorType
      )
    }

    // Error count adjustment (fewer errors = more confident)
    if (dataQuality.errorCount !== undefined && dataQuality.errorCount > 0) {
      adjustedConfidence = this.applyErrorCountAdjustment(
        adjustedConfidence,
        dataQuality.errorCount
      )
    }

    return Math.max(0.1, Math.min(1, adjustedConfidence))
  }

  /**
   * Create confidence context for debugging
   */
  createConfidenceContext(
    input: ConfidenceInput,
    result: number
  ): ScoringContext {
    return {
      step: 'confidence_calculation',
      values: {
        base_confidence: this.calculateBaseConfidence(input.factorConfidences),
        missing_penalty: this.calculateMissingFactorPenalty(
          input.missingFactors.length,
          input.totalFactors
        ),
        final_confidence: result,
        available_factors: input.availableFactors.length,
        missing_factors: input.missingFactors.length
      },
      description: 'Calculated overall confidence score',
      timestamp: Date.now()
    }
  }

  /**
   * Get confidence thresholds for interpretation
   */
  getConfidenceThresholds(): {
    high: number
    medium: number
    low: number
    descriptions: Record<string, string>
  } {
    return {
      high: 0.8,
      medium: 0.6,
      low: 0.4,
      descriptions: {
        high: 'High confidence - all major factors available with good data quality',
        medium: 'Medium confidence - most factors available or some data quality issues',
        low: 'Low confidence - several missing factors or significant data quality issues',
        veryLow: 'Very low confidence - limited data availability or poor quality'
      }
    }
  }

  /**
   * Interpret confidence level
   */
  interpretConfidence(confidence: number): {
    level: 'very_low' | 'low' | 'medium' | 'high'
    description: string
    recommendations: string[]
  } {
    const thresholds = this.getConfidenceThresholds()
    
    if (confidence >= thresholds.high) {
      return {
        level: 'high',
        description: thresholds.descriptions.high,
        recommendations: [
          'Score can be used with high confidence',
          'Suitable for automated decision making'
        ]
      }
    } else if (confidence >= thresholds.medium) {
      return {
        level: 'medium',
        description: thresholds.descriptions.medium,
        recommendations: [
          'Score is generally reliable',
          'Consider manual review for edge cases',
          'Monitor for data quality improvements'
        ]
      }
    } else if (confidence >= thresholds.low) {
      return {
        level: 'low',
        description: thresholds.descriptions.low,
        recommendations: [
          'Score should be interpreted cautiously',
          'Manual review recommended',
          'Investigate missing data sources',
          'Consider fallback scoring methods'
        ]
      }
    } else {
      return {
        level: 'very_low',
        description: thresholds.descriptions.veryLow,
        recommendations: [
          'Score reliability is questionable',
          'Manual review required',
          'Investigate data availability issues',
          'Consider alternative analysis methods',
          'May need to defer decision'
        ]
      }
    }
  }

  /**
   * Calculate base confidence from individual factor confidences
   */
  private calculateBaseConfidence(factorConfidences: number[]): number {
    if (factorConfidences.length === 0) {
      return this.config.minimumConfidence
    }

    // Use weighted average, giving more weight to higher confidence factors
    const sortedConfidences = [...factorConfidences].sort((a, b) => b - a)
    
    let weightedSum = 0
    let totalWeight = 0
    
    for (let i = 0; i < sortedConfidences.length; i++) {
      // Higher confidence factors get exponentially more weight
      const weight = Math.pow(2, sortedConfidences.length - i)
      weightedSum += sortedConfidences[i] * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? weightedSum / totalWeight : this.config.minimumConfidence
  }

  /**
   * Calculate penalty for missing factors
   */
  private calculateMissingFactorPenalty(missingCount: number, totalFactors: number): number {
    if (missingCount === 0) return 0

    // Progressive penalty - each missing factor hurts more
    const basePenalty = this.config.missingFactorPenalty
    const missingRatio = missingCount / totalFactors
    
    // Apply exponential penalty for higher missing ratios
    return basePenalty * missingCount * (1 + missingRatio)
  }

  /**
   * Calculate data quality adjustment
   */
  private calculateQualityAdjustment(
    availableFactors: RiskFactorType[],
    factorConfidences: number[]
  ): number {
    if (availableFactors.length === 0) return 0

    // Bonus for having high-value factors available
    const highValueFactors: RiskFactorType[] = ['reputation', 'ai_analysis']
    const hasHighValueFactors = availableFactors.some(factor => 
      highValueFactors.includes(factor)
    )

    // Bonus for consistent high confidence across factors
    const avgConfidence = factorConfidences.reduce((sum, c) => sum + c, 0) / factorConfidences.length
    const confidenceVariance = this.calculateVariance(factorConfidences)

    let adjustment = 0

    // Bonus for high-value factors
    if (hasHighValueFactors) {
      adjustment += 0.05
    }

    // Bonus for high average confidence
    if (avgConfidence > 0.8) {
      adjustment += 0.03
    }

    // Penalty for high variance in confidence (inconsistent data quality)
    if (confidenceVariance > 0.1) {
      adjustment -= 0.02
    }

    return adjustment
  }

  /**
   * Apply processing time adjustment to confidence
   */
  private applyProcessingTimeAdjustment(
    baseConfidence: number,
    processingTime: number,
    factorType: RiskFactorType
  ): number {
    // Define expected processing times for each factor type
    const expectedTimes: Record<RiskFactorType, { optimal: number; max: number }> = {
      reputation: { optimal: 1000, max: 5000 }, // 1-5 seconds
      domain_age: { optimal: 2000, max: 10000 }, // 2-10 seconds
      ssl_certificate: { optimal: 3000, max: 15000 }, // 3-15 seconds
      ai_analysis: { optimal: 5000, max: 30000 }, // 5-30 seconds
      technical_indicators: { optimal: 500, max: 2000 } // 0.5-2 seconds
    }

    const expected = expectedTimes[factorType] || expectedTimes.technical_indicators

    if (processingTime <= expected.optimal) {
      // Fast processing = slight confidence boost
      return baseConfidence + 0.02
    } else if (processingTime <= expected.max) {
      // Normal processing = no adjustment
      return baseConfidence
    } else {
      // Slow processing = confidence reduction
      const slownessFactor = Math.min(processingTime / expected.max, 3)
      return baseConfidence - (0.05 * slownessFactor)
    }
  }

  /**
   * Apply cache age adjustment to confidence
   */
  private applyCacheAgeAdjustment(
    baseConfidence: number,
    cacheAge: number,
    factorType: RiskFactorType
  ): number {
    // Define cache freshness thresholds (in milliseconds)
    const freshnessThresholds: Record<RiskFactorType, { fresh: number; stale: number }> = {
      reputation: { fresh: 1 * 60 * 60 * 1000, stale: 24 * 60 * 60 * 1000 }, // 1 hour / 24 hours
      domain_age: { fresh: 24 * 60 * 60 * 1000, stale: 7 * 24 * 60 * 60 * 1000 }, // 1 day / 7 days
      ssl_certificate: { fresh: 6 * 60 * 60 * 1000, stale: 48 * 60 * 60 * 1000 }, // 6 hours / 48 hours
      ai_analysis: { fresh: 30 * 60 * 1000, stale: 6 * 60 * 60 * 1000 }, // 30 minutes / 6 hours
      technical_indicators: { fresh: 5 * 60 * 1000, stale: 60 * 60 * 1000 } // 5 minutes / 1 hour
    }

    const thresholds = freshnessThresholds[factorType] || freshnessThresholds.technical_indicators

    if (cacheAge <= thresholds.fresh) {
      // Fresh cache = slight confidence boost
      return baseConfidence + 0.01
    } else if (cacheAge <= thresholds.stale) {
      // Aging cache = gradual confidence reduction
      const agingFactor = (cacheAge - thresholds.fresh) / (thresholds.stale - thresholds.fresh)
      return baseConfidence - (0.05 * agingFactor)
    } else {
      // Stale cache = significant confidence reduction
      return baseConfidence - 0.1
    }
  }

  /**
   * Apply error count adjustment to confidence
   */
  private applyErrorCountAdjustment(baseConfidence: number, errorCount: number): number {
    // Each error reduces confidence by 5%, with diminishing returns
    const errorPenalty = Math.min(errorCount * 0.05, 0.3) // Max 30% penalty
    return baseConfidence - errorPenalty
  }

  /**
   * Calculate variance of confidence values
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2))
    return squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length
  }
}