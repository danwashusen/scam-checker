"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info, AlertTriangle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface RecommendationAlertProps {
  score: number
  status: 'safe' | 'moderate' | 'caution' | 'danger'
  className?: string
}

interface AlertConfig {
  variant: 'default' | 'destructive'
  title: string
  message: string
  icon: React.ComponentType<{ className?: string }>
}

/**
 * Generate recommendation alert configuration based on score
 * Following the plan's algorithm exactly
 */
function generateRecommendation(score: number): AlertConfig {
  if (score >= 80) {
    return {
      variant: 'default',
      title: 'Recommendation',
      message: 'Standard security checks passed. Always verify before sharing personal information.',
      icon: Info
    }
  } else if (score >= 60) {
    return {
      variant: 'default', // Using default instead of warning since shadcn doesn't have warning variant
      title: 'Proceed with Caution',
      message: 'Some concerns detected but no major red flags. Use standard web safety practices.',
      icon: AlertTriangle
    }
  } else if (score >= 40) {
    return {
      variant: 'destructive',
      title: 'Be Careful',
      message: 'Multiple risk indicators detected. Avoid entering sensitive information.',
      icon: XCircle
    }
  } else if (score >= 20) {
    return {
      variant: 'destructive',
      title: 'High Risk',
      message: 'Significant security concerns detected. Only proceed if you trust the source.',
      icon: XCircle
    }
  } else {
    return {
      variant: 'destructive',
      title: 'Danger',
      message: 'Critical security threats detected. This site may attempt to steal your information.',
      icon: XCircle
    }
  }
}

export function RecommendationAlert({ score, className }: RecommendationAlertProps) {
  const alertConfig = generateRecommendation(score)
  const AlertIcon = alertConfig.icon

  return (
    <Alert 
      variant={alertConfig.variant}
      className={cn(
        // Custom styling for different variants to match design
        alertConfig.variant === 'default' && score >= 80 && "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-100",
        alertConfig.variant === 'default' && score >= 60 && score < 80 && "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100",
        className
      )}
      data-testid="recommendation-alert"
    >
      <AlertIcon className="h-4 w-4" />
      <AlertTitle className="font-semibold">
        {alertConfig.title}
      </AlertTitle>
      <AlertDescription className="mt-1">
        {alertConfig.message}
      </AlertDescription>
    </Alert>
  )
}