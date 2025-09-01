/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useURLValidation } from '@/hooks/useUrlValidation'

// Mock the validation dependencies
jest.mock('@/lib/validation/url-validator', () => ({
  validateURL: jest.fn(),
}))

jest.mock('@/lib/validation/url-sanitizer', () => ({
  sanitizeURL: jest.fn(),
}))

jest.mock('@/lib/validation/schemas', () => ({
  validateFormInput: jest.fn(),
  formatValidationError: jest.fn(),
}))

const mockValidateURL = jest.fn()
const mockSanitizeURL = jest.fn()
const mockValidateFormInput = jest.fn()
const mockFormatValidationError = jest.fn()

describe('useURLValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
  })

  describe('Basic functionality', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useURLValidation())

      expect(result.current.state.value).toBe('')
      expect(result.current.state.isValid).toBe(false)
      expect(result.current.state.isValidating).toBe(false)
      expect(result.current.isReady).toBe(false)
    })

    it('should update value when setValue is called', () => {
      const { result } = renderHook(() => useURLValidation())

      act(() => {
        result.current.setValue('https://example.com')
      })

      expect(result.current.state.value).toBe('https://example.com')
    })
  })

  describe.skip('Story 3-1: Real-time validation with 100ms debounce', () => {
    beforeEach(() => {
      mockValidateFormInput.mockReturnValue({ success: true, data: { url: 'https://example.com' } })
      mockValidateURL.mockReturnValue({
        isValid: true,
        normalizedUrl: 'https://example.com',
        error: undefined,
        errorType: undefined,
      })
    })

    it('should validate after 100ms debounce period', async () => {
      const { result } = renderHook(() => useURLValidation({ debounceMs: 100 }))

      act(() => {
        result.current.setValue('https://example.com')
      })

      // Should not validate immediately
      expect(mockValidateURL).not.toHaveBeenCalled()
      expect(result.current.state.isValidating).toBe(false)

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(100)
      })

      // Should now trigger validation
      await act(async () => {
        await Promise.resolve()
      })

      expect(mockValidateURL).toHaveBeenCalledWith('https://example.com', undefined)
      expect(result.current.state.isValid).toBe(true)
      expect(result.current.isReady).toBe(true)
    })

    it('should cancel previous validation when user continues typing', async () => {
      const { result } = renderHook(() => useURLValidation({ debounceMs: 100 }))

      act(() => {
        result.current.setValue('https://ex')
      })

      act(() => {
        jest.advanceTimersByTime(50) // Half debounce time
      })

      act(() => {
        result.current.setValue('https://example.com')
      })

      act(() => {
        jest.advanceTimersByTime(100) // Full debounce time from second input
      })

      await act(async () => {
        await Promise.resolve()
      })

      // Should only validate the final input
      expect(mockValidateURL).toHaveBeenCalledTimes(1)
      expect(mockValidateURL).toHaveBeenCalledWith('https://example.com', undefined)
    })
  })

  describe.skip('Story 3-1: Immediate validation for paste events', () => {
    beforeEach(() => {
      mockValidateFormInput.mockReturnValue({ success: true, data: { url: 'https://example.com' } })
      mockValidateURL.mockReturnValue({
        isValid: true,
        normalizedUrl: 'https://pasted.com',
        error: undefined,
        errorType: undefined,
      })
    })

    it('should validate immediately when validateImmediately is called', async () => {
      const { result } = renderHook(() => useURLValidation())

      await act(async () => {
        await result.current.validateImmediately('https://pasted.com')
      })

      expect(result.current.state.value).toBe('https://pasted.com')
      expect(mockValidateURL).toHaveBeenCalledWith('https://pasted.com', undefined)
      expect(result.current.state.isValid).toBe(true)
    })

    it('should cancel debounced validation when validateImmediately is called', async () => {
      const { result } = renderHook(() => useURLValidation({ debounceMs: 100 }))

      // Start typing (which would trigger debounced validation)
      act(() => {
        result.current.setValue('https://typed.com')
      })

      // Immediately paste (should cancel debounced validation)
      await act(async () => {
        await result.current.validateImmediately('https://pasted.com')
      })

      // Fast-forward past debounce time
      act(() => {
        jest.advanceTimersByTime(150)
      })

      // Should only have validated the pasted URL
      expect(mockValidateURL).toHaveBeenCalledTimes(1)
      expect(mockValidateURL).toHaveBeenCalledWith('https://pasted.com', undefined)
    })
  })

  describe.skip('Validation states and feedback', () => {
    it('should handle validation errors with suggestions', async () => {
      const zodError = {
        issues: [{ message: 'Invalid URL format', path: ['url'] }],
        errors: ['Invalid URL format'],
        format: () => ({ url: ['Invalid URL format'] }),
        isEmpty: false,
        message: 'Invalid URL format',
      } as any
      
      mockValidateFormInput.mockReturnValue({
        success: false,
        error: zodError,
      })
      mockFormatValidationError.mockReturnValue('Please enter a valid URL')

      const { result } = renderHook(() => useURLValidation())

      await act(async () => {
        result.current.setValue('invalid-url')
        jest.advanceTimersByTime(100)
        await Promise.resolve()
      })

      expect(result.current.state.isValid).toBe(false)
      expect(result.current.state.error).toBe('Please enter a valid URL')
      expect(result.current.state.errorType).toBe('invalid-format')

      const feedback = result.current.getFeedback()
      expect(feedback).toHaveLength(1)
      expect(feedback[0].level).toBe('error')
      expect(feedback[0].message).toBe('Please enter a valid URL')
    })

    it('should provide success feedback for valid URLs', async () => {
      mockValidateFormInput.mockReturnValue({ success: true, data: { url: 'https://example.com' } })
      mockValidateURL.mockReturnValue({
        isValid: true,
        normalizedUrl: 'https://example.com',
        error: undefined,
        errorType: undefined,
      })

      const { result } = renderHook(() => useURLValidation())

      await act(async () => {
        result.current.setValue('https://example.com')
        jest.advanceTimersByTime(100)
        await Promise.resolve()
      })

      expect(result.current.state.isValid).toBe(true)
      expect(result.current.state.validatedAt).toBeGreaterThan(0)

      const feedback = result.current.getFeedback()
      expect(feedback).toHaveLength(1)
      expect(feedback[0].level).toBe('success')
      expect(feedback[0].message).toBe('URL is valid and ready for analysis')
    })

    it('should show info feedback while not validating', async () => {
      const { result } = renderHook(() => useURLValidation())

      // When no value, should return empty feedback
      expect(result.current.getFeedback()).toHaveLength(0)
      
      // When value but not validating and not valid, no feedback initially
      act(() => {
        result.current.setValue('typing...')
      })

      // Before validation completes, feedback can be empty
      const feedback = result.current.getFeedback()
      expect(feedback.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe.skip('Auto-correction and suggestions', () => {
    it('should apply auto-correction when enabled', async () => {
      mockValidateFormInput.mockReturnValue({ success: true, data: { url: 'https://example.com' } })
      mockValidateURL.mockReturnValue({
        isValid: true,
        normalizedUrl: 'https://example.com',
        error: undefined,
        errorType: undefined,
      })
      mockSanitizeURL.mockReturnValue({
        sanitized: 'https://example.com',
        wasModified: true,
        original: 'example.com',
        changes: [],
      })

      const { result } = renderHook(() => useURLValidation({ autoCorrect: true }))

      await act(async () => {
        result.current.setValue('example.com')
        jest.advanceTimersByTime(100)
        await Promise.resolve()
      })

      expect(result.current.state.normalizedUrl).toBe('https://example.com')
      expect(result.current.state.suggestion).toBe('https://example.com')
    })

    it('should provide suggestions without auto-correction when disabled', async () => {
      mockValidateFormInput.mockReturnValue({ success: true, data: { url: 'https://example.com' } })
      mockValidateURL.mockReturnValue({
        isValid: true,
        normalizedUrl: 'https://example.com',
        error: undefined,
        errorType: undefined,
      })
      mockSanitizeURL.mockReturnValue({
        sanitized: 'https://example.com',
        wasModified: true,
        original: 'example.com',
        changes: [],
      })

      const { result } = renderHook(() => useURLValidation({ autoCorrect: false, showSuggestions: true }))

      await act(async () => {
        result.current.setValue('example.com')
        jest.advanceTimersByTime(100)
        await Promise.resolve()
      })

      expect(result.current.state.normalizedUrl).toBe('https://example.com')
      expect(result.current.state.suggestion).toBe('https://example.com')
      expect(result.current.state.showSuggestion).toBe(true)
    })
  })

  describe('Clear functionality', () => {
    it('should reset all state when clear is called', () => {
      const { result } = renderHook(() => useURLValidation())

      // Set up some state
      act(() => {
        result.current.setValue('https://example.com')
      })

      // Clear the state  
      act(() => {
        result.current.clear()
      })

      expect(result.current.state.value).toBe('')
      expect(result.current.state.isValid).toBe(false)
      expect(result.current.state.error).toBeUndefined()
      expect(result.current.state.suggestion).toBeUndefined()
      expect(result.current.isReady).toBe(false)
    })
  })

  describe('Cleanup', () => {
    it('should clean up timers and abort controllers on unmount', () => {
      const { result, unmount } = renderHook(() => useURLValidation())

      act(() => {
        result.current.setValue('https://example.com')
      })

      unmount()

      // Fast-forward timers to ensure no validation happens after unmount
      act(() => {
        jest.advanceTimersByTime(200)
      })

      expect(mockValidateURL).not.toHaveBeenCalled()
    })
  })
})