import { ScoringConfigManager } from '../../../../src/lib/scoring/scoring-config'
import type {
  ScoringConfig,
  ScoringExperiment
} from '../../../../src/types/scoring'
import { DEFAULT_SCORING_CONFIG } from '../../../../src/types/scoring'

// Mock dependencies
jest.mock('../../../../src/lib/logger', () => {
  const mockInstance = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
  return {
    Logger: jest.fn().mockImplementation(() => mockInstance)
  }
})

describe('ScoringConfigManager', () => {
  let configManager: ScoringConfigManager

  beforeEach(() => {
    jest.clearAllMocks()
    configManager = new ScoringConfigManager()
  })

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const manager = new ScoringConfigManager()
      const config = manager.getCurrentConfig()
      
      expect(config).toEqual(DEFAULT_SCORING_CONFIG)
    })

    it('should initialize with partial custom configuration', () => {
      const customConfig: Partial<ScoringConfig> = {
        weights: {
          reputation: 0.5,
          domain_age: 0.3,
          ssl_certificate: 0.1,
          ai_analysis: 0.1
        }
      }
      
      const manager = new ScoringConfigManager(customConfig)
      const config = manager.getCurrentConfig()
      
      expect(config.weights).toEqual(customConfig.weights)
      expect(config.thresholds).toEqual(DEFAULT_SCORING_CONFIG.thresholds) // Should use defaults
    })

    it('should throw error for invalid initial configuration', () => {
      const invalidConfig: Partial<ScoringConfig> = {
        weights: {
          reputation: 1.5, // Invalid - exceeds maximum
          domain_age: 0.0,
          ssl_certificate: 0.0,
          ai_analysis: 0.0
        }
      }
      
      expect(() => new ScoringConfigManager(invalidConfig)).toThrow()
    })
  })

  describe('Configuration Validation', () => {
    describe('Weight Validation', () => {
      it('should validate correct weights', () => {
        const validConfig: ScoringConfig = {
          ...DEFAULT_SCORING_CONFIG,
          weights: {
            reputation: 0.4,
            domain_age: 0.3,
            ssl_certificate: 0.2,
            ai_analysis: 0.1
          }
        }

        const validation = configManager.validateConfig(validConfig)
        expect(validation.isValid).toBe(true)
        expect(validation.errors).toHaveLength(0)
      })

      it('should reject weights that exceed limits', () => {
        const invalidConfig: ScoringConfig = {
          ...DEFAULT_SCORING_CONFIG,
          weights: {
            reputation: 1.5, // Exceeds max
            domain_age: 0.0,
            ssl_certificate: 0.0,
            ai_analysis: 0.0
          }
        }

        const validation = configManager.validateConfig(invalidConfig)
        expect(validation.isValid).toBe(false)
        expect(validation.errors.some(e => e.includes('reputation'))).toBe(true)
      })

      it('should reject weights that do not sum to 1.0', () => {
        const invalidConfig: ScoringConfig = {
          ...DEFAULT_SCORING_CONFIG,
          weights: {
            reputation: 0.2,
            domain_age: 0.2,
            ssl_certificate: 0.2,
            ai_analysis: 0.2
          } // Sums to 0.8, not 1.0
        }

        const validation = configManager.validateConfig(invalidConfig)
        expect(validation.isValid).toBe(false)
        expect(validation.errors.some(e => e.includes('Total weights'))).toBe(true)
      })

      it('should warn about unusual weight distributions', () => {
        const warningConfig: ScoringConfig = {
          ...DEFAULT_SCORING_CONFIG,
          weights: {
            reputation: 0.8, // Very high weight
            domain_age: 0.1,
            ssl_certificate: 0.1,
            ai_analysis: 0.0 // Very low weight
          }
        }

        const validation = configManager.validateConfig(warningConfig)
        expect(validation.isValid).toBe(true)
        expect(validation.warnings.length).toBeGreaterThan(0)
      })
    })

    describe('Threshold Validation', () => {
      it('should validate correct thresholds', () => {
        const validConfig: ScoringConfig = {
          ...DEFAULT_SCORING_CONFIG,
          thresholds: {
            safeMin: 70,      // 70-100 = safe
            cautionMin: 30,   // 30-69 = caution
            dangerMax: 29     // 0-29 = danger
          }
        }

        const validation = configManager.validateConfig(validConfig)
        expect(validation.isValid).toBe(true)
      })

      it('should reject incorrectly ordered thresholds', () => {
        const invalidConfig: ScoringConfig = {
          ...DEFAULT_SCORING_CONFIG,
          thresholds: {
            safeMin: 30,      // Lower than caution - invalid
            cautionMin: 70,   // Higher than safe - invalid
            dangerMax: 71     // Higher than both - invalid
          }
        }

        const validation = configManager.validateConfig(invalidConfig)
        expect(validation.isValid).toBe(false)
        expect(validation.errors.some(e => e.includes('less than'))).toBe(true)
      })

      it('should warn about small threshold gaps', () => {
        const warningConfig: ScoringConfig = {
          ...DEFAULT_SCORING_CONFIG,
          thresholds: {
            safeMin: 51,      // Small gap between caution and safe
            cautionMin: 49,   // Small gap between danger and caution
            dangerMax: 48
          }
        }

        const validation = configManager.validateConfig(warningConfig)
        expect(validation.isValid).toBe(true)
        expect(validation.warnings.some(w => w.includes('gap'))).toBe(true)
      })
    })

    describe('Confidence Adjustment Validation', () => {
      it('should validate correct confidence settings', () => {
        const validConfig: ScoringConfig = {
          ...DEFAULT_SCORING_CONFIG,
          confidenceAdjustment: {
            missingFactorPenalty: 0.15,
            minimumConfidence: 0.4
          }
        }

        const validation = configManager.validateConfig(validConfig)
        expect(validation.isValid).toBe(true)
      })

      it('should reject invalid confidence ranges', () => {
        const invalidConfig: ScoringConfig = {
          ...DEFAULT_SCORING_CONFIG,
          confidenceAdjustment: {
            missingFactorPenalty: 1.5, // Exceeds max
            minimumConfidence: -0.1    // Below min
          }
        }

        const validation = configManager.validateConfig(invalidConfig)
        expect(validation.isValid).toBe(false)
        expect(validation.errors.length).toBeGreaterThan(0)
      })

      it('should warn about extreme confidence settings', () => {
        const warningConfig: ScoringConfig = {
          ...DEFAULT_SCORING_CONFIG,
          confidenceAdjustment: {
            missingFactorPenalty: 0.4, // High penalty
            minimumConfidence: 0.2     // Low minimum
          }
        }

        const validation = configManager.validateConfig(warningConfig)
        expect(validation.isValid).toBe(true)
        expect(validation.warnings.length).toBeGreaterThan(0)
      })
    })

    describe('Normalization Validation', () => {
      it('should validate linear normalization', () => {
        const validConfig: ScoringConfig = {
          ...DEFAULT_SCORING_CONFIG,
          normalization: {
            method: 'linear'
          }
        }

        const validation = configManager.validateConfig(validConfig)
        expect(validation.isValid).toBe(true)
      })

      it('should validate sigmoid normalization with parameters', () => {
        const validConfig: ScoringConfig = {
          ...DEFAULT_SCORING_CONFIG,
          normalization: {
            method: 'sigmoid',
            parameters: {
              steepness: 0.1,
              midpoint: 50
            }
          }
        }

        const validation = configManager.validateConfig(validConfig)
        expect(validation.isValid).toBe(true)
      })

      it('should reject invalid normalization method', () => {
        const invalidConfig: ScoringConfig = {
          ...DEFAULT_SCORING_CONFIG,
          normalization: {
            method: 'invalid-method' as 'linear' // Type assertion for test
          }
        }

        const validation = configManager.validateConfig(invalidConfig)
        expect(validation.isValid).toBe(false)
      })

      it('should reject invalid sigmoid parameters', () => {
        const invalidConfig: ScoringConfig = {
          ...DEFAULT_SCORING_CONFIG,
          normalization: {
            method: 'sigmoid',
            parameters: {
              steepness: -1, // Invalid
              midpoint: 150  // Invalid
            }
          }
        }

        const validation = configManager.validateConfig(invalidConfig)
        expect(validation.isValid).toBe(false)
      })
    })
  })

  describe('Configuration Updates', () => {
    it('should successfully update valid configuration', () => {
      const newConfig: Partial<ScoringConfig> = {
        weights: {
          reputation: 0.5,
          domain_age: 0.3,
          ssl_certificate: 0.15,
          ai_analysis: 0.05
        }
      }

      const validation = configManager.updateConfig(newConfig)
      expect(validation.isValid).toBe(true)

      const currentConfig = configManager.getCurrentConfig()
      expect(currentConfig.weights).toEqual(newConfig.weights)
    })

    it('should reject invalid configuration updates', () => {
      const invalidConfig: Partial<ScoringConfig> = {
        weights: {
          reputation: 2.0, // Invalid
          domain_age: 0.0,
          ssl_certificate: 0.0,
          ai_analysis: 0.0
        }
      }

      const validation = configManager.updateConfig(invalidConfig)
      expect(validation.isValid).toBe(false)

      // Configuration should remain unchanged
      const currentConfig = configManager.getCurrentConfig()
      expect(currentConfig.weights).toEqual(DEFAULT_SCORING_CONFIG.weights)
    })
  })

  describe('Experiment Management', () => {
    const testExperiment: ScoringExperiment = {
      id: 'test-experiment',
      name: 'Test Experiment',
      description: 'Testing new weights',
      config: {
        weights: {
          reputation: 0.6,
          domain_age: 0.2,
          ssl_certificate: 0.1,
          ai_analysis: 0.1
        }
      },
      trafficAllocation: 0.5,
      startDate: new Date(Date.now() - 10000), // Started 10 seconds ago
      endDate: new Date(Date.now() + 10000),    // Ends in 10 seconds
      metrics: {}
    }

    it('should register valid experiment', () => {
      const success = configManager.registerExperiment(testExperiment)
      expect(success).toBe(true)
    })

    it('should reject invalid experiment configuration', () => {
      const invalidExperiment: ScoringExperiment = {
        ...testExperiment,
        config: {
          weights: {
            reputation: 1.5, // Invalid
            domain_age: 0.0,
            ssl_certificate: 0.0,
            ai_analysis: 0.0
          }
        }
      }

      const success = configManager.registerExperiment(invalidExperiment)
      expect(success).toBe(false)
    })

    it('should return experiment configuration when active', () => {
      configManager.registerExperiment(testExperiment)
      
      const experimentConfig = configManager.getExperimentConfig(testExperiment.id)
      expect(experimentConfig).toBeDefined()
      expect(experimentConfig?.weights.reputation).toBe(0.6)
    })

    it('should return null for non-existent experiment', () => {
      const experimentConfig = configManager.getExperimentConfig('non-existent')
      expect(experimentConfig).toBeNull()
    })

    it('should return null for ended experiment', () => {
      const endedExperiment: ScoringExperiment = {
        ...testExperiment,
        id: 'ended-experiment',
        endDate: new Date(Date.now() - 1000) // Ended 1 second ago
      }

      configManager.registerExperiment(endedExperiment)
      
      const experimentConfig = configManager.getExperimentConfig(endedExperiment.id)
      expect(experimentConfig).toBeNull()
    })

    it('should remove experiment', () => {
      configManager.registerExperiment(testExperiment)
      
      const removed = configManager.removeExperiment(testExperiment.id)
      expect(removed).toBe(true)
      
      const experimentConfig = configManager.getExperimentConfig(testExperiment.id)
      expect(experimentConfig).toBeNull()
    })
  })

  describe('Configuration Selection', () => {
    beforeEach(() => {
      const experiment: ScoringExperiment = {
        id: 'selection-test',
        name: 'Selection Test',
        description: 'Testing configuration selection',
        config: {
          weights: {
            reputation: 0.7,
            domain_age: 0.15,
            ssl_certificate: 0.1,
            ai_analysis: 0.05
          }
        },
        trafficAllocation: 0.5,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 10000),
        metrics: {}
      }
      
      configManager.registerExperiment(experiment)
    })

    it('should return default configuration when no experiment specified', () => {
      const selection = configManager.selectConfiguration()
      
      expect(selection.isExperiment).toBe(false)
      expect(selection.config).toEqual(configManager.getCurrentConfig())
    })

    it('should return experiment configuration when specified', () => {
      const selection = configManager.selectConfiguration(undefined, 'selection-test')
      
      expect(selection.isExperiment).toBe(true)
      expect(selection.experimentId).toBe('selection-test')
      expect(selection.config.weights.reputation).toBe(0.7)
    })

    it('should return default configuration for non-existent experiment', () => {
      const selection = configManager.selectConfiguration(undefined, 'non-existent')
      
      expect(selection.isExperiment).toBe(false)
      expect(selection.config).toEqual(configManager.getCurrentConfig())
    })
  })

  describe('Configuration History', () => {
    it('should track configuration history', () => {
      const newConfig: Partial<ScoringConfig> = {
        weights: {
          reputation: 0.5,
          domain_age: 0.3,
          ssl_certificate: 0.15,
          ai_analysis: 0.05
        }
      }

      configManager.updateConfig(newConfig)
      
      const history = configManager.getConfigHistory()
      expect(history.length).toBeGreaterThan(1) // Initial + update
      expect(history[history.length - 1].version).toBe('update')
    })
  })

  describe('Configuration Hash', () => {
    it('should generate consistent hash for same configuration', () => {
      const config = configManager.getCurrentConfig()
      const hash1 = configManager.getConfigHash(config)
      const hash2 = configManager.getConfigHash(config)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toBeDefined()
    })

    it('should generate different hashes for different configurations', () => {
      const config1 = configManager.getCurrentConfig()
      const config2: ScoringConfig = {
        ...config1,
        weights: {
          reputation: 0.5,
          domain_age: 0.3,
          ssl_certificate: 0.15,
          ai_analysis: 0.05
        }
      }
      
      const hash1 = configManager.getConfigHash(config1)
      const hash2 = configManager.getConfigHash(config2)
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('Scoring Context', () => {
    it('should create scoring context with configuration values', () => {
      const context = configManager.createScoringContext()
      
      expect(context).toHaveLength(1)
      expect(context[0].step).toBe('configuration_load')
      expect(context[0].values).toMatchObject({
        reputation_weight: expect.any(Number),
        domain_age_weight: expect.any(Number),
        ssl_weight: expect.any(Number),
        ai_weight: expect.any(Number)
      })
    })
  })
})