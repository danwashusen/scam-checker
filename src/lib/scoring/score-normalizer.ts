/**
 * Score Normalization Utilities
 * Handles different normalization methods for risk factor scores
 */

import type {
  NormalizationResult,
  ScoringConfig,
  RiskFactorType,
  ScoringContext
} from '../../types/scoring'
import { Logger } from '../logger'

const logger = new Logger()

/**
 * Score normalizer with multiple normalization methods
 * Converts various score ranges to consistent 0-100 scale
 */
export class ScoreNormalizer {
  private config: ScoringConfig['normalization']
  private normalizationCache = new Map<string, NormalizationResult>()

  constructor(config: ScoringConfig['normalization']) {
    this.config = config
  }

  /**
   * Normalize a score based on configured method
   */
  normalize(
    score: number,
    factorType: RiskFactorType,
    confidence: number,
    originalRange?: { min: number; max: number }
  ): NormalizationResult {
    const cacheKey = this.getCacheKey(score, factorType, confidence, originalRange)
    
    // Check cache first
    if (this.normalizationCache.has(cacheKey)) {
      return this.normalizationCache.get(cacheKey)!
    }

    let result: NormalizationResult

    switch (this.config.method) {
      case 'linear':
        result = this.normalizeLinear(score, factorType, confidence, originalRange)
        break
      case 'logarithmic':
        result = this.normalizeLogarithmic(score, factorType, confidence, originalRange)
        break
      case 'sigmoid':
        result = this.normalizeSigmoid(score, factorType, confidence, originalRange)
        break
      default:
        logger.warn('Unknown normalization method, falling back to linear', {
          method: this.config.method,
          factorType,
          score
        })
        result = this.normalizeLinear(score, factorType, confidence, originalRange)
    }

    // Cache result
    this.normalizationCache.set(cacheKey, result)

    // Clear cache if it gets too large
    if (this.normalizationCache.size > 1000) {
      this.normalizationCache.clear()
    }

    return result
  }

  /**
   * Batch normalize multiple scores
   */
  normalizeScores(
    scores: Array<{
      score: number
      factorType: RiskFactorType
      confidence: number
      originalRange?: { min: number; max: number }
    }>
  ): NormalizationResult[] {
    return scores.map(({ score, factorType, confidence, originalRange }) =>
      this.normalize(score, factorType, confidence, originalRange)
    )
  }

  /**
   * Create normalization context for debugging
   */
  createNormalizationContext(
    score: number,
    factorType: RiskFactorType,
    result: NormalizationResult
  ): ScoringContext {
    return {
      step: 'score_normalization',
      values: {
        original_score: score,
        normalized_score: result.normalizedScore,
        confidence: result.confidence,
        method_used: this.config.method
      },
      description: `Normalized ${factorType} score using ${this.config.method} method`,
      timestamp: Date.now()
    }
  }

  /**
   * Get factor-specific normalization parameters
   */
  getFactorNormalizationParams(factorType: RiskFactorType): {
    expectedRange: { min: number; max: number }
    confidenceAdjustment: number
    description: string
  } {
    switch (factorType) {
      case 'reputation':
        return {
          expectedRange: { min: 0, max: 100 },
          confidenceAdjustment: 0.0, // High confidence in reputation data
          description: 'Google Safe Browsing scores (0=clean, 100=malicious)'
        }
      case 'domain_age':
        return {
          expectedRange: { min: 0, max: 365 * 5 }, // 0 to 5 years in days
          confidenceAdjustment: 0.05, // Slight confidence reduction for age data
          description: 'Domain age in days (newer = higher risk)'
        }
      case 'ssl_certificate':
        return {
          expectedRange: { min: 0, max: 100 },
          confidenceAdjustment: 0.1, // SSL analysis has some uncertainty
          description: 'SSL certificate risk score (0=secure, 100=insecure)'
        }
      case 'ai_analysis':
        return {
          expectedRange: { min: 0, max: 100 },
          confidenceAdjustment: 0.15, // AI analysis has more uncertainty
          description: 'AI content analysis risk score'
        }
      default:
        return {
          expectedRange: { min: 0, max: 100 },
          confidenceAdjustment: 0.2,
          description: 'Generic risk factor'
        }
    }
  }

  /**
   * Linear normalization (simple range mapping)
   */
  private normalizeLinear(
    score: number,
    factorType: RiskFactorType,
    confidence: number,
    originalRange?: { min: number; max: number }
  ): NormalizationResult {
    const params = this.getFactorNormalizationParams(factorType)
    const range = originalRange || params.expectedRange

    // Handle special cases
    if (range.min === range.max) {
      return {
        originalScore: score,
        normalizedScore: 50, // Default to medium risk
        confidence: Math.max(confidence - 0.2, 0.1), // Reduce confidence for invalid range
        method: 'linear'
      }
    }

    // Clamp score to range
    const clampedScore = Math.max(range.min, Math.min(range.max, score))
    
    // Map to 0-100 scale
    let normalizedScore: number
    
    if (factorType === 'domain_age') {
      // For domain age, older (higher age) = safer (higher safety score)
      // Direct mapping: age 0 days = score 0 (unsafe), age 1825+ days = score 100 (safe)
      normalizedScore = ((clampedScore - range.min) / (range.max - range.min)) * 100
    } else {
      // For other factors, higher score = higher risk
      normalizedScore = ((clampedScore - range.min) / (range.max - range.min)) * 100
    }

    // Ensure result is within bounds
    normalizedScore = Math.max(0, Math.min(100, normalizedScore))

    // Apply confidence adjustment
    const adjustedConfidence = Math.max(0.1, confidence - params.confidenceAdjustment)

    return {
      originalScore: score,
      normalizedScore: Math.round(normalizedScore * 100) / 100, // Round to 2 decimal places
      confidence: adjustedConfidence,
      method: 'linear',
      parameters: {
        range_min: range.min,
        range_max: range.max,
        clamped_score: clampedScore
      }
    }
  }

  /**
   * Logarithmic normalization (emphasizes lower scores)
   */
  private normalizeLogarithmic(
    score: number,
    factorType: RiskFactorType,
    confidence: number,
    originalRange?: { min: number; max: number }
  ): NormalizationResult {
    const _params = this.getFactorNormalizationParams(factorType)
    const _range = originalRange || _params.expectedRange

    // First apply linear normalization
    const linearResult = this.normalizeLinear(score, factorType, confidence, originalRange)
    
    // Apply logarithmic transformation
    // log(1 + x/10) scales the score to emphasize lower values
    const normalizedScore = linearResult.normalizedScore
    const logScore = (Math.log(1 + normalizedScore / 10) / Math.log(11)) * 100

    return {
      originalScore: score,
      normalizedScore: Math.round(logScore * 100) / 100,
      confidence: linearResult.confidence,
      method: 'logarithmic',
      parameters: {
        ...linearResult.parameters,
        linear_normalized: normalizedScore,
        log_factor: 10
      }
    }
  }

  /**
   * Sigmoid normalization (S-curve, emphasizes middle range)
   */
  private normalizeSigmoid(
    score: number,
    factorType: RiskFactorType,
    confidence: number,
    originalRange?: { min: number; max: number }
  ): NormalizationResult {
    const _params = this.getFactorNormalizationParams(factorType)
    
    // Get sigmoid parameters from config or use defaults
    const steepness = this.config.parameters?.steepness || 0.1
    const midpoint = this.config.parameters?.midpoint || 50

    // First apply linear normalization
    const linearResult = this.normalizeLinear(score, factorType, confidence, originalRange)
    const normalizedScore = linearResult.normalizedScore

    // Apply sigmoid transformation: 1 / (1 + e^(-steepness * (x - midpoint)))
    const sigmoidScore = 100 / (1 + Math.exp(-steepness * (normalizedScore - midpoint)))

    return {
      originalScore: score,
      normalizedScore: Math.round(sigmoidScore * 100) / 100,
      confidence: linearResult.confidence,
      method: 'sigmoid',
      parameters: {
        ...linearResult.parameters,
        linear_normalized: normalizedScore,
        steepness,
        midpoint
      }
    }
  }

  /**
   * Generate cache key for normalization results
   */
  private getCacheKey(
    score: number,
    factorType: RiskFactorType,
    confidence: number,
    originalRange?: { min: number; max: number }
  ): string {
    const rangeKey = originalRange ? `${originalRange.min}-${originalRange.max}` : 'default'
    return `${this.config.method}:${factorType}:${score}:${confidence}:${rangeKey}`
  }

  /**
   * Clear normalization cache
   */
  clearCache(): void {
    this.normalizationCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    // This is a simplified cache stats implementation
    // In a production system, you'd track hits/misses
    return {
      size: this.normalizationCache.size,
      hitRate: 0 // Would need hit/miss tracking for accurate rate
    }
  }
}