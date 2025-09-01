/**
 * Scoring Configuration Management
 * Handles configuration validation, loading, and A/B testing support
 */

import type {
  ScoringConfig,
  ConfigValidationResult,
  ScoringExperiment,
  ScoringContext
} from '../../types/scoring'
import {
  DEFAULT_SCORING_CONFIG,
  WEIGHT_CONSTRAINTS,
  SCORE_CONSTRAINTS
} from '../../types/scoring'
import { Logger } from '../logger'

const logger = new Logger()

/**
 * Configuration manager for scoring algorithm
 * Supports configuration validation, A/B testing, and hot reloading
 */
export class ScoringConfigManager {
  private currentConfig: ScoringConfig
  private experiments: Map<string, ScoringExperiment> = new Map()
  private configHistory: Array<{ config: ScoringConfig; timestamp: Date; version: string }> = []

  constructor(initialConfig?: Partial<ScoringConfig>) {
    this.currentConfig = this.mergeWithDefaults(initialConfig || {})
    this.validateAndLog(this.currentConfig)
    this.recordConfigChange('initial', this.currentConfig)
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): ScoringConfig {
    return { ...this.currentConfig }
  }

  /**
   * Update configuration with validation
   */
  updateConfig(newConfig: Partial<ScoringConfig>): ConfigValidationResult {
    const mergedConfig = this.mergeWithDefaults(newConfig)
    const validation = this.validateConfig(mergedConfig)

    if (validation.isValid) {
      const previousConfig = { ...this.currentConfig }
      this.currentConfig = mergedConfig
      this.recordConfigChange('update', this.currentConfig)

      logger.info('Scoring configuration updated', {
        previousConfig,
        newConfig: this.currentConfig,
        validation
      })
    } else {
      logger.error('Invalid scoring configuration rejected', {
        config: mergedConfig,
        errors: validation.errors,
        warnings: validation.warnings
      })
    }

    return validation
  }

  /**
   * Get configuration for specific experiment (A/B testing)
   */
  getExperimentConfig(experimentId: string): ScoringConfig | null {
    const experiment = this.experiments.get(experimentId)
    if (!experiment) return null

    const now = new Date()
    if (experiment.endDate && now > experiment.endDate) {
      logger.warn('Experiment has ended', { experimentId, endDate: experiment.endDate })
      return null
    }

    if (now < experiment.startDate) {
      logger.warn('Experiment has not started yet', { experimentId, startDate: experiment.startDate })
      return null
    }

    return this.mergeWithDefaults(experiment.config)
  }

  /**
   * Register A/B testing experiment
   */
  registerExperiment(experiment: ScoringExperiment): boolean {
    const validation = this.validateConfig(this.mergeWithDefaults(experiment.config))
    
    if (!validation.isValid) {
      logger.error('Invalid experiment configuration', {
        experimentId: experiment.id,
        errors: validation.errors
      })
      return false
    }

    this.experiments.set(experiment.id, experiment)
    logger.info('Scoring experiment registered', {
      experimentId: experiment.id,
      name: experiment.name,
      trafficAllocation: experiment.trafficAllocation
    })

    return true
  }

  /**
   * Remove experiment
   */
  removeExperiment(experimentId: string): boolean {
    const removed = this.experiments.delete(experimentId)
    if (removed) {
      logger.info('Scoring experiment removed', { experimentId })
    }
    return removed
  }

  /**
   * Determine which configuration to use based on A/B testing
   */
  selectConfiguration(userId?: string, experimentId?: string): {
    config: ScoringConfig
    experimentId?: string
    isExperiment: boolean
  } {
    // If specific experiment requested and available
    if (experimentId) {
      const experimentConfig = this.getExperimentConfig(experimentId)
      if (experimentConfig) {
        return {
          config: experimentConfig,
          experimentId,
          isExperiment: true
        }
      }
    }

    // Check for user-based experiment assignment
    if (userId) {
      for (const [id, experiment] of this.experiments) {
        if (this.shouldUseExperiment(userId, experiment)) {
          const experimentConfig = this.getExperimentConfig(id)
          if (experimentConfig) {
            return {
              config: experimentConfig,
              experimentId: id,
              isExperiment: true
            }
          }
        }
      }
    }

    // Return default configuration
    return {
      config: this.currentConfig,
      isExperiment: false
    }
  }

  /**
   * Validate configuration against constraints
   */
  validateConfig(config: ScoringConfig): ConfigValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate weights
    this.validateWeights(config.weights, errors, warnings)

    // Validate thresholds
    this.validateThresholds(config.thresholds, errors, warnings)

    // Validate confidence adjustment
    this.validateConfidenceAdjustment(config.confidenceAdjustment, errors, warnings)

    // Validate normalization
    this.validateNormalization(config.normalization, errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedConfig: errors.length === 0 ? config : undefined
    }
  }

  /**
   * Get configuration history
   */
  getConfigHistory(): Array<{ config: ScoringConfig; timestamp: Date; version: string }> {
    return [...this.configHistory]
  }

  /**
   * Generate configuration hash for caching/versioning
   */
  getConfigHash(config: ScoringConfig = this.currentConfig): string {
    // Create deterministic string by sorting keys at all levels
    const sortedConfig = this.sortConfigForHashing(config)
    const configStr = JSON.stringify(sortedConfig)
    return this.hashString(configStr)
  }

  /**
   * Sort configuration object recursively for consistent hashing
   */
  private sortConfigForHashing(config: ScoringConfig): Record<string, unknown> {
    const sortObject = (obj: Record<string, unknown>): Record<string, unknown> => {
      const sorted: Record<string, unknown> = {}
      Object.keys(obj).sort().forEach(key => {
        const value = obj[key]
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          sorted[key] = sortObject(value as Record<string, unknown>)
        } else {
          sorted[key] = value
        }
      })
      return sorted
    }

    return sortObject(config as unknown as Record<string, unknown>)
  }

  /**
   * Create scoring context for debugging
   */
  createScoringContext(): ScoringContext[] {
    return [
      {
        step: 'configuration_load',
        values: {
          reputation_weight: this.currentConfig.weights.reputation,
          domain_age_weight: this.currentConfig.weights.domain_age,
          ssl_weight: this.currentConfig.weights.ssl_certificate,
          ai_weight: this.currentConfig.weights.ai_analysis
        },
        description: 'Loaded scoring configuration',
        timestamp: Date.now()
      }
    ]
  }

  /**
   * Merge partial config with defaults
   */
  private mergeWithDefaults(partialConfig: Partial<ScoringConfig>): ScoringConfig {
    return {
      weights: {
        ...DEFAULT_SCORING_CONFIG.weights,
        ...partialConfig.weights
      },
      thresholds: {
        ...DEFAULT_SCORING_CONFIG.thresholds,
        ...partialConfig.thresholds
      },
      missingDataStrategy: partialConfig.missingDataStrategy || DEFAULT_SCORING_CONFIG.missingDataStrategy,
      confidenceAdjustment: {
        ...DEFAULT_SCORING_CONFIG.confidenceAdjustment,
        ...partialConfig.confidenceAdjustment
      },
      normalization: {
        ...DEFAULT_SCORING_CONFIG.normalization,
        ...partialConfig.normalization
      }
    }
  }

  /**
   * Validate weight configuration
   */
  private validateWeights(
    weights: ScoringConfig['weights'],
    errors: string[],
    warnings: string[]
  ): void {
    const factorTypes = ['reputation', 'domain_age', 'ssl_certificate', 'ai_analysis'] as const
    
    // Check individual weights
    for (const factor of factorTypes) {
      const weight = weights[factor]
      if (weight < WEIGHT_CONSTRAINTS.MIN_WEIGHT || weight > WEIGHT_CONSTRAINTS.MAX_WEIGHT) {
        errors.push(`Weight for ${factor} must be between ${WEIGHT_CONSTRAINTS.MIN_WEIGHT} and ${WEIGHT_CONSTRAINTS.MAX_WEIGHT}`)
      }
    }

    // Check total weights
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
    const expectedTotal = 1.0
    const tolerance = WEIGHT_CONSTRAINTS.TOTAL_WEIGHT_TOLERANCE

    if (Math.abs(totalWeight - expectedTotal) > tolerance) {
      errors.push(`Total weights (${totalWeight.toFixed(3)}) must equal 1.0 ± ${tolerance}`)
    }

    // Warnings for unusual weight distributions
    const maxWeight = Math.max(...Object.values(weights))
    const minWeight = Math.min(...Object.values(weights))
    
    if (maxWeight > 0.6) {
      warnings.push(`Very high weight detected (${maxWeight.toFixed(2)}) - may cause scoring bias`)
    }
    
    if (minWeight < 0.05) {
      warnings.push(`Very low weight detected (${minWeight.toFixed(2)}) - factor may be ignored`)
    }
  }

  /**
   * Validate threshold configuration
   */
  private validateThresholds(
    thresholds: ScoringConfig['thresholds'],
    errors: string[],
    warnings: string[]
  ): void {
    const { safeMin, cautionMin, dangerMax } = thresholds

    // Check individual thresholds (CORRECTED: Higher scores = safer)
    if (safeMin < SCORE_CONSTRAINTS.MIN_SCORE || safeMin > SCORE_CONSTRAINTS.MAX_SCORE) {
      errors.push(`Safe threshold must be between ${SCORE_CONSTRAINTS.MIN_SCORE} and ${SCORE_CONSTRAINTS.MAX_SCORE}`)
    }

    if (cautionMin < SCORE_CONSTRAINTS.MIN_SCORE || cautionMin > SCORE_CONSTRAINTS.MAX_SCORE) {
      errors.push(`Caution threshold must be between ${SCORE_CONSTRAINTS.MIN_SCORE} and ${SCORE_CONSTRAINTS.MAX_SCORE}`)
    }

    if (dangerMax < SCORE_CONSTRAINTS.MIN_SCORE || dangerMax > SCORE_CONSTRAINTS.MAX_SCORE) {
      errors.push(`Danger threshold must be between ${SCORE_CONSTRAINTS.MIN_SCORE} and ${SCORE_CONSTRAINTS.MAX_SCORE}`)
    }

    // Check threshold ordering and separation (CORRECTED: dangerMax < cautionMin < safeMin)
    if (dangerMax >= cautionMin) {
      errors.push('Danger threshold must be less than caution threshold')
    }

    if (cautionMin >= safeMin) {
      errors.push('Caution threshold must be less than safe threshold')
    }

    const dangerCautionGap = cautionMin - dangerMax - 1
    const cautionSafeGap = safeMin - cautionMin

    if (dangerCautionGap < SCORE_CONSTRAINTS.MIN_THRESHOLD_SEPARATION) {
      warnings.push(`Small gap between danger and caution thresholds (${dangerCautionGap}) may cause classification instability`)
    }

    if (cautionSafeGap < SCORE_CONSTRAINTS.MIN_THRESHOLD_SEPARATION) {
      warnings.push(`Small gap between caution and safe thresholds (${cautionSafeGap}) may cause classification instability`)
    }
  }

  /**
   * Validate confidence adjustment settings
   */
  private validateConfidenceAdjustment(
    confidenceAdjustment: ScoringConfig['confidenceAdjustment'],
    errors: string[],
    warnings: string[]
  ): void {
    const { missingFactorPenalty, minimumConfidence } = confidenceAdjustment

    if (missingFactorPenalty < 0 || missingFactorPenalty > 1) {
      errors.push('Missing factor penalty must be between 0 and 1')
    }

    if (minimumConfidence < 0 || minimumConfidence > 1) {
      errors.push('Minimum confidence must be between 0 and 1')
    }

    if (missingFactorPenalty > 0.3) {
      warnings.push('High missing factor penalty may result in very low confidence scores')
    }

    if (minimumConfidence < 0.3) {
      warnings.push('Low minimum confidence threshold may indicate unreliable scoring')
    }
  }

  /**
   * Validate normalization settings
   */
  private validateNormalization(
    normalization: ScoringConfig['normalization'],
    errors: string[],
    _warnings: string[]
  ): void {
    const validMethods = ['linear', 'logarithmic', 'sigmoid']
    
    if (!validMethods.includes(normalization.method)) {
      errors.push(`Normalization method must be one of: ${validMethods.join(', ')}`)
    }

    // Validate method-specific parameters
    if (normalization.method === 'sigmoid' && normalization.parameters) {
      const { steepness, midpoint } = normalization.parameters
      if (steepness !== undefined && (steepness <= 0 || steepness > 10)) {
        errors.push('Sigmoid steepness parameter must be between 0 and 10')
      }
      if (midpoint !== undefined && (midpoint < 0 || midpoint > 100)) {
        errors.push('Sigmoid midpoint parameter must be between 0 and 100')
      }
    }
  }

  /**
   * Determine if user should use experiment based on traffic allocation
   */
  private shouldUseExperiment(userId: string, experiment: ScoringExperiment): boolean {
    if (experiment.trafficAllocation <= 0) return false
    if (experiment.trafficAllocation >= 1) return true

    // Use consistent hash-based assignment
    const userHash = this.hashString(userId + experiment.id)
    const hashValue = parseInt(userHash.substring(0, 8), 16) / 0xffffffff
    
    return hashValue < experiment.trafficAllocation
  }

  /**
   * Improved hash function for string input using FNV-1a algorithm
   */
  private hashString(str: string): string {
    let hash = 2166136261 // FNV offset basis
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i)
      hash = (hash * 16777619) >>> 0 // FNV prime, convert to 32-bit unsigned
    }
    return hash.toString(16).padStart(8, '0')
  }

  /**
   * Record configuration change for history
   */
  private recordConfigChange(version: string, config: ScoringConfig): void {
    this.configHistory.push({
      config: { ...config },
      timestamp: new Date(),
      version
    })

    // Keep only last 10 configurations
    if (this.configHistory.length > 10) {
      this.configHistory.shift()
    }
  }

  /**
   * Validate and log initial configuration
   */
  private validateAndLog(config: ScoringConfig): void {
    const validation = this.validateConfig(config)
    
    if (!validation.isValid) {
      logger.error('Invalid initial scoring configuration', {
        config,
        errors: validation.errors
      })
      throw new Error(`Invalid scoring configuration: ${validation.errors.join(', ')}`)
    }

    if (validation.warnings.length > 0) {
      logger.warn('Scoring configuration warnings', {
        config,
        warnings: validation.warnings
      })
    }

    logger.info('Scoring configuration initialized', {
      config,
      configHash: this.getConfigHash(config)
    })
  }
}