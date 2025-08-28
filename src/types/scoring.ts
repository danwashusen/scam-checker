/**
 * Multi-Factor Scoring System Type Definitions
 * Defines interfaces for the configurable weighted scoring algorithm
 */

import type { ReputationAnalysis } from './reputation'
import type { DomainAgeAnalysis } from './whois'
import type { SSLCertificateAnalysis } from './ssl'
import type { AIAnalysisResult } from './ai'

/**
 * Individual risk factor types
 */
export type RiskFactorType = 
  | 'reputation'
  | 'domain_age' 
  | 'ssl_certificate'
  | 'ai_analysis'
  | 'technical_indicators'

/**
 * Risk level categories
 */
export type RiskLevel = 'low' | 'medium' | 'high'

/**
 * Individual risk factor from analysis components
 */
export interface RiskFactor {
  type: RiskFactorType
  score: number // 0-100 normalized score
  confidence: number // 0-1 confidence level
  weight: number // Configured weight for this factor
  description: string
  available: boolean // Whether this analysis was available
  processingTimeMs?: number
}

/**
 * Configuration for scoring weights and thresholds
 */
export interface ScoringConfig {
  weights: {
    reputation: number // Default: 40%
    domain_age: number // Default: 25%
    ssl_certificate: number // Default: 20%
    ai_analysis: number // Default: 15%
  }
  thresholds: {
    lowRiskMax: number // Default: 30
    mediumRiskMax: number // Default: 69
    highRiskMin: number // Default: 70
  }
  missingDataStrategy: 'redistribute' | 'penalty' | 'default'
  confidenceAdjustment: {
    missingFactorPenalty: number // Default: 0.1 per missing factor
    minimumConfidence: number // Default: 0.5
  }
  normalization: {
    method: 'linear' | 'logarithmic' | 'sigmoid'
    parameters?: Record<string, number>
  }
}

/**
 * Input data from all analysis services
 */
export interface ScoringInput {
  url: string
  reputation?: {
    analysis: ReputationAnalysis
    processingTimeMs: number
    fromCache: boolean
  }
  whois?: {
    analysis: DomainAgeAnalysis
    processingTimeMs: number
    fromCache: boolean
  }
  ssl?: {
    analysis: SSLCertificateAnalysis
    processingTimeMs: number
    fromCache: boolean
  }
  ai?: {
    analysis: AIAnalysisResult
    processingTimeMs: number
    fromCache: boolean
  }
}

/**
 * Final scoring result
 */
export interface ScoringResult {
  url: string
  finalScore: number // 0-100 overall risk score
  riskLevel: RiskLevel
  confidence: number // 0-1 overall confidence
  riskFactors: RiskFactor[]
  metadata: {
    totalProcessingTimeMs: number
    configUsed: string // Config version/hash
    missingFactors: RiskFactorType[]
    redistributedWeights: Partial<ScoringConfig['weights']>
    normalizationMethod: string
    timestamp: Date
  }
  breakdown: {
    weightedScores: Record<RiskFactorType, number>
    normalizedScores: Record<RiskFactorType, number>
    rawScores: Record<RiskFactorType, number>
    totalWeight: number
  }
}

/**
 * Score normalization result
 */
export interface NormalizationResult {
  originalScore: number
  normalizedScore: number // 0-100
  confidence: number
  method: string
  parameters?: Record<string, number>
}

/**
 * Confidence calculation input
 */
export interface ConfidenceInput {
  factorConfidences: number[] // Individual factor confidences
  availableFactors: RiskFactorType[]
  missingFactors: RiskFactorType[]
  totalFactors: number
}

/**
 * A/B Testing configuration for scoring experiments
 */
export interface ScoringExperiment {
  id: string
  name: string
  description: string
  config: Partial<ScoringConfig>
  trafficAllocation: number // 0-1 percentage of traffic
  startDate: Date
  endDate?: Date
  metrics: {
    falsePositiveRate?: number
    falseNegativeRate?: number
    accuracy?: number
  }
}

/**
 * Historical scoring comparison for validation
 */
export interface ScoringComparison {
  url: string
  currentScore: number
  previousScore?: number
  scoreDifference?: number
  configChanges: string[]
  timestamp: Date
}

/**
 * Performance metrics for scoring algorithm
 */
export interface ScoringPerformanceMetrics {
  averageProcessingTimeMs: number
  p95ProcessingTimeMs: number
  p99ProcessingTimeMs: number
  cacheHitRate: number
  errorRate: number
  scoreDistribution: {
    low: number // Count of low risk scores
    medium: number // Count of medium risk scores
    high: number // Count of high risk scores
  }
  factorAvailability: Record<RiskFactorType, number> // Availability percentages
}

/**
 * Audit trail for scoring decisions
 */
export interface ScoringAuditEntry {
  id: string
  url: string
  timestamp: Date
  finalScore: number
  riskLevel: RiskLevel
  confidence: number
  configVersion: string
  inputData: ScoringInput
  riskFactors: RiskFactor[]
  metadata: ScoringResult['metadata']
  processingTimeMs: number
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  normalizedConfig?: ScoringConfig
}

/**
 * Score calculation context for debugging
 */
export interface ScoringContext {
  step: string
  values: Record<string, number | string>
  description: string
  timestamp: number
}

/**
 * Default scoring configuration
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    reputation: 0.40, // 40% - Primary threat intelligence
    domain_age: 0.25, // 25% - Domain registration patterns
    ssl_certificate: 0.20, // 20% - Certificate quality
    ai_analysis: 0.15 // 15% - AI-based content analysis
  },
  thresholds: {
    lowRiskMax: 30,
    mediumRiskMax: 69,
    highRiskMin: 70
  },
  missingDataStrategy: 'redistribute',
  confidenceAdjustment: {
    missingFactorPenalty: 0.1, // 10% confidence penalty per missing factor
    minimumConfidence: 0.5 // Never go below 50% confidence
  },
  normalization: {
    method: 'linear'
  }
}

/**
 * Risk factor weight constraints for validation
 */
export const WEIGHT_CONSTRAINTS = {
  MIN_WEIGHT: 0.0,
  MAX_WEIGHT: 1.0,
  TOTAL_WEIGHT_TOLERANCE: 0.01 // Allow 1% tolerance in total weight sum
}

/**
 * Score thresholds constraints
 */
export const SCORE_CONSTRAINTS = {
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  MIN_THRESHOLD_SEPARATION: 5 // Minimum gap between thresholds
}