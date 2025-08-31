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

  // Real-time validation feedback with debouncing
  const watchedUrl = form.watch('url')
  const [debouncedUrl, setDebouncedUrl] = React.useState(watchedUrl)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUrl(watchedUrl)
    }, 100) // 100ms debounce

    return () => clearTimeout(timer)
  }, [watchedUrl])

  // Trigger validation when debounced value changes
  React.useEffect(() => {
    if (debouncedUrl && debouncedUrl !== form.getValues('url')) {
      form.trigger('url')
    }
  }, [debouncedUrl, form])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target === document.activeElement) {
        if (event.key === 'Enter' && form.formState.isValid) {
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
  }, [form, handleSubmit])

  const isSubmitting = form.formState.isSubmitting
  const hasErrors = Object.keys(form.formState.errors).length > 0
  const isValid = form.formState.isValid && watchedUrl.length > 0

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
                          isValid && 'border-green-500 focus-visible:ring-green-500',
                          hasErrors && 'border-destructive focus-visible:ring-destructive'
                        )}
                        aria-describedby="url-description url-error"
                      />
                      <Button
                        type="submit"
                        disabled={disabled || isSubmitting || !isValid}
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
                  <FormMessage id="url-error" role="alert" />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}