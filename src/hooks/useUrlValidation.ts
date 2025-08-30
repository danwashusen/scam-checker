import { useState, useEffect, useCallback, useRef } from 'react'
import { validateURL } from '../lib/validation/url-validator'
import { sanitizeURL } from '../lib/validation/url-sanitizer'
import { validateFormInput, formatValidationError } from '../lib/validation/schemas'
import type { URLInputState, URLValidationFeedback, URLValidationOptions, SanitizationOptions } from '../types/url'

export interface UseURLValidationOptions {
  validation?: URLValidationOptions
  sanitization?: SanitizationOptions
  debounceMs?: number
  validateOnChange?: boolean
  showSuggestions?: boolean
  autoCorrect?: boolean
}

export interface UseURLValidationReturn {
  state: URLInputState
  setValue: (value: string) => void
  validate: () => Promise<void>
  clear: () => void
  getFeedback: () => URLValidationFeedback[]
  isReady: boolean
}

const DEFAULT_OPTIONS: UseURLValidationOptions = {
  debounceMs: 300,
  validateOnChange: true,
  showSuggestions: true,
  autoCorrect: false,
}

/**
 * Hook for managing URL validation state with real-time feedback
 */
export function useURLValidation(options: UseURLValidationOptions = {}): UseURLValidationReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const validationRef = useRef<AbortController | null>(null)

  const [state, setState] = useState<URLInputState>({
    value: '',
    isValid: false,
    isValidating: false,
    error: undefined,
    errorType: undefined,
    normalizedUrl: undefined,
    showSuggestion: false,
    suggestion: undefined,
  })

  // Clear any pending validation when component unmounts
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (validationRef.current) {
        validationRef.current.abort()
      }
    }
  }, [])

  const performValidation = useCallback(async (value: string): Promise<void> => {
    if (!value.trim()) {
      setState(prev => ({
        ...prev,
        isValid: false,
        isValidating: false,
        error: undefined,
        errorType: undefined,
        normalizedUrl: undefined,
        showSuggestion: false,
        suggestion: undefined,
      }))
      return
    }

    setState(prev => ({ ...prev, isValidating: true }))

    try {
      // Abort any previous validation
      if (validationRef.current) {
        validationRef.current.abort()
      }

      validationRef.current = new AbortController()

      // First, try form validation for better UX
      const formValidation = validateFormInput({ url: value })
      
      if (!formValidation.success) {
        const errorMessage = formatValidationError(formValidation.error)
        setState(prev => ({
          ...prev,
          isValid: false,
          isValidating: false,
          error: errorMessage,
          errorType: 'invalid-format',
          suggestion: generateSuggestion(value, errorMessage),
          showSuggestion: opts.showSuggestions,
        }))
        return
      }

      // Perform comprehensive validation
      const validationResult = validateURL(value, opts.validation)

      if (!validationResult.isValid) {
        setState(prev => ({
          ...prev,
          isValid: false,
          isValidating: false,
          error: validationResult.error,
          errorType: validationResult.errorType,
          suggestion: generateSuggestion(value, validationResult.error),
          showSuggestion: opts.showSuggestions,
        }))
        return
      }

      // URL is valid - perform sanitization if needed
      let finalUrl = validationResult.normalizedUrl || value
      let suggestion: string | undefined

      if (opts.sanitization || opts.autoCorrect) {
        const sanitizationResult = sanitizeURL(finalUrl, opts.sanitization)
        
        if (sanitizationResult.wasModified) {
          suggestion = sanitizationResult.sanitized
          if (opts.autoCorrect) {
            finalUrl = sanitizationResult.sanitized
          }
        }
      }

      setState(prev => ({
        ...prev,
        isValid: true,
        isValidating: false,
        error: undefined,
        errorType: undefined,
        normalizedUrl: finalUrl,
        suggestion,
        showSuggestion: opts.showSuggestions && !!suggestion,
      }))
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // Validation was cancelled
      }

      setState(prev => ({
        ...prev,
        isValid: false,
        isValidating: false,
        error: 'Validation failed unexpectedly',
        errorType: 'invalid-format',
        suggestion: undefined,
        showSuggestion: false,
      }))
    }
  }, [opts.validation, opts.sanitization, opts.showSuggestions, opts.autoCorrect])

  const setValue = useCallback((value: string) => {
    setState(prev => ({ ...prev, value }))

    if (opts.validateOnChange) {
      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      // Set new debounce
      debounceRef.current = setTimeout(() => {
        performValidation(value)
      }, opts.debounceMs)
    }
  }, [performValidation, opts.validateOnChange, opts.debounceMs])

  const validate = useCallback(async () => {
    await performValidation(state.value)
  }, [performValidation, state.value])

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (validationRef.current) {
      validationRef.current.abort()
    }

    setState({
      value: '',
      isValid: false,
      isValidating: false,
      error: undefined,
      errorType: undefined,
      normalizedUrl: undefined,
      showSuggestion: false,
      suggestion: undefined,
    })
  }, [])

  const getFeedback = useCallback((): URLValidationFeedback[] => {
    const feedback: URLValidationFeedback[] = []

    if (!state.value.trim()) {
      return feedback
    }

    if (state.isValidating) {
      feedback.push({
        level: 'info',
        message: 'Validating URL...',
      })
      return feedback
    }

    if (state.error) {
      feedback.push({
        level: 'error',
        message: state.error,
        suggestion: state.suggestion,
        action: state.suggestion ? {
          label: 'Use suggestion',
          onClick: () => setValue(state.suggestion!),
        } : undefined,
      })
    } else if (state.isValid) {
      feedback.push({
        level: 'success',
        message: 'URL is valid and ready for analysis',
      })

      if (state.suggestion && state.showSuggestion) {
        feedback.push({
          level: 'info',
          message: 'URL can be optimized',
          suggestion: state.suggestion,
          action: {
            label: 'Apply optimization',
            onClick: () => setValue(state.suggestion!),
          },
        })
      }
    }

    return feedback
  }, [state, setValue])

  const isReady = state.isValid && !state.isValidating

  return {
    state,
    setValue,
    validate,
    clear,
    getFeedback,
    isReady,
  }
}

/**
 * Generates helpful suggestions based on common URL input errors
 */
function generateSuggestion(input: string, error?: string): string | undefined {
  const trimmed = input.trim().toLowerCase()

  // No protocol - suggest adding https
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    if (trimmed.includes('.')) {
      return `https://${trimmed}`
    }
  }

  // Common domain typos
  const domainCorrections: Record<string, string> = {
    'gooogle.com': 'google.com',
    'googel.com': 'google.com',
    'yahooo.com': 'yahoo.com',
    'facebok.com': 'facebook.com',
    'twittr.com': 'twitter.com',
    'amazoon.com': 'amazon.com',
    'microsft.com': 'microsoft.com',
    'githb.com': 'github.com',
    'stackoverfow.com': 'stackoverflow.com',
  }

  for (const [typo, correct] of Object.entries(domainCorrections)) {
    if (trimmed.includes(typo)) {
      const corrected = trimmed.replace(typo, correct)
      return corrected.startsWith('http') ? corrected : `https://${corrected}`
    }
  }

  // HTTP instead of HTTPS suggestion
  if (trimmed.startsWith('http://') && error?.includes('protocol')) {
    return trimmed.replace('http://', 'https://')
  }

  // Missing TLD
  if (!trimmed.includes('.') && !trimmed.includes('localhost')) {
    return `https://${trimmed}.com`
  }

  // Common spacing issues
  if (trimmed.includes(' ')) {
    const fixed = trimmed.replace(/\s+/g, '')
    return fixed.startsWith('http') ? fixed : `https://${fixed}`
  }

  return undefined
}

/**
 * Hook for batch URL validation
 */
export function useBatchURLValidation(options: UseURLValidationOptions = {}) {
  const [urls, setUrls] = useState<string[]>([])
  const [results, setResults] = useState<Map<string, URLInputState>>(new Map())
  const [isValidating, setIsValidating] = useState(false)

  const validateBatch = useCallback(async (urlList: string[]) => {
    setUrls(urlList)
    setIsValidating(true)
    setResults(new Map())

    const validationPromises = urlList.map(async (url, index) => {
      try {
        const validationResult = validateURL(url, options.validation)
        return {
          url,
          index,
          result: {
            value: url,
            isValid: validationResult.isValid,
            isValidating: false,
            error: validationResult.error,
            errorType: validationResult.errorType,
            normalizedUrl: validationResult.normalizedUrl,
          } as URLInputState,
        }
      } catch {
        return {
          url,
          index,
          result: {
            value: url,
            isValid: false,
            isValidating: false,
            error: 'Validation failed',
            errorType: 'invalid-format' as const,
          } as URLInputState,
        }
      }
    })

    const validationResults = await Promise.all(validationPromises)
    
    const resultMap = new Map<string, URLInputState>()
    validationResults.forEach(({ url, result }) => {
      resultMap.set(url, result)
    })

    setResults(resultMap)
    setIsValidating(false)
  }, [options.validation])

  const getValidUrls = useCallback(() => {
    return Array.from(results.entries())
      .filter(([, result]) => result.isValid)
      .map(([url]) => url)
  }, [results])

  const getInvalidUrls = useCallback(() => {
    return Array.from(results.entries())
      .filter(([, result]) => !result.isValid)
      .map(([url, result]) => ({ url, error: result.error }))
  }, [results])

  return {
    urls,
    results,
    isValidating,
    validateBatch,
    getValidUrls,
    getInvalidUrls,
    totalCount: urls.length,
    validCount: getValidUrls().length,
    invalidCount: getInvalidUrls().length,
  }
}