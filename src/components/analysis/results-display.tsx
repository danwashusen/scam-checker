"use client"

import React, { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { SimpleView } from "./simple-view"
import { TechnicalDetails } from "./technical-details"
import { ShareExport } from "./share-export"
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

    {/* Tabs skeleton */}
    <div className="space-y-4">
      <div className="flex space-x-1">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      
      {/* Content skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center mb-6">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
)

// Custom hook for view toggle with scroll position preservation
const useViewToggle = (defaultView: 'simple' | 'technical' = 'simple') => {
  const [view, setView] = useState(defaultView)
  const [scrollPositions, setScrollPositions] = useState<Record<string, number>>({})

  const toggleView = useCallback((newView: typeof view) => {
    // Save current scroll position
    setScrollPositions(prev => ({
      ...prev,
      [view]: window.scrollY
    }))

    setView(newView)

    // Restore previous scroll position after a brief delay
    setTimeout(() => {
      if (scrollPositions[newView] !== undefined) {
        window.scrollTo(0, scrollPositions[newView])
      }
    }, 100)
  }, [view, scrollPositions])

  return { view, toggleView, setView }
}

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
  const { view, toggleView } = useViewToggle('simple')

  // Handle error state
  if (error && !isLoading) {
    return (
      <div className={cn("w-full", className)}>
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
      <div className={cn("w-full", className)}>
        <ResultsLoadingSkeleton />
      </div>
    )
  }

  // Handle no result state
  if (!result) {
    return (
      <div className={cn("w-full text-center py-12", className)}>
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
      <div className={cn("w-full space-y-6", className)}>
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Analysis Results</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              URL Security Report
            </h2>
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

        {/* Main content with tabs */}
        <Tabs 
          value={view} 
          onValueChange={(value) => toggleView(value as 'simple' | 'technical')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="simple">Simple View</TabsTrigger>
            <TabsTrigger value="technical">Technical View</TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-6 mt-6">
            <SimpleView 
              result={result}
              onViewDetails={() => toggleView('technical')}
            />
          </TabsContent>

          <TabsContent value="technical" className="space-y-6 mt-6">
            <TechnicalDetails result={result} />
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  )
}

// Note: Mock data utilities have been moved to tests/utils/mock-data.ts
// for better separation of concerns and to avoid including test data in production bundles