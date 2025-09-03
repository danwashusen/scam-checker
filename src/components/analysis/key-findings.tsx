"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Finding } from "@/types/analysis-display"
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Shield, 
  Clock, 
  Globe, 
  Lock,
  Eye,
  ChevronDown,
  ChevronRight,
  AlertOctagon,
  ShieldCheck
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

export interface KeyFindingsProps {
  findings: Finding[]
  maxItems?: number
  expandable?: boolean
  className?: string
}

// Icon mapping for different finding types
const findingIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  ssl: Lock,
  domain: Globe,
  reputation: Shield,
  content: Eye,
  age: Clock,
  security: Shield,
  default: Info
}

// Get appropriate icon for finding
const getIconForFinding = (finding: Finding) => {
  // Try to match the icon field first
  if (finding.icon && findingIcons[finding.icon]) {
    return findingIcons[finding.icon]
  }
  
  // Fallback to guessing from title/description
  const text = (finding.title + ' ' + finding.description).toLowerCase()
  if (text.includes('ssl') || text.includes('certificate')) return Lock
  if (text.includes('domain') || text.includes('whois')) return Globe
  if (text.includes('reputation') || text.includes('security')) return Shield
  if (text.includes('content') || text.includes('analysis')) return Eye
  if (text.includes('age') || text.includes('time')) return Clock
  
  return Info
}

// Enhanced style configuration for better visual differentiation (Visual Improvement)
const getTypeStyles = (type: Finding['type'], severity: Finding['severity']) => {
  const baseStyles = {
    positive: {
      icon: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      border: "border-emerald-200 dark:border-emerald-800",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
    },
    negative: {
      icon: severity === 'high' ? "text-red-700 dark:text-red-300" : "text-orange-600 dark:text-orange-400", 
      bg: severity === 'high' ? "bg-red-50 dark:bg-red-950/20" : "bg-orange-50 dark:bg-orange-950/20",
      border: severity === 'high' ? "border-red-200 dark:border-red-800" : "border-orange-200 dark:border-orange-800",
      badge: severity === 'high' ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800" : "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
    },
    neutral: {
      icon: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/20", 
      border: "border-blue-200 dark:border-blue-800",
      badge: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
    }
  }
  
  return baseStyles[type] || baseStyles.neutral
}

// Enhanced severity icons with more distinct visual differentiation (Visual Improvement)
const getSeverityIcon = (type: Finding['type'], severity: Finding['severity']) => {
  if (type === 'positive') return ShieldCheck // More distinct positive icon
  if (type === 'negative') {
    if (severity === 'high') return AlertOctagon // More prominent danger icon
    if (severity === 'medium') return AlertTriangle
    return XCircle // Low severity negative
  }
  return Info
}

export function KeyFindings({ 
  findings, 
  maxItems = 5, 
  expandable = true,
  className 
}: KeyFindingsProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  
  const displayFindings = showAll ? findings : findings.slice(0, maxItems)
  const hasMore = findings.length > maxItems
  
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }
  
  if (findings.length === 0) {
    return (
      <div className={cn("text-center py-4", className)}>
        <Info className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No findings available</p>
      </div>
    )
  }
  
  return (
    <div className={cn("space-y-3", className)}>
      <TooltipProvider>
        {displayFindings.map((finding) => {
          const styles = getTypeStyles(finding.type, finding.severity)
          const SeverityIcon = getSeverityIcon(finding.type, finding.severity)
          const FindingIcon = getIconForFinding(finding)
          const isExpanded = expandedItems.has(finding.id)
          const hasDetails = finding.details && finding.details.trim().length > 0
          
          return (
            <div
              key={finding.id}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                styles.bg,
                styles.border
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  <SeverityIcon className={cn("h-4 w-4", styles.icon)} />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FindingIcon className={cn("h-3 w-3", styles.icon)} />
                        <h4 className="font-medium text-sm text-foreground">
                          {finding.title}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs px-1.5 py-0.5 flex items-center gap-1", styles.badge)}
                        >
                          {finding.type === 'negative' && finding.severity === 'high' && <AlertOctagon className="h-2.5 w-2.5" />}
                          {finding.type === 'negative' && finding.severity === 'medium' && <AlertTriangle className="h-2.5 w-2.5" />}
                          {finding.type === 'positive' && <CheckCircle2 className="h-2.5 w-2.5" />}
                          {finding.severity}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {finding.description}
                      </p>
                    </div>
                    
                    {/* Expand/Collapse button with enhanced accessibility */}
                    {expandable && hasDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(finding.id)}
                        className="flex-shrink-0 h-6 w-6 p-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                        aria-label={isExpanded ? `Collapse ${finding.title} details` : `Expand ${finding.title} details`}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                    
                    {/* Tooltip for non-expandable items with details */}
                    {!expandable && hasDetails && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                            aria-label={`Additional details for ${finding.title}`}
                          >
                            <Info className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-sm">{finding.details}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  
                  {/* Expanded details */}
                  {expandable && hasDetails && isExpanded && (
                    <div className="mt-3 pt-3 border-t border-current/10">
                      <p className="text-sm text-muted-foreground">
                        {finding.details}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </TooltipProvider>
      
      {/* Show More/Less button with enhanced accessibility */}
      {hasMore && expandable && (
        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={showAll 
              ? "Show fewer findings" 
              : `Show ${findings.length - maxItems} more finding${findings.length - maxItems > 1 ? 's' : ''}`}
            aria-expanded={showAll}
          >
            {showAll ? (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronRight className="h-3 w-3 mr-1" />
                Show {findings.length - maxItems} More Finding{findings.length - maxItems > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}