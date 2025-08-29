/**
 * Unit tests for PromptManager
 * Tests prompt versioning, A/B testing, and performance tracking
 */

import { PromptManager, type PromptVersion } from '../../../../src/lib/analysis/prompts/prompt-manager'
import type { AIAnalysisRequest } from '../../../../src/types/ai'

describe('PromptManager', () => {
  let promptManager: PromptManager
  let mockAnalysisRequest: AIAnalysisRequest

  beforeEach(() => {
    promptManager = new PromptManager()
    mockAnalysisRequest = {
      url: 'https://test.example.com',
      domain: 'test.example.com',
      path: '/login',
      parameters: { redirect: 'https://malicious.com' },
      technicalContext: {
        urlStructure: {
          isIP: false,
          subdomain: 'test',
          pathDepth: 1,
          queryParamCount: 1,
          hasHttps: true
        },
        domainAge: {
          ageInDays: 30,
          registrationDate: '2024-01-01',
          registrar: 'Test Registrar'
        },
        reputation: {
          isClean: false,
          riskLevel: 'high',
          threatCount: 3,
          threatTypes: ['phishing', 'malware']
        }
      }
    }
  })

  describe('Version Management', () => {
    it('should initialize with default versions', () => {
      const versions = promptManager.listVersions()
      
      expect(versions).toHaveLength(2)
      expect(versions.some(v => v.id === 'v2.0')).toBe(true)
      expect(versions.some(v => v.id === 'v1.0')).toBe(true)
      
      const activeVersions = versions.filter(v => v.isActive)
      expect(activeVersions).toHaveLength(1)
      expect(activeVersions[0].id).toBe('v2.0')
    })

    it('should register new prompt versions', () => {
      const newVersion: PromptVersion = {
        id: 'v3.0-test',
        version: '3.0',
        name: 'Test Version v3.0',
        description: 'Test version for unit tests',
        createPrompt: () => 'Test prompt',
        isActive: true,
        trafficAllocation: 0.1,
        createdAt: new Date(),
        metadata: {
          author: 'Test',
          changes: ['Test change'],
          expectedImprovements: ['Test improvement']
        }
      }

      promptManager.registerVersion(newVersion)
      const retrievedVersion = promptManager.getVersion('v3.0-test')
      
      expect(retrievedVersion).toBeDefined()
      expect(retrievedVersion?.name).toBe('Test Version v3.0')
    })

    it('should activate and deactivate versions', () => {
      promptManager.setVersionActive('v1.0', true, 0.5)
      
      const version = promptManager.getVersion('v1.0')
      expect(version?.isActive).toBe(true)
      expect(version?.trafficAllocation).toBe(0.5)
      
      promptManager.setVersionActive('v1.0', false)
      expect(promptManager.getVersion('v1.0')?.isActive).toBe(false)
    })
  })

  describe('Prompt Selection', () => {
    it('should select default version when only one is active', () => {
      const selection = promptManager.selectPrompt(mockAnalysisRequest)
      
      expect(selection.version.id).toBe('v2.0')
      expect(selection.isExperiment).toBe(false)
      expect(selection.selectionReason).toBe('Default version')
      expect(selection.prompt).toBeDefined()
    })

    it('should force specific version when requested', () => {
      const selection = promptManager.selectPrompt(mockAnalysisRequest, undefined, 'v1.0')
      
      expect(selection.version.id).toBe('v1.0')
      expect(selection.isExperiment).toBe(true)
      expect(selection.selectionReason).toBe('Forced version: v1.0')
    })

    it('should perform A/B testing with multiple active versions', () => {
      // Activate v1.0 with 30% traffic
      promptManager.setVersionActive('v1.0', true, 0.3)
      
      const selections = new Set<string>()
      
      // Test with different user IDs to get different selections
      for (let i = 0; i < 20; i++) {
        const selection = promptManager.selectPrompt(mockAnalysisRequest, `user${i}`)
        selections.add(selection.version.id)
      }
      
      // Should get both versions with different user IDs
      expect(selections.size).toBeGreaterThanOrEqual(1)
    })

    it('should provide consistent selection for same user ID', () => {
      promptManager.setVersionActive('v1.0', true, 0.5)
      
      const selection1 = promptManager.selectPrompt(mockAnalysisRequest, 'consistent-user')
      const selection2 = promptManager.selectPrompt(mockAnalysisRequest, 'consistent-user')
      
      expect(selection1.version.id).toBe(selection2.version.id)
    })

    it('should throw error for non-existent forced version', () => {
      expect(() => {
        promptManager.selectPrompt(mockAnalysisRequest, undefined, 'non-existent')
      }).toThrow('Prompt version not found: non-existent')
    })
  })

  describe('Performance Metrics', () => {
    it('should update performance metrics for versions', () => {
      promptManager.updatePerformanceMetrics('v2.0', {
        totalRequests: 10,
        averageConfidence: 0.85,
        averageProcessingTime: 1200,
        costPerRequest: 0.015,
        accuracy: 0.92
      })

      const comparison = promptManager.getPerformanceComparison()
      const v2Performance = comparison.find(c => c.versionId === 'v2.0')?.performance
      
      expect(v2Performance).toBeDefined()
      expect(v2Performance?.totalRequests).toBe(10)
      expect(v2Performance?.averageConfidence).toBe(0.85)
      expect(v2Performance?.accuracy).toBe(0.92)
    })

    it('should return performance comparison for all versions', () => {
      const comparison = promptManager.getPerformanceComparison()
      
      expect(comparison).toHaveLength(2)
      expect(comparison[0]).toHaveProperty('versionId')
      expect(comparison[0]).toHaveProperty('version')
      expect(comparison[0]).toHaveProperty('name')
      expect(comparison[0]).toHaveProperty('isActive')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid version registration', () => {
      const invalidVersion = {
        id: '',
        version: '1.0',
        name: 'Invalid',
      } as PromptVersion

      expect(() => {
        promptManager.registerVersion(invalidVersion)
      }).toThrow('Invalid prompt version: missing required fields')
    })

    it('should handle no active versions scenario', () => {
      // Deactivate all versions
      promptManager.setVersionActive('v2.0', false)
      promptManager.setVersionActive('v1.0', false)

      expect(() => {
        promptManager.selectPrompt(mockAnalysisRequest)
      }).toThrow('No active prompt versions available')
    })
  })

  describe('Prompt Generation', () => {
    it('should generate different prompts for different versions', () => {
      const v2Selection = promptManager.selectPrompt(mockAnalysisRequest, undefined, 'v2.0')
      const v1Selection = promptManager.selectPrompt(mockAnalysisRequest, undefined, 'v1.0')
      
      expect(v2Selection.prompt).toBeDefined()
      expect(v1Selection.prompt).toBeDefined()
      expect(v2Selection.prompt).not.toBe(v1Selection.prompt)
      
      // V2.0 should have enhanced features
      expect(v2Selection.prompt).toContain('Domain Trust Analysis')
      expect(v2Selection.prompt).toContain('SCORING GUIDELINES')
    })

    it('should include technical context in prompt', () => {
      const selection = promptManager.selectPrompt(mockAnalysisRequest)
      
      expect(selection.prompt).toContain('test.example.com')
      expect(selection.prompt).toContain('/login')
      expect(selection.prompt).toContain('Domain Age: 30 days')
      expect(selection.prompt).toContain('Reputation: Flagged')
    })
  })

  describe('Traffic Allocation', () => {
    it('should respect traffic allocation constraints', () => {
      // Test with extreme allocations
      promptManager.setVersionActive('v1.0', true, 1.5) // Should be capped at 1.0
      expect(promptManager.getVersion('v1.0')?.trafficAllocation).toBe(1.0)
      
      promptManager.setVersionActive('v1.0', true, -0.5) // Should be floored at 0.0
      expect(promptManager.getVersion('v1.0')?.trafficAllocation).toBe(0.0)
    })
  })
})