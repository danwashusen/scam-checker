'use client'

import React, { useState } from 'react'
import { useURLValidation } from '../../hooks/useUrlValidation'
import type { URLValidationOptions, SanitizationOptions } from '../../types/url'

export interface UrlInputFormProps {
  onSubmit?: (url: string, normalizedUrl?: string) => void
  onValidationChange?: (isValid: boolean, url: string) => void
  placeholder?: string
  disabled?: boolean
  showAdvancedOptions?: boolean
  validationOptions?: URLValidationOptions
  sanitizationOptions?: SanitizationOptions
  className?: string
  autoFocus?: boolean
}

export function UrlInputForm({
  onSubmit,
  onValidationChange,
  placeholder = 'Enter a URL to analyze (e.g., https://example.com)',
  disabled = false,
  showAdvancedOptions = false,
  validationOptions,
  sanitizationOptions,
  className = '',
  autoFocus = false,
}: UrlInputFormProps) {
  const [showOptions, setShowOptions] = useState(false)
  
  const { state, setValue, validate, clear, getFeedback, isReady } = useURLValidation({
    validation: validationOptions,
    sanitization: sanitizationOptions,
    debounceMs: 300,
    validateOnChange: true,
    showSuggestions: true,
    autoCorrect: false,
  })

  const feedback = getFeedback()

  // Notify parent of validation changes
  React.useEffect(() => {
    onValidationChange?.(state.isValid, state.value)
  }, [state.isValid, state.value, onValidationChange])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isReady && onSubmit) {
      onSubmit(state.value, state.normalizedUrl)
    }
  }

  const handleClear = () => {
    clear()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isReady && onSubmit) {
        onSubmit(state.value, state.normalizedUrl)
      }
    }
  }

  // Determine input styling based on state
  const getInputClassName = () => {
    let baseClasses = 'w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:outline-none text-sm'
    
    if (disabled) {
      baseClasses += ' bg-gray-100 text-gray-500 cursor-not-allowed'
    } else if (state.isValidating) {
      baseClasses += ' border-blue-300 focus:border-blue-500 focus:ring-blue-200'
    } else if (state.error) {
      baseClasses += ' border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50'
    } else if (state.isValid) {
      baseClasses += ' border-green-300 focus:border-green-500 focus:ring-green-200 bg-green-50'
    } else {
      baseClasses += ' border-gray-300 focus:border-blue-500 focus:ring-blue-200'
    }

    return baseClasses
  }

  const getSubmitButtonClassName = () => {
    let baseClasses = 'px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2'
    
    if (disabled || !isReady) {
      baseClasses += ' bg-gray-300 text-gray-500 cursor-not-allowed'
    } else {
      baseClasses += ' bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-200 active:bg-blue-800'
    }

    return baseClasses
  }

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* URL Input Section */}
        <div className="relative">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={state.value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                className={getInputClassName()}
              />
              
              {/* Loading indicator */}
              {state.isValidating && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
              )}
              
              {/* Success indicator */}
              {state.isValid && !state.isValidating && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              
              {/* Error indicator */}
              {state.error && !state.isValidating && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Clear button */}
            {state.value && (
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled}
                className="px-3 py-3 text-gray-500 hover:text-gray-700 transition-colors duration-200 focus:outline-none"
                title="Clear input"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            {/* Submit button */}
            <button
              type="submit"
              disabled={disabled || !isReady}
              className={getSubmitButtonClassName()}
            >
              {state.isValidating ? 'Validating...' : 'Analyze URL'}
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {feedback.length > 0 && (
          <div className="space-y-2">
            {feedback.map((item, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                  item.level === 'error' 
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : item.level === 'warning'
                    ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                    : item.level === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {item.level === 'error' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {item.level === 'warning' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                  {item.level === 'success' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {item.level === 'info' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <p>{item.message}</p>
                  
                  {/* Suggestion */}
                  {item.suggestion && (
                    <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs font-mono border">
                      {item.suggestion}
                    </div>
                  )}
                  
                  {/* Action button */}
                  {item.action && (
                    <button
                      type="button"
                      onClick={item.action.onClick}
                      className="mt-2 text-xs font-medium underline hover:no-underline focus:outline-none"
                    >
                      {item.action.label}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Advanced Options Toggle */}
        {showAdvancedOptions && (
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200 focus:outline-none"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showOptions ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Advanced Validation Options
            </button>
            
            {showOptions && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Validation Settings</h4>
                    <div className="space-y-2 text-xs text-gray-600">
                      <p>• Protocol validation (HTTP/HTTPS)</p>
                      <p>• Domain format checking</p>
                      <p>• Security risk assessment</p>
                      <p>• Length constraints</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Sanitization Features</h4>
                    <div className="space-y-2 text-xs text-gray-600">
                      <p>• Tracking parameter removal</p>
                      <p>• URL normalization</p>
                      <p>• Protocol upgrades</p>
                      <p>• Encoding fixes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  )
}

// Additional helper component for displaying URL validation status
export interface UrlValidationStatusProps {
  isValid: boolean
  isValidating: boolean
  error?: string
  normalizedUrl?: string
  className?: string
}

export function UrlValidationStatus({
  isValid,
  isValidating,
  error,
  normalizedUrl,
  className = '',
}: UrlValidationStatusProps) {
  if (isValidating) {
    return (
      <div className={`flex items-center gap-2 text-sm text-blue-600 ${className}`}>
        <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        Validating URL...
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        {error}
      </div>
    )
  }

  if (isValid) {
    return (
      <div className={`text-sm text-green-600 ${className}`}>
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          URL is valid
        </div>
        {normalizedUrl && (
          <div className="ml-6 text-xs font-mono text-gray-600 bg-gray-100 p-2 rounded">
            {normalizedUrl}
          </div>
        )}
      </div>
    )
  }

  return null
}