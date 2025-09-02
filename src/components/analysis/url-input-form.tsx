'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

// Comprehensive Zod schema following implementation plan
const formSchema = z.object({
  url: z.string()
    .min(1, 'URL is required')
    .transform((val) => {
      // Auto-add protocol if missing
      if (!val.startsWith('http://') && !val.startsWith('https://')) {
        return 'https://' + val
      }
      return val
    })
    .pipe(
      z.string().url('Please enter a valid URL')
    )
    .refine((url) => {
      try {
        const parsed = new URL(url)
        return ['http:', 'https:'].includes(parsed.protocol)
      } catch {
        return false
      }
    }, 'URL must start with http:// or https://')
    .refine((url) => {
      // Check for malicious patterns - basic implementation
      const maliciousPatterns = [
        /javascript:/i,
        /vbscript:/i,
        /data:/i,
        /<script/i,
        /onload=/i,
        /onerror=/i,
      ]
      return !maliciousPatterns.some(pattern => pattern.test(url))
    }, 'URL contains potentially malicious content')
})

interface UrlInputFormProps {
  onSubmit: (url: string) => Promise<void>
  disabled?: boolean
  className?: string
  initialValue?: string
  autoFocus?: boolean
}

export function UrlInputForm({
  onSubmit,
  disabled = false,
  className,
  initialValue = '',
  autoFocus = true,
}: UrlInputFormProps) {
  const { showToast } = useToast()
  
  // Setup react-hook-form with Zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      url: initialValue 
    },
    mode: 'onChange', // Real-time validation
    reValidateMode: 'onChange',
    criteriaMode: 'all' // Show all errors
  })

  // Handle form submission with comprehensive error handling
  const handleSubmit = React.useCallback(async (data: z.infer<typeof formSchema>) => {
    try {
      // Add timeout for slow connections
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000)
      )
      
      await Promise.race([
        onSubmit(data.url),
        timeoutPromise
      ])
      
      // Show success feedback
      showToast('Analysis complete!', 'success')
      form.reset() // Reset form to initial state
      
    } catch (error: unknown) {
      // Comprehensive error handling
      let errorMessage = 'An unexpected error occurred.'
      
      if (error instanceof Error) {
        if (error.message === 'Request timed out after 30 seconds') {
          errorMessage = 'Request timed out. Please try again.'
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Check your connection.'
        } else {
          errorMessage = error.message
        }
      }
      
      // Set form error and show toast
      form.setError('url', {
        type: 'manual',
        message: errorMessage
      })
      
      showToast(errorMessage, 'error')
      
      // Focus URL input field on error
      const urlInput = document.querySelector('input[name="url"]') as HTMLInputElement
      if (urlInput) {
        urlInput.focus()
      }
    }
  }, [onSubmit, showToast, form])

  // Enhanced state management with unified validation tracking
  const watchedUrl = form.watch('url')
  const [formState, setFormState] = React.useState({
    url: initialValue,
    normalizedUrl: initialValue,
    validationState: 'idle' as 'idle' | 'validating' | 'valid' | 'invalid',
    validationTimestamp: 0,
    error: null as string | null,
    isSubmitting: false,
  })

  // Sync form state on mount to eliminate race conditions
  React.useEffect(() => {
    const currentUrl = form.getValues('url')
    setFormState(prev => ({
      ...prev,
      url: currentUrl,
      normalizedUrl: currentUrl.startsWith('http') ? currentUrl : `https://${currentUrl}`,
    }))
  }, [form])

  // Enhanced debounced validation with 300ms timing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (watchedUrl) {
        setFormState(prev => ({ ...prev, validationState: 'validating' }))
        
        // Normalize URL for display
        const normalizedUrl = watchedUrl.startsWith('http') ? watchedUrl : `https://${watchedUrl}`
        
        // Trigger validation
        form.trigger('url').then((isValid) => {
          setFormState(prev => ({
            ...prev,
            url: watchedUrl,
            normalizedUrl,
            validationState: isValid ? 'valid' : 'invalid',
            validationTimestamp: Date.now(),
            error: isValid ? null : 'Please enter a valid URL',
          }))
          
          // If valid and we normalized the URL (added protocol), update the input field
          // This ensures browser native validation passes for form submission
          if (isValid && normalizedUrl !== watchedUrl) {
            form.setValue('url', normalizedUrl, { 
              shouldValidate: false, // Don't retrigger validation
              shouldDirty: true 
            })
          }
        })
      } else {
        setFormState(prev => ({ 
          ...prev, 
          validationState: 'idle',
          error: null,
        }))
      }
    }, 300) // Increased to 300ms for better UX

    return () => clearTimeout(timer)
  }, [watchedUrl, form])

  // Derived state from single source of truth
  const isSubmitting = form.formState.isSubmitting || formState.isSubmitting
  const isButtonEnabled = React.useMemo(() => {
    return formState.validationState === 'valid' && 
           !isSubmitting &&
           formState.url.length > 0
  }, [formState, isSubmitting])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target === document.activeElement) {
        if (event.key === 'Enter' && isButtonEnabled) {
          form.handleSubmit(handleSubmit)()
        } else if (event.key === 'Escape') {
          form.reset()
          const urlInput = document.querySelector('input[name="url"]') as HTMLInputElement
          if (urlInput) {
            urlInput.blur()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [form, handleSubmit, isButtonEnabled])

  // Debug utilities (development only) - Fixed hydration issue
  const isDebugMode = process.env.NODE_ENV === 'development'
  const [debugTimestamp, setDebugTimestamp] = React.useState<string>('--')
  
  // Update timestamp only on client-side to avoid hydration mismatch
  React.useEffect(() => {
    if (isDebugMode) {
      setDebugTimestamp(new Date().toISOString())
    }
  }, [formState.validationTimestamp, isDebugMode])
  
  const debugInfo = React.useMemo(() => ({
    formState: formState,
    reactHookFormState: {
      isValid: form.formState.isValid,
      isSubmitting: form.formState.isSubmitting,
      errors: form.formState.errors,
      touchedFields: form.formState.touchedFields,
      dirtyFields: form.formState.dirtyFields,
    },
    watchedUrl,
    isButtonEnabled,
    timestamp: debugTimestamp,
  }), [formState, form.formState, watchedUrl, isButtonEnabled, debugTimestamp])

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          URL Analysis
        </CardTitle>
        <CardDescription>
          Enter a URL to check for potential security risks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL to Analyze</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value
                          // Update form field
                          field.onChange(e)
                          
                          // Early protocol normalization for better UX
                          const normalizedUrl = value && !value.startsWith('http') 
                            ? `https://${value}` 
                            : value
                          
                          // Update our internal state immediately for visual feedback
                          setFormState(prev => ({
                            ...prev,
                            url: value,
                            normalizedUrl,
                          }))
                        }}
                        type="url"
                        inputMode="url"
                        autoComplete="url"
                        autoCapitalize="none"
                        spellCheck="false"
                        placeholder="https://example.com"
                        disabled={disabled || isSubmitting}
                        autoFocus={autoFocus} // eslint-disable-line jsx-a11y/no-autofocus
                        className={cn(
                          'pr-24 h-12 text-base',
                          formState.validationState === 'valid' && 'border-green-500 focus-visible:ring-green-500',
                          formState.validationState === 'invalid' && 'border-destructive focus-visible:ring-destructive',
                          formState.validationState === 'validating' && 'border-blue-500 focus-visible:ring-blue-500'
                        )}
                        aria-describedby="url-description url-error"
                      />
                      <Button
                        type="submit"
                        disabled={disabled || !isButtonEnabled}
                        className={cn(
                          'absolute right-0 top-0 h-12 px-4',
                          'min-w-[80px]' // Ensure consistent width
                        )}
                        size="sm"
                      >
                        {isSubmitting ? (
                          <>
                            <Spinner className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Analyzing...</span>
                            <span className="sm:hidden">...</span>
                          </>
                        ) : (
                          'Analyze'
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription id="url-description">
                    Enter a URL to check for potential security risks
                  </FormDescription>
                  
                  {/* Show transformation feedback */}
                  {formState.url !== formState.normalizedUrl && formState.url && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Will analyze: <code className="text-blue-600">{formState.normalizedUrl}</code>
                    </div>
                  )}
                  
                  {/* Show validation state */}
                  {formState.validationState === 'validating' && (
                    <div className="mt-1 text-xs text-blue-600">
                      Validating URL...
                    </div>
                  )}
                  <FormMessage id="url-error" role="alert" />
                </FormItem>
              )}
            />
          </form>
        </Form>
        
        {/* Debug Panel - Development Only */}
        {isDebugMode && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Debug Information</h4>
            <div className="space-y-2 text-xs font-mono text-gray-700 dark:text-gray-300">
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Validation State:</strong> {formState.validationState}
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Button Enabled:</strong> {isButtonEnabled ? 'Yes' : 'No'}
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Current URL:</strong> {formState.url || '(empty)'}
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Normalized URL:</strong> {formState.normalizedUrl || '(empty)'}
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Validation Timestamp:</strong> {formState.validationTimestamp ? new Date(formState.validationTimestamp).toLocaleTimeString() : 'Never'}
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Form Valid:</strong> {form.formState.isValid ? 'Yes' : 'No'}
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Submitting:</strong> {isSubmitting ? 'Yes' : 'No'}
              </div>
              {formState.error && (
                <div>
                  <strong className="text-gray-900 dark:text-gray-100">Error:</strong> {formState.error}
                </div>
              )}
              <details className="mt-2">
                <summary className="cursor-pointer text-gray-900 dark:text-gray-100">Full Debug Data</summary>
                <pre className="mt-2 text-xs overflow-auto max-h-40 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-600">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}