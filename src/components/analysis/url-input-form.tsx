'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, Search, CheckCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useURLValidation } from '@/hooks/useUrlValidation'
import { useToast } from '@/components/ui/toast'

// Story 3-1: Enhanced props for improved UX - Made onSubmit required per James's feedback
interface UrlInputFormProps {
  onSubmit: (url: string) => Promise<void>  // Story 3-1: Required - no more stub behavior
  disabled?: boolean
  initialValue?: string
  autoFocus?: boolean        // Story 3-1: Auto-focus on mount
  showSuggestions?: boolean   // Story 3-1: Show auto-correction suggestions
  autoCorrect?: boolean       // Story 3-1: Apply corrections automatically
  className?: string
  placeholder?: string
}

export function UrlInputForm({
  onSubmit,
  disabled = false,
  initialValue = '',
  autoFocus = true,           // Story 3-1: Default to auto-focus
  showSuggestions = true,     // Story 3-1: Show suggestions by default
  autoCorrect = false,        // Story 3-1: Manual correction by default
  placeholder = 'Enter a URL to analyze (e.g., https://example.com)',
  className,
}: UrlInputFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { showToast } = useToast()
  
  // Story 3-1: Use enhanced validation hook
  const {
    state,
    setValue,
    validateImmediately,
    clear,
    getFeedback,
    isReady
  } = useURLValidation({
    debounceMs: 100,
    validateOnChange: true,
    showSuggestions,
    autoCorrect,
  })
  
  // Story 3-1: Initialize with initial value
  React.useEffect(() => {
    if (initialValue) {
      setValue(initialValue)
    }
  }, [initialValue, setValue])

  // Story 3-1: Enhanced form submission with validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!state.value.trim()) {
      return
    }

    if (!isReady) {
      return
    }
    
    const normalizedUrl = state.normalizedUrl || state.value
    setIsSubmitting(true)

    try {
      // Story 3-1: Direct API integration - no more stub behavior
      await onSubmit(normalizedUrl)
      clear() // Clear form on success
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'An error occurred', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Story 3-1: Handle input change with real-time validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
  }
  
  // Story 3-1: Handle paste events with immediate validation
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    await validateImmediately(pastedText)
  }
  
  // Story 3-1: Determine visual state based on validation
  const getVisualState = () => {
    if (!state.value) return 'default'
    if (state.isValidating) return 'validating'
    if (state.isValid) return 'valid'
    if (state.error) return 'invalid'
    return 'default'
  }
  
  const visualState = getVisualState()
  const feedback = getFeedback()

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          URL Analysis
        </CardTitle>
        <CardDescription>
          Enter a URL to check for potential scams and security risks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Input
                type="url"
                inputMode="url"      // Story 3-1: Mobile keyboard optimization
                autoComplete="url"   // Story 3-1: Browser autocomplete
                autoCapitalize="none" // Story 3-1: Prevent auto-capitalization
                spellCheck="false"   // Story 3-1: Disable spell check for URLs
                value={state.value}
                onChange={handleInputChange}
                onPaste={handlePaste}
                placeholder={placeholder}
                disabled={disabled || isSubmitting}
                autoFocus={autoFocus} // eslint-disable-line jsx-a11y/no-autofocus -- Story 3-1 requirement
                aria-invalid={visualState === 'invalid'}
                aria-describedby={feedback.length > 0 ? 'url-feedback' : undefined}
                className={cn(
                  'w-full pr-20 h-12 text-base', // Story 3-1: 16px font to prevent iOS zoom, 48px min height
                  visualState === 'valid' && 'border-green-500 focus-visible:ring-green-500',
                  visualState === 'invalid' && 'border-destructive focus-visible:ring-destructive',
                  visualState === 'validating' && 'border-blue-500 focus-visible:ring-blue-500'
                )}
              />
              
              {/* Story 3-1: Visual feedback icons */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {state.isValidating && (
                  <Spinner size="sm" className="text-blue-500" />
                )}
                {visualState === 'valid' && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {visualState === 'invalid' && (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                {state.value && (
                  <button
                    type="button"
                    onClick={clear}
                    className="p-2 hover:bg-gray-100 rounded min-w-[44px] min-h-[44px] flex items-center justify-center" // Story 3-1: 44px minimum touch target
                    aria-label="Clear URL input"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Story 3-1: Enhanced feedback messages with accessibility */}
            {feedback.length > 0 && (
              <div id="url-feedback" role="status" aria-live={feedback.some(f => f.level === 'error') ? 'assertive' : 'polite'}>
                {feedback.map((item, index) => (
                  <div key={index} className={cn(
                    'flex items-start gap-2 text-sm p-3 rounded-md', // Story 3-1: Better touch targets with padding
                    item.level === 'error' && 'text-destructive bg-destructive/10',
                    item.level === 'success' && 'text-green-600 bg-green-50',
                    item.level === 'info' && 'text-blue-600 bg-blue-50',
                    item.level === 'warning' && 'text-yellow-600 bg-yellow-50'
                  )}>
                    {item.level === 'error' && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    {item.level === 'success' && <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <p>{item.message}</p>
                      {item.suggestion && (
                        <p className="mt-1">
                          Suggestion: <span className="font-medium">{item.suggestion}</span>
                          {item.action && (
                            <button
                              type="button"
                              onClick={item.action.onClick}
                              className="ml-2 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 min-h-[44px] inline-flex items-center" // Story 3-1: Accessibility focus styles
                              aria-label={`Apply suggestion: ${item.suggestion}`}
                            >
                              {item.action.label}
                            </button>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full min-h-[48px] text-base" // Story 3-1: 48px minimum height, larger text
            disabled={disabled || isSubmitting || !isReady}
            aria-describedby={!isReady && state.error ? 'url-feedback' : undefined}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="mr-2" aria-hidden="true" />
                <span>Analyzing URL...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>Analyze URL</span>
              </>
            )}
          </Button>

        </form>
      </CardContent>
    </Card>
  )
}