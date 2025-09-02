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
  ChevronRight
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
const findingIcons: Record<string, React.ComponentType<any>> = {
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

// Style configuration for different finding types and severities
const getTypeStyles = (type: Finding['type'], _severity: Finding['severity']) => {
  const baseStyles = {
    positive: {
      icon: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950/20",
      border: "border-green-200 dark:border-green-800",
      badge: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
    },
    negative: {
      icon: "text-red-600 dark:text-red-400", 
      bg: "bg-red-50 dark:bg-red-950/20",
      border: "border-red-200 dark:border-red-800",
      badge: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
    },
    neutral: {
      icon: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/20", 
      border: "border-blue-200 dark:border-blue-800",
      badge: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
    }
  }
  
  return baseStyles[type] || baseStyles.neutral
}

const getSeverityIcon = (type: Finding['type'], severity: Finding['severity']) => {
  if (type === 'positive') return CheckCircle2
  if (type === 'negative') {
    if (severity === 'high') return XCircle
    return AlertTriangle
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
                          className={cn("text-xs px-1.5 py-0.5", styles.badge)}
                        >
                          {finding.severity}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {finding.description}
                      </p>
                    </div>
                    
                    {/* Expand/Collapse button */}
                    {expandable && hasDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(finding.id)}
                        className="flex-shrink-0 h-6 w-6 p-0"
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
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
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
      
      {/* Show More/Less button */}
      {hasMore && expandable && (
        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-sm"
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