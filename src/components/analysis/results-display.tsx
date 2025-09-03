"use client"

import React, { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { TechnicalDetails } from "./technical-details"
import { ShareExport } from "./share-export"
import { DomainHeader } from "./domain-header"
import { RecommendationAlert } from "./recommendation-alert"
import { RiskGauge } from "./risk-gauge"
import { AnalysisResult, ShareMethod, ExportFormat } from "@/types/analysis-display"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ResultsDisplayProps {
  result: AnalysisResult | null
  isLoading: boolean
  error?: Error
  onShare?: (method: ShareMethod) => void
  onExport?: (format: ExportFormat) => void
  onRetry?: () => void
  onAnalyzeNew?: () => void
  className?: string
}

// Custom error fallback specifically for results display
const ResultsErrorFallback = ({ error }: { error?: Error; reset: () => void }) => (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Unable to display results</AlertTitle>
    <AlertDescription>
      {error?.message || 'An unexpected error occurred while displaying the analysis results'}
    </AlertDescription>
  </Alert>
)

// Loading skeleton for results
const ResultsLoadingSkeleton = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-9 w-24" />
    </div>

    {/* Content skeleton */}
    <div className="space-y-6">
      {/* Domain header skeleton */}
      <Skeleton className="h-8 w-64" />
      
      {/* Risk gauge skeleton */}
      <div className="flex items-center justify-center">
        <Skeleton className="h-48 w-48 rounded-full" />
      </div>
      
      {/* Recommendation alert skeleton */}
      <Skeleton className="h-16 w-full" />
      
      {/* URL link skeleton */}
      <Skeleton className="h-6 w-full" />
      
      {/* Key findings skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      
      {/* Technical details accordion skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  </div>
)


export function ResultsDisplay({
  result,
  isLoading,
  error,
  onShare,
  onExport,
  onRetry,
  onAnalyzeNew,
  className
}: ResultsDisplayProps) {
  const resultsRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to results section when loading starts
  useEffect(() => {
    if (isLoading && resultsRef.current) {
      // Small delay to ensure skeleton is rendered
      const timeoutId = setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [isLoading])

  // Handle error state
  if (error && !isLoading) {
    return (
      <div ref={resultsRef} className={cn("w-full", className)}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Analysis Failed</AlertTitle>
          <AlertDescription className="mt-2">
            {error.message || 'Unable to complete the URL analysis. Please try again.'}
          </AlertDescription>
          <div className="mt-4 flex gap-2">
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry Analysis
              </Button>
            )}
            {onAnalyzeNew && (
              <Button variant="default" size="sm" onClick={onAnalyzeNew}>
                Analyze New URL
              </Button>
            )}
          </div>
        </Alert>
      </div>
    )
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div ref={resultsRef} className={cn("w-full", className)}>
        <ResultsLoadingSkeleton />
      </div>
    )
  }

  // Handle no result state
  if (!result) {
    return (
      <div ref={resultsRef} className={cn("w-full text-center py-12", className)}>
        <div className="text-muted-foreground">
          <p className="text-lg mb-2">No analysis results to display</p>
          <p className="text-sm">Enter a URL above to begin security analysis</p>
        </div>
      </div>
    )
  }

  // Main results display
  return (
    <ErrorBoundary fallback={ResultsErrorFallback}>
      <div ref={resultsRef} className={cn("w-full space-y-6", className)}>
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">Analysis Results</h1>
            <h3 className="text-lg font-semibold leading-snug sm:text-xl md:text-2xl">
              URL Security Report
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <ShareExport 
              result={result}
              onShare={onShare}
              onExport={onExport}
            />
            {onAnalyzeNew && (
              <Button variant="outline" onClick={onAnalyzeNew}>
                Check Another URL
              </Button>
            )}
          </div>
        </div>

        {/* Unified content structure */}
        <div className="space-y-4">
          <DomainHeader url={result.url} />
          <RiskGauge score={result.score} status={result.status} />
          <RecommendationAlert score={result.score} status={result.status} url={result.url} />
          <TechnicalDetails 
            result={result}
            keyFindings={result.findings.filter(finding => finding.severity !== 'low').slice(0, 5)}
          />
        </div>
      </div>
    </ErrorBoundary>
  )
}

// Note: Mock data utilities have been moved to tests/utils/mock-data.ts
// for better separation of concerns and to avoid including test data in production bundles