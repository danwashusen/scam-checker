"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AnalysisResult, Finding } from '@/types/analysis-display'
import {
  AlertCircle,
  Brain,
  CheckCircle,
  Clock,
  Copy,
  Eye,
  Globe,
  Lock,
  Server,
  Shield
} from 'lucide-react'
import * as React from 'react'
// Legacy interfaces - keeping for now but migrating to new types

interface TechnicalDetailsProps {
  result?: AnalysisResult
  loading?: boolean
  className?: string
  keyFindings?: Finding[]
}

// Helper functions to categorize findings by technical section type

/**
 * Categorizes findings by technical section based on icon/content analysis
 */
const categorizeFindingsBySection = (findings: Finding[]) => {
  const categories = {
    domain: [] as Finding[],
    ssl: [] as Finding[],
    reputation: [] as Finding[],
    ai: [] as Finding[],
  }

  findings.forEach(finding => {
    const text = (finding.title + ' ' + finding.description).toLowerCase()
    const icon = finding.icon?.toLowerCase()
    
    if (icon === 'domain' || icon === 'globe' || text.includes('domain') || text.includes('whois') || text.includes('age') || text.includes('registration')) {
      categories.domain.push(finding)
    } else if (icon === 'ssl' || icon === 'lock' || text.includes('ssl') || text.includes('certificate') || text.includes('https')) {
      categories.ssl.push(finding)
    } else if (icon === 'reputation' || icon === 'shield' || text.includes('reputation') || text.includes('security') || text.includes('threat') || text.includes('blacklist')) {
      categories.reputation.push(finding)
    } else if (icon === 'content' || icon === 'eye' || icon === 'brain' || text.includes('content') || text.includes('analysis') || text.includes('ai') || text.includes('pattern')) {
      categories.ai.push(finding)
    } else {
      // Default to reputation for uncategorized security findings
      categories.reputation.push(finding)
    }
  })

  return categories
}

/**
 * Gets the most significant finding for a section to display in the trigger
 */
const getMostSignificantFinding = (findings: Finding[]): Finding | null => {
  if (findings.length === 0) return null
  
  // Priority: high negative > medium negative > positive > low negative/neutral
  const sortedFindings = findings.sort((a, b) => {
    // Prioritize by type and severity
    const getWeight = (f: Finding) => {
      if (f.type === 'negative' && f.severity === 'high') return 4
      if (f.type === 'negative' && f.severity === 'medium') return 3
      if (f.type === 'positive') return 2
      return 1
    }
    
    return getWeight(b) - getWeight(a)
  })
  
  return sortedFindings[0]
}


const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = React.useState(false)
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={copyToClipboard}
      className="h-6 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
      aria-label={copied ? "Text copied to clipboard" : "Copy text to clipboard"}
    >
      <Copy className="h-3 w-3 mr-1" />
      {copied ? 'Copied!' : 'Copy'}
    </Button>
  )
}

export function TechnicalDetails({
  result,
  loading = false,
  className,
  keyFindings,
}: TechnicalDetailsProps) {
  
  if (loading) {
    return (
      <div className={cn('w-full', className)} data-testid="technical-view">
        <h3 className="text-lg font-semibold leading-snug sm:text-xl md:text-2xl flex items-center gap-2 mb-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          Loading Technical Details...
        </h3>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-6 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className={cn('w-full', className)} data-testid="technical-view">
        <h3 className="text-lg font-semibold leading-snug sm:text-xl md:text-2xl flex items-center gap-2 mb-4">
          <Server className="h-5 w-5" />
          Technical Analysis
        </h3>
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 opacity-50" />
          <p className="text-sm">
            Technical analysis details will appear here after URL analysis is complete.
          </p>
          <p className="text-xs mt-2">
            This component is ready for backend integration with existing analysis types.
          </p>
        </div>
      </div>
    )
  }

  const technicalData = result.technicalData

  // Categorize key findings by section for enhanced accordion triggers
  const categorizedFindings = keyFindings ? categorizeFindingsBySection(keyFindings) : {
    domain: [],
    ssl: [],
    reputation: [],
    ai: []
  }

  // Get most significant finding for each section
  const domainFinding = getMostSignificantFinding(categorizedFindings.domain)
  const sslFinding = getMostSignificantFinding(categorizedFindings.ssl)
  const reputationFinding = getMostSignificantFinding(categorizedFindings.reputation)
  const aiFinding = getMostSignificantFinding(categorizedFindings.ai)

  return (
    <div className={cn('w-full', className)} data-testid="technical-view">
      <h3 className="text-lg font-semibold leading-snug sm:text-xl md:text-2xl flex items-center gap-2 mb-4">
        <Server className="h-5 w-5" />
        Technical Analysis
      </h3>
      <div className="mx-4">
        <Accordion type="multiple" className="w-full">
          
          {/* Domain Age Section */}
          <AccordionItem value="domain">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <Globe className="h-4 w-4" />
                <div className="flex-1 text-left">
                  <div>Domain Information</div>
                  {domainFinding && (
                    <div className="font-light text-muted-foreground">
                      {domainFinding.description.length > 50 
                        ? domainFinding.description.substring(0, 50) + '...'
                        : domainFinding.description}
                    </div>
                  )}
                </div>
                <Badge 
                  variant={technicalData.domainAge.ageInDays > 365 ? 'default' : 'outline'} 
                  className={cn(
                    "ml-2",
                    technicalData.domainAge.ageInDays > 365 
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                  )}
                >
                  {technicalData.domainAge.ageInDays > 365 ? 'Established' : 'New'}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Registration Date</div>
                  <div className="text-sm text-muted-foreground">
                    {technicalData.domainAge.registrationDate.toLocaleDateString()}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Domain Age</div>
                  <div className="text-sm text-muted-foreground">
                    {Math.floor(technicalData.domainAge.ageInDays / 365)} years, {technicalData.domainAge.ageInDays % 365} days
                  </div>
                </div>
                
                {technicalData.domainAge.registrar && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Registrar</div>
                    <div className="text-sm text-muted-foreground">
                      {technicalData.domainAge.registrar}
                    </div>
                  </div>
                )}
                
                {technicalData.domainAge.expirationDate && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Expiration Date</div>
                    <div className="text-sm text-muted-foreground">
                      {technicalData.domainAge.expirationDate.toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* SSL Certificate Section */}
          <AccordionItem value="ssl">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <Lock className="h-4 w-4" />
                <div className="flex-1 text-left">
                  <div>SSL Certificate</div>
                  {sslFinding && (
                    <div className="font-light text-muted-foreground">
                      {sslFinding.description.length > 50 
                        ? sslFinding.description.substring(0, 50) + '...'
                        : sslFinding.description}
                    </div>
                  )}
                </div>
                {technicalData.ssl.isValid ? (
                  <Badge variant="default" className={cn(
                    "ml-2 bg-emerald-100 text-emerald-800 border-emerald-200",
                    "dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  )}>
                    Valid
                  </Badge>
                ) : (
                  <Badge variant="destructive" className={cn(
                    "ml-2 bg-red-100 text-red-800 border-red-200",
                    "dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                  )}>
                    Invalid
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Status</div>
                  <div className="flex items-center gap-2">
                    {technicalData.ssl.isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {technicalData.ssl.isValid ? 'Valid Certificate' : 'Invalid Certificate'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Issuer</div>
                  <div className="text-sm text-muted-foreground">
                    {technicalData.ssl.issuer}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Valid From</div>
                  <div className="text-sm text-muted-foreground">
                    {technicalData.ssl.validFrom.toLocaleDateString()}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Valid To</div>
                  <div className="text-sm text-muted-foreground">
                    {technicalData.ssl.validTo.toLocaleDateString()}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Algorithm</div>
                  <div className="text-sm text-muted-foreground">
                    {technicalData.ssl.algorithm}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Key Size</div>
                  <div className="text-sm text-muted-foreground">
                    {technicalData.ssl.keySize} bits
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Reputation Data Section */}
          <AccordionItem value="reputation">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <Shield className="h-4 w-4" />
                <div className="flex-1 text-left">
                  <div>Reputation Analysis</div>
                  {reputationFinding && (
                    <div className="font-light text-muted-foreground">
                      {reputationFinding.description.length > 50 
                        ? reputationFinding.description.substring(0, 50) + '...'
                        : reputationFinding.description}
                    </div>
                  )}
                </div>
                <Badge 
                  variant={technicalData.reputation.overallRating === 'safe' ? 'default' : 
                          technicalData.reputation.overallRating === 'suspicious' ? 'outline' : 
                          technicalData.reputation.overallRating === 'malicious' ? 'destructive' : 'secondary'}
                  className={cn(
                    "ml-2",
                    technicalData.reputation.overallRating === 'safe' && "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
                    technicalData.reputation.overallRating === 'suspicious' && "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
                    technicalData.reputation.overallRating === 'malicious' && "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                  )}
                >
                  {technicalData.reputation.overallRating}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Security Sources</div>
                  <div className="grid grid-cols-1 gap-2">
                    {technicalData.reputation.sources.map((source, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <div className="text-sm font-medium">{source.name}</div>
                          <div className="text-xs text-muted-foreground">{source.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{source.score}/100</div>
                          <div className="text-xs text-muted-foreground">
                            {source.lastUpdated.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last checked: {technicalData.reputation.lastChecked.toLocaleDateString()}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* AI Analysis Section */}
          <AccordionItem value="ai">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <Brain className="h-4 w-4" />
                <div className="flex-1 text-left">
                  <div>AI Content Analysis</div>
                  {aiFinding && (
                    <div className="font-light text-muted-foreground">
                      {aiFinding.description.length > 50 
                        ? aiFinding.description.substring(0, 50) + '...'
                        : aiFinding.description}
                    </div>
                  )}
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "ml-2",
                    technicalData.ai.confidence >= 0.8 
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      : technicalData.ai.confidence >= 0.6
                      ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" 
                      : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                  )}
                >
                  {Math.round(technicalData.ai.confidence * 100)}% confidence
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Analysis Summary</div>
                  <p className="text-sm text-muted-foreground">{technicalData.ai.summary}</p>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-2">Content Score</div>
                  <div className="text-sm text-muted-foreground">
                    {technicalData.ai.contentScore}/100
                  </div>
                </div>
                
                {technicalData.ai.patterns.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Detected Patterns</div>
                    <div className="space-y-2">
                      {technicalData.ai.patterns.map((pattern, index) => (
                        <div key={index} className="p-2 bg-muted rounded">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{pattern.type}</span>
                            <Badge 
                              variant={pattern.severity === 'high' ? 'destructive' : pattern.severity === 'medium' ? 'outline' : 'secondary'}
                              className={cn(
                                pattern.severity === 'high' && "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
                                pattern.severity === 'medium' && "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
                                pattern.severity === 'low' && "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                              )}
                            >
                              {pattern.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{pattern.description}</p>
                          <div className="text-xs text-muted-foreground mt-1">
                            Confidence: {Math.round(pattern.confidence * 100)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {technicalData.ai.flags.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Security Flags</div>
                    <div className="flex flex-wrap gap-1">
                      {technicalData.ai.flags.map((flag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Raw Data Section */}
          <AccordionItem value="raw">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Raw Analysis Data
                <Badge variant="secondary" className="ml-2">JSON</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Raw Analysis Response</span>
                  <CopyButton text={JSON.stringify(technicalData.raw, null, 2)} />
                </div>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                  <code>{JSON.stringify(technicalData.raw, null, 2)}</code>
                </pre>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}