/**
 * Unit tests for AI Service
 */

import { AIService } from '../../../../src/lib/analysis/ai-service'
import { AIProvider, AIErrorCode } from '../../../../src/types/ai'
import OpenAI from 'openai'

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  }
})

describe('AIService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockOpenAI: any
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Get the mocked OpenAI class
    const _MockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    }
    ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI)
  })

  describe('constructor', () => {
    it('should initialize OpenAI client with correct options', () => {
      const options = {
        provider: AIProvider.OPENAI,
        apiKey: 'test-api-key',
        model: 'gpt-4',
        timeout: 30000,
      }

      new AIService(options)

      expect(OpenAI as jest.MockedClass<typeof OpenAI>).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        timeout: 30000,
      })
    })

    it('should throw error for unsupported provider', () => {
      const options = {
        provider: AIProvider.CLAUDE,
        apiKey: 'test-api-key',
      }

      expect(() => new AIService(options)).toThrow('Claude provider not yet implemented')
    })
  })

  describe('analyzeText', () => {
    let aiService: AIService

    beforeEach(() => {
      aiService = new AIService({
        provider: AIProvider.OPENAI,
        apiKey: 'test-api-key',
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.1,
        timeout: 30000,
        retryAttempts: 2,
        costThreshold: 0.02,
      })
    })

    it('should successfully analyze text and return result', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"risk_score": 75, "confidence": 90, "scam_category": "phishing"}',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const result = await aiService.analyzeText('test prompt')

      expect(result.success).toBe(true)
      expect(result.data).toBe('{"risk_score": 75, "confidence": 90, "scam_category": "phishing"}')
      expect(result.fromCache).toBe(false)
      expect(result.metadata.tokenUsage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      })
      expect(result.metadata.cost).toBeGreaterThan(0)
    })

    it('should handle cost threshold exceeded', async () => {
      // Create service with very low cost threshold
      const lowCostService = new AIService({
        provider: AIProvider.OPENAI,
        apiKey: 'test-api-key',
        costThreshold: 0.0001, // Extremely low threshold
      })

      // Use a long prompt to ensure cost estimation is high enough
      const longPrompt = 'test prompt '.repeat(1000) // This will generate enough tokens to exceed threshold

      const result = await lowCostService.analyzeText(longPrompt)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(AIErrorCode.COST_THRESHOLD_EXCEEDED)
    })

    it('should retry on retryable errors', async () => {
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          choices: [{ message: { content: '{"result": "success"}' } }],
          usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 },
        })

      const result = await aiService.analyzeText('test prompt')

      expect(result.success).toBe(true)
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2)
    })

    it('should not retry on non-retryable errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('api_key invalid'))

      const result = await aiService.analyzeText('test prompt')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(AIErrorCode.API_KEY_INVALID)
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1)
    })

    it('should handle empty response content', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }],
        usage: null,
      })

      const result = await aiService.analyzeText('test prompt')

      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('No response content received from OpenAI')
    })

    it('should handle API errors correctly', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Rate limit exceeded'))

      const result = await aiService.analyzeText('test prompt')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(AIErrorCode.RATE_LIMIT_EXCEEDED)
    })

    it('should call OpenAI with correct parameters', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '{"result": "test"}' } }],
        usage: null,
      })

      await aiService.analyzeText('test prompt')

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'test prompt',
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })
    })
  })

  describe('getUsageStats', () => {
    it('should track usage statistics correctly', async () => {
      const aiService = new AIService({
        provider: AIProvider.OPENAI,
        apiKey: 'test-api-key',
        costThreshold: 1.0, // High threshold
      })

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '{"result": "test"}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      })

      // Make multiple requests
      await aiService.analyzeText('prompt 1')
      await aiService.analyzeText('prompt 2')

      const stats = aiService.getUsageStats()
      expect(stats.requestCount).toBe(2)
      expect(stats.totalCost).toBeGreaterThan(0)
      expect(stats.averageCost).toBe(stats.totalCost / 2)
    })

    it('should reset usage statistics', async () => {
      const aiService = new AIService({
        provider: AIProvider.OPENAI,
        apiKey: 'test-api-key',
      })

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '{"result": "test"}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      })

      await aiService.analyzeText('test prompt')
      
      let stats = aiService.getUsageStats()
      expect(stats.requestCount).toBe(1)

      aiService.resetUsageStats()
      
      stats = aiService.getUsageStats()
      expect(stats.requestCount).toBe(0)
      expect(stats.totalCost).toBe(0)
      expect(stats.averageCost).toBe(0)
    })
  })

  describe('error handling', () => {
    it('should map timeout errors correctly', async () => {
      const aiService = new AIService({
        provider: AIProvider.OPENAI,
        apiKey: 'test-api-key',
      })

      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Request timed out'))

      const result = await aiService.analyzeText('test prompt')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(AIErrorCode.TIMEOUT)
    })

    it('should handle unknown errors', async () => {
      const aiService = new AIService({
        provider: AIProvider.OPENAI,
        apiKey: 'test-api-key',
      })

      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Unknown error'))

      const result = await aiService.analyzeText('test prompt')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(AIErrorCode.UNKNOWN_ERROR)
    })

    it('should handle non-Error exceptions', async () => {
      const aiService = new AIService({
        provider: AIProvider.OPENAI,
        apiKey: 'test-api-key',
      })

      mockOpenAI.chat.completions.create.mockRejectedValue('string error')

      const result = await aiService.analyzeText('test prompt')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(AIErrorCode.UNKNOWN_ERROR)
    })
  })
})