"use client"

import { useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RiskGauge } from "./risk-gauge"
import { KeyFindings } from "./key-findings"
import { AnalysisResult } from "@/types/analysis-display"
import { Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SimpleViewProps {
  result: AnalysisResult
  onViewDetails?: () => void
  className?: string
}

// Status configuration for different risk levels (CORRECTED: Higher scores = safer)
const statusConfig = {
  safe: {
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-800",
    badgeVariant: "default" as const,
    message: "This website appears safe to visit",
    recommendation: "Standard security checks passed. Always verify before sharing personal information."
  },
  moderate: {
    icon: Shield,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    badgeVariant: "secondary" as const,
    message: "Exercise caution when visiting this website",
    recommendation: "Some risk indicators detected but no major red flags. Use standard web safety practices."
  },
  caution: {
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    badgeVariant: "outline" as const,
    message: "Exercise caution when visiting this website",
    recommendation: "Multiple risk indicators detected. Avoid entering sensitive information."
  },
  danger: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    borderColor: "border-red-200 dark:border-red-800",
    badgeVariant: "destructive" as const,
    message: "This website may be dangerous to visit",
    recommendation: "Critical security threats detected. This site may attempt to steal your information or harm your device."
  }
}

export function SimpleView({ result, onViewDetails, className }: SimpleViewProps) {
  const config = statusConfig[result.status]
  const StatusIcon = config.icon
  
  // Filter findings to show only top 3-5 most important ones for simple view
  const keyFindings = result.findings
    .filter(finding => finding.severity !== 'low')
    .slice(0, 5)

  // Memoized event handlers to prevent unnecessary re-renders
  const handleVisitSite = useCallback(() => {
    window.open(result.url, '_blank', 'noopener,noreferrer')
  }, [result.url])

  const handleGoBack = useCallback(() => {
    history.back()
  }, [])

  return (
    <div className={cn("space-y-6", className)} data-testid="simple-view">
      <Card className={cn(
        "transition-colors border-2",
        config.borderColor,
        config.bgColor
      )}>
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-4">
            <RiskGauge
              score={result.score}
              status={result.status}
              size="md"
              animate={true}
              showNumeric={true}
            />
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <StatusIcon className={cn("h-5 w-5", config.color)} />
            <Badge variant={config.badgeVariant} className="text-sm font-medium">
              {result.status.toUpperCase()}
            </Badge>
          </div>
          
          <CardTitle className="text-xl font-semibold">
            {config.message}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Key Findings */}
          {keyFindings.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-foreground">Key Findings</h3>
              <KeyFindings 
                findings={keyFindings}
                maxItems={5}
                expandable={false}
              />
            </div>
          )}
          
          {/* Recommendation */}
          <Alert className={cn(config.bgColor, config.borderColor)}>
            <StatusIcon className={cn("h-4 w-4", config.color)} />
            <AlertTitle className="font-semibold">Recommendation</AlertTitle>
            <AlertDescription className="mt-1 text-sm text-muted-foreground">
              {config.recommendation}
            </AlertDescription>
          </Alert>
          
          {/* URL and Analysis Info */}
          <div className="space-y-2 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Analyzed URL:</span>{' '}
              <span className="font-mono text-xs break-all">{result.url}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Analysis Time:</span>{' '}
              {result.timestamp.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Confidence:</span>{' '}
              {Math.round(result.confidence * 100)}%
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {onViewDetails && (
              <Button 
                variant="outline" 
                onClick={onViewDetails}
                className="flex-1"
              >
                View Technical Details
              </Button>
            )}
            
            {result.status === 'safe' && (
              <Button 
                variant="default"
                className="flex-1"
                onClick={handleVisitSite}
              >
                Visit Site Safely
              </Button>
            )}
            
            {result.status === 'moderate' && (
              <Button 
                variant="secondary"
                className="flex-1"
                onClick={handleVisitSite}
              >
                Proceed with Caution
              </Button>
            )}
            
            {(result.status === 'caution' || result.status === 'danger') && (
              <Button 
                variant="outline"
                className="flex-1"
                onClick={handleGoBack}
              >
                Go Back to Safety
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}