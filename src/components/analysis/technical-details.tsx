"use client"

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { 
  Shield, 
  Server, 
  Lock, 
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  Eye,
  Globe,
  Brain
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnalysisResult } from '@/types/analysis-display'

// Legacy interfaces - keeping for now but migrating to new types

interface TechnicalDetailsProps {
  result?: AnalysisResult
  loading?: boolean
  className?: string
}

// Component implementation continues...

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
      className="h-6 px-2 text-xs"
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
}: TechnicalDetailsProps) {
  
  if (loading) {
    return (
      <Card className={cn('w-full', className)} data-testid="technical-view">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            Loading Technical Details...
          </CardTitle>
          <CardDescription>
            Gathering domain, SSL, and reputation information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-6 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result) {
    return (
      <Card className={cn('w-full', className)} data-testid="technical-view">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Technical Analysis
          </CardTitle>
          <CardDescription>
            Detailed technical information about the domain and security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              Technical analysis details will appear here after URL analysis is complete.
            </p>
            <p className="text-xs mt-2">
              This component is ready for backend integration with existing analysis types.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const technicalData = result.technicalData

  return (
    <Card className={cn('w-full', className)} data-testid="technical-view">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Technical Analysis
        </CardTitle>
        <CardDescription>
          Detailed technical information about the domain and security
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {/* Domain Age Section */}
          <AccordionItem value="domain">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Domain Information
                <Badge variant="outline" className="ml-2">
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
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                SSL Certificate
                {technicalData.ssl.isValid ? (
                  <Badge variant="default" className="ml-2">Valid</Badge>
                ) : (
                  <Badge variant="destructive" className="ml-2">Invalid</Badge>
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
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Reputation Analysis
                <Badge 
                  variant={technicalData.reputation.overallRating === 'safe' ? 'default' : 
                          technicalData.reputation.overallRating === 'suspicious' ? 'outline' : 
                          technicalData.reputation.overallRating === 'malicious' ? 'destructive' : 'secondary'}
                  className="ml-2"
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
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Content Analysis
                <Badge variant="outline" className="ml-2">
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
                            <Badge variant={pattern.severity === 'high' ? 'destructive' : pattern.severity === 'medium' ? 'outline' : 'secondary'}>
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
      </CardContent>
    </Card>
  )
}