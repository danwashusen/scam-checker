'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { 
  Brain,
  AlertTriangle,
  CheckCircle,
  Info,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExplanationPanelProps {
  aiAnalysis?: unknown
  loading?: boolean
  className?: string
}

// Mock AI analysis for demonstration
const mockAnalysis = {
  summary: "Based on comprehensive analysis, this website shows several concerning patterns typical of phishing attempts. The domain mimics a legitimate financial institution but contains subtle misspellings.",
  riskFactors: [
    {
      category: "Domain Analysis",
      finding: "Domain registered recently (2 days ago)",
      riskLevel: "high",
      explanation: "Legitimate financial institutions typically have well-established domains that have been registered for years."
    },
    {
      category: "Content Analysis",
      finding: "Requests sensitive financial information",
      riskLevel: "high", 
      explanation: "The page contains forms asking for banking credentials, social security numbers, and credit card details without proper security indicators."
    },
    {
      category: "SSL Certificate",
      finding: "Self-signed certificate",
      riskLevel: "medium",
      explanation: "While the site uses HTTPS, the certificate is self-signed rather than issued by a trusted authority."
    }
  ],
  recommendations: [
    "Do not enter any personal or financial information on this website",
    "Verify the legitimate website URL through official channels",
    "Report this suspicious site to your browser's security team",
    "If you've already entered information, contact your financial institutions immediately"
  ],
  confidence: 94
}

export function ExplanationPanel({
  aiAnalysis,
  loading = false,
  className,
}: ExplanationPanelProps) {
  // Use mock data for demonstration when no real data is provided
  const analysis = aiAnalysis || (loading ? null : mockAnalysis)

  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Spinner size="sm" />
            AI Analysis in Progress...
          </CardTitle>
          <CardDescription>
            Generating detailed explanation of security findings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-4/5" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/5" />
            </div>
            <div className="h-24 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'high': return 'destructive' as const
      case 'medium': return 'secondary' as const
      case 'low': return 'default' as const
      default: return 'outline' as const
    }
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Security Analysis
        </CardTitle>
        <CardDescription>
          Detailed explanation of security findings and recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!analysis ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              AI analysis and explanations will appear here after URL analysis is complete.
            </p>
            <p className="text-xs mt-2">
              This component is ready for integration with AI analysis results.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span className="font-medium">Executive Summary</span>
                <Badge variant="outline">
                  {(analysis as typeof mockAnalysis).confidence}% confidence
                </Badge>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm leading-relaxed">{(analysis as typeof mockAnalysis).summary}</p>
              </div>
            </div>

            {/* Risk Factors */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Key Findings</span>
              </div>
              <div className="space-y-3">
                {(analysis as typeof mockAnalysis).riskFactors.map((factor: typeof mockAnalysis.riskFactors[0], index: number) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {factor.riskLevel === 'high' ? (
                          <TrendingUp className="h-4 w-4 text-destructive" />
                        ) : factor.riskLevel === 'medium' ? (
                          <TrendingUp className="h-4 w-4 text-warning" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-success" />
                        )}
                        <span className="font-medium text-sm">{factor.category}</span>
                      </div>
                      <Badge variant={getRiskBadgeVariant(factor.riskLevel)}>
                        {factor.riskLevel} risk
                      </Badge>
                    </div>
                    <div className="text-sm font-medium">{factor.finding}</div>
                    <div className="text-sm text-muted-foreground">
                      {factor.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                <span className="font-medium">Recommendations</span>
              </div>
              <div className="space-y-2">
                {(analysis as typeof mockAnalysis).recommendations.map((rec: string, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                This analysis is generated by AI and should be used as a guide. Always exercise caution when dealing with suspicious websites and verify information through multiple sources.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}