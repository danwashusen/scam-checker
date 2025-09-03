"use client"

import { useState, useCallback } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Info, AlertTriangle, XCircle, Link, ShieldAlert, Skull } from "lucide-react"
import { cn } from "@/lib/utils"

export interface RecommendationAlertProps {
  score: number
  status: 'safe' | 'moderate' | 'caution' | 'danger'
  url: string  // NEW PROP
  className?: string
}

interface AlertConfig {
  variant: 'default' | 'destructive'
  title: string
  message: string
  icon: React.ComponentType<{ className?: string }>
}

interface WarningDialogConfig {
  title: string
  message: string
  variant: 'caution' | 'highRisk' | 'danger'
  continueLabel?: string
  icon: React.ComponentType<{ className?: string }>
}

/**
 * Get warning dialog configuration based on score
 */
function getWarningDialogConfig(score: number): WarningDialogConfig {
  if (score >= 40 && score < 60) {
    // Caution (40-59)
    return {
      title: "Proceed with Caution",
      message: "This website has some risk indicators. While not necessarily dangerous, we recommend being careful about what information you share.",
      variant: 'caution',
      continueLabel: "Continue with Caution",
      icon: AlertTriangle
    }
  } else if (score >= 20 && score < 40) {
    // High Risk (20-39) - More prominent icon
    return {
      title: "High Risk Detected",
      message: "This website has significant security concerns. We strongly advise against entering sensitive information like passwords, credit card numbers, or personal details.",
      variant: 'highRisk',
      continueLabel: "Continue at Own Risk",
      icon: ShieldAlert
    }
  } else {
    // Danger (0-19) - Most prominent danger icon
    return {
      title: "Danger: Critical Threats Detected",
      message: "This website shows critical security threats and may be attempting to steal your information or harm your device. We strongly recommend not visiting this site.",
      variant: 'danger',
      continueLabel: "Continue at Own Risk",
      icon: Skull
    }
  }
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

export function RecommendationAlert({ score, url, className }: RecommendationAlertProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // Alert configuration for the recommendation message
  const alertConfig = generateRecommendation(score)
  const AlertIcon = alertConfig.icon
  
  // Determine if warning is needed (score < 60)
  const needsWarning = score < 60
  
  // Get dialog configuration if warning is needed
  const dialogConfig = needsWarning ? getWarningDialogConfig(score) : null
  
  const handleUrlClick = useCallback(() => {
    if (needsWarning) {
      // Show warning dialog
      console.log('[RecommendationAlert] Warning shown for score:', score)
      setIsDialogOpen(true)
    } else {
      // Direct navigation for safe URLs
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }, [url, score, needsWarning])
  
  const handleContinueAtOwnRisk = useCallback(() => {
    setIsDialogOpen(false)
    // Track dialog confirmation for analytics
    console.log('[RecommendationAlert] User confirmed navigation despite warning, score:', score)
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [url, score])
  
  const handleCancel = useCallback(() => {
    setIsDialogOpen(false)
    console.log('[RecommendationAlert] User cancelled navigation, score:', score)
  }, [score])

  return (
    <>
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
        <AlertDescription className="mt-2">
          {alertConfig.message}
        </AlertDescription>
        
        {/* Integrated URL Link */}
        <div className="mt-4 flex items-center gap-2">
          <Link className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <button
            onClick={handleUrlClick}
            className={cn(
              "text-left underline underline-offset-2 hover:text-primary transition-colors",
              "break-all", // Always break long URLs
              // Responsive display classes
              "line-clamp-1 sm:line-clamp-2 lg:line-clamp-none",
              // Enhanced mobile touch targets (Visual Improvement)
              "py-2 px-1 -mx-1 rounded-sm", // Larger touch area with padding
              "min-h-[44px] sm:min-h-[32px]", // WCAG compliant touch target size on mobile
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "text-sm sm:text-base"
            )}
            data-testid="url-link-button"
          >
            <span className="block sm:hidden">
              {/* Mobile: Show domain with truncated path for better UX */}
              {(() => {
                try {
                  const parsedUrl = new URL(url)
                  const domain = parsedUrl.hostname.replace('www.', '')
                  const path = parsedUrl.pathname
                  // Show domain + truncated path if path exists and is meaningful
                  if (path && path !== '/' && path.length > 1) {
                    const truncatedPath = path.length > 15 ? path.slice(0, 12) + '...' : path
                    return `${domain}${truncatedPath}`
                  }
                  return domain
                } catch {
                  return url.length > 30 ? url.slice(0, 27) + '...' : url
                }
              })()}
            </span>
            <span className="hidden sm:block lg:hidden truncate max-w-[50ch]">
              {/* Tablet: Show truncated URL with CSS ellipsis */}
              {url}
            </span>
            <span className="hidden lg:block">
              {/* Desktop: Show full URL */}
              {url}
            </span>
          </button>
        </div>
      </Alert>

      {/* Enhanced Warning Dialog with animations and prominent danger icons */}
      {dialogConfig && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className={cn(
            "sm:max-w-md animate-in fade-in-0 zoom-in-95 duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            dialogConfig.variant === 'danger' && "border-red-200 dark:border-red-800"
          )}>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "p-2 rounded-full",
                  dialogConfig.variant === 'caution' && "bg-amber-100 dark:bg-amber-950/20",
                  dialogConfig.variant === 'highRisk' && "bg-red-100 dark:bg-red-950/20",
                  dialogConfig.variant === 'danger' && "bg-red-100 dark:bg-red-950/20"
                )}>
                  <dialogConfig.icon 
                    className={cn(
                      "h-6 w-6 animate-pulse", // Larger, animated icons
                      dialogConfig.variant === 'caution' && "text-amber-600 dark:text-amber-400",
                      dialogConfig.variant === 'highRisk' && "text-red-600 dark:text-red-400", 
                      dialogConfig.variant === 'danger' && "text-red-700 dark:text-red-300"
                    )} 
                  />
                </div>
                <DialogTitle className="text-lg font-semibold text-foreground">
                  {dialogConfig.title}
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                {dialogConfig.message}
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium mb-1">URL to visit:</p>
              <p className="text-xs font-mono break-all text-muted-foreground">
                {url}
              </p>
            </div>
            
            <DialogFooter className="flex gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Cancel and stay safe"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleContinueAtOwnRisk}
                className="flex-1 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
                aria-label={`${dialogConfig.continueLabel} - Warning: This may be unsafe`}
              >
                {dialogConfig.continueLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}