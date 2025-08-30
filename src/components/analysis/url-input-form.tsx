'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateURL } from '@/lib/validation/url-validator'
import { useToast } from '@/components/ui/toast'

interface UrlInputFormProps {
  onSubmit?: (url: string) => Promise<void>
  disabled?: boolean
  initialValue?: string
  placeholder?: string
  className?: string
}

export function UrlInputForm({
  onSubmit,
  disabled = false,
  initialValue = '',
  placeholder = 'Enter a URL to analyze (e.g., https://example.com)',
  className,
}: UrlInputFormProps) {
  const [url, setUrl] = React.useState(initialValue)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    // Enhanced URL validation with security checks
    const validationResult = validateURL(url.trim(), {
      allowPrivateIPs: false,
      allowLocalhost: false,
      maxLength: 2083
    })
    
    if (!validationResult.isValid) {
      setError(validationResult.error || 'Please enter a valid URL')
      return
    }
    
    // Use the normalized URL for processing
    const normalizedUrl = validationResult.normalizedUrl || url

    setError(null)
    setIsLoading(true)

    try {
      if (onSubmit) {
        await onSubmit(normalizedUrl)
      } else {
        // Stub behavior - simulate analysis
        await new Promise(resolve => setTimeout(resolve, 2000))
        showToast('Analysis feature coming soon! This is just a UI demonstration.', 'info')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    if (error) setError(null)
  }

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
            <Input
              type="url"
              value={url}
              onChange={handleInputChange}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              className={cn(
                'w-full',
                error && 'border-destructive focus-visible:ring-destructive'
              )}
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={disabled || isLoading || !url.trim()}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Analyze URL
              </>
            )}
          </Button>

          {!onSubmit && (
            <p className="text-sm text-muted-foreground text-center">
              This is a demo interface. URL analysis functionality will be connected in the next development phase.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}