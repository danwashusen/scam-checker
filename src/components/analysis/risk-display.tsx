'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RiskFactor {
  type: string
  score: number
  description: string
}

interface RiskDisplayProps {
  riskScore?: number
  riskLevel?: 'low' | 'medium' | 'high'
  loading?: boolean
  factors?: RiskFactor[]
  className?: string
}

const getRiskConfig = (level: 'low' | 'medium' | 'high') => {
  switch (level) {
    case 'low':
      return {
        color: 'text-success',
        bgColor: 'bg-success/10',
        borderColor: 'border-success/20',
        icon: ShieldCheck,
        label: 'Low Risk',
        badgeVariant: 'default' as const,
      }
    case 'medium':
      return {
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        borderColor: 'border-warning/20',
        icon: Shield,
        label: 'Medium Risk',
        badgeVariant: 'secondary' as const,
      }
    case 'high':
      return {
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/20',
        icon: ShieldAlert,
        label: 'High Risk',
        badgeVariant: 'destructive' as const,
      }
  }
}

export function RiskDisplay({
  riskScore = 0,
  riskLevel = 'low',
  loading = false,
  factors = [],
  className,
}: RiskDisplayProps) {
  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Spinner size="sm" />
            Analyzing Risk...
          </CardTitle>
          <CardDescription>
            Running comprehensive security analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const config = getRiskConfig(riskLevel)
  const RiskIcon = config.icon

  return (
    <Card className={cn('w-full', config.borderColor, className)}>
      <CardHeader className={config.bgColor}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiskIcon className={cn('h-6 w-6', config.color)} />
            <span>Risk Assessment</span>
          </div>
          <Badge variant={config.badgeVariant}>
            {config.label}
          </Badge>
        </CardTitle>
        <CardDescription>
          Overall security assessment based on multiple analysis factors
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Risk Score */}
        <div className="space-y-4">
          <div className="text-center">
            <div className={cn('text-4xl font-bold mb-2', config.color)}>
              {riskScore}%
            </div>
            <p className="text-sm text-muted-foreground">
              Risk Score (0 = Safe, 100 = Very High Risk)
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className={cn(
                'h-3 rounded-full transition-all duration-500',
                riskLevel === 'low' && 'bg-success',
                riskLevel === 'medium' && 'bg-warning',
                riskLevel === 'high' && 'bg-destructive'
              )}
              style={{ width: `${Math.min(riskScore, 100)}%` }}
            />
          </div>

          {/* Risk Factors */}
          {factors.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Key Risk Factors:</h4>
              <div className="space-y-2">
                {factors.map((factor, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {factor.score > 50 ? (
                        <TrendingUp className="h-4 w-4 text-destructive" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-success" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{factor.type}</div>
                        <div className="text-xs text-muted-foreground">
                          {factor.description}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={factor.score > 70 ? 'destructive' : factor.score > 30 ? 'secondary' : 'default'}
                    >
                      {factor.score}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Placeholder state */}
          {factors.length === 0 && riskScore === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                Risk analysis results will appear here after URL analysis is complete.
              </p>
              <p className="text-xs mt-2">
                This component is ready for backend integration.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}