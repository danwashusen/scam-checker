'use client'

import { useState } from 'react'
import { UrlInputForm } from '@/components/analysis/url-input-form'
import { ResultsDisplay } from '@/components/analysis/results-display'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useToast } from '@/components/ui/toast'
import { Shield, Search, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalysisResult, RiskStatus } from '@/types/analysis-display'

// Helper function to transform risk levels
function transformRiskLevel(level: string): RiskStatus {
  switch (level) {
    case 'low': return 'safe'
    case 'medium': return 'moderate'
    case 'high': return 'danger'
    default: return 'moderate'
  }
}

export default function HomePage() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const { showToast } = useToast()

  const handleAnalyze = async (url: string): Promise<void> => {
    setIsLoading(true)
    setResult(null)
    setError(null)
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`)
      }

      if (data.success && data.data) {
        // Transform API response to match expected AnalysisResult interface
        const apiResult = data.data
        const transformedResult: AnalysisResult = {
          url: apiResult.url,
          score: Math.round(apiResult.riskScore), // Already 0-100 from backend
          status: transformRiskLevel(apiResult.riskLevel),
          confidence: 0.85, // Default confidence for now
          findings: apiResult.factors?.map((factor: any, index: number) => ({
            id: `finding-${index}`,
            type: factor.score > 0.5 ? 'negative' : 'positive',
            severity: factor.score > 0.7 ? 'high' : factor.score > 0.3 ? 'medium' : 'low',
            title: factor.type,
            description: factor.description,
            icon: 'alert-triangle'
          })) || [],
          technicalData: {
            domainAge: {
              ageInDays: apiResult.domainAge?.ageInDays || 0,
              registrationDate: apiResult.domainAge?.registrationDate ? new Date(apiResult.domainAge.registrationDate) : new Date(),
              registrar: apiResult.domainAge?.registrar || 'Unknown'
            },
            ssl: {
              isValid: !apiResult.sslCertificate?.error,
              issuer: apiResult.sslCertificate?.certificateAuthority || 'Unknown',
              validFrom: new Date(),
              validTo: new Date(),
              algorithm: 'RSA',
              keySize: 2048
            },
            reputation: {
              sources: [],
              overallRating: apiResult.reputation?.isClean ? 'safe' : 'suspicious',
              lastChecked: new Date()
            },
            ai: {
              contentScore: Math.round(apiResult.riskScore * 100),
              patterns: [],
              confidence: 0.85,
              flags: [],
              summary: apiResult.explanation || 'Analysis completed'
            },
            raw: apiResult
          },
          timestamp: new Date(apiResult.timestamp)
        }
        setResult(transformedResult)
        showToast('Analysis completed successfully!', 'success')
      } else {
        throw new Error(data.error || 'Analysis failed')
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('An unexpected error occurred')
      setError(errorObj)
      showToast(`Analysis failed: ${errorObj.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    // Could store last URL and retry, but for simplicity just clear error
  }

  const handleAnalyzeNew = () => {
    setResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="flex items-center justify-center mb-6">
            <Shield className="h-16 w-16 text-primary mr-4" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Scam Checker
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Analyze URLs for potential scams and security risks using advanced AI and technical analysis.
            Keep yourself safe online with comprehensive threat detection.
          </p>
        </div>

        {/* URL Input Section */}
        <div className="max-w-2xl mx-auto mb-16">
          <ErrorBoundary>
            <UrlInputForm 
              onSubmit={handleAnalyze}
              disabled={isLoading}
            />
          </ErrorBoundary>
        </div>

        {/* Results Section */}
        <ErrorBoundary>
          <ResultsDisplay
            result={result}
            isLoading={isLoading}
            error={error || undefined}
            onRetry={handleRetry}
            onAnalyzeNew={handleAnalyzeNew}
            className="max-w-6xl mx-auto mb-16"
          />
        </ErrorBoundary>

        {/* Features Section - Only show when no analysis */}
        {!result && !error && !isLoading && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Scam Checker?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Search className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">AI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Advanced AI-powered content analysis to detect scam patterns and suspicious behavior.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Technical Checks</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Comprehensive technical analysis including SSL, domain age, and reputation scoring.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Clear risk scores and detailed explanations to help you make informed decisions.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}