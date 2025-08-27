'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4 max-w-md mx-auto p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        
        <h2 className="text-lg font-semibold text-foreground">Something went wrong!</h2>
        
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="text-left mt-4 p-3 bg-muted rounded-md text-xs">
            <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
            <code className="block whitespace-pre-wrap text-xs">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </code>
          </details>
        )}
        
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => reset()}
            className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Try again
          </button>
          
          <a
            href="/"
            className="text-sm font-semibold leading-6 text-foreground hover:text-foreground/80"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  )
}