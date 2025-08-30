import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Code, ExternalLink, Globe, Shield, Zap } from 'lucide-react'

export default function APIDocsPage() {
  return (
        <div className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-lg mb-6">
              <Code className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-6">
              API Documentation
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Integrate powerful URL analysis capabilities into your applications with our comprehensive REST API.
            </p>
            <Badge variant="outline" className="mb-8">
              Coming Soon - Implementation in Progress
            </Badge>
          </div>

          {/* Quick Start */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Start
                </CardTitle>
                <CardDescription>
                  Get started with the Scam Checker API in minutes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Base URL</h3>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    https://api.scamchecker.com/v1
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3">Example Request</h3>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div className="text-green-600 mb-2">POST /analyze</div>
                    <div className="text-blue-600 mb-2">Content-Type: application/json</div>
                    <div className="text-blue-600 mb-4">Authorization: Bearer YOUR_API_KEY</div>
                    <div>{'{'}</div>
                    <div className="ml-4">&quot;url&quot;: &quot;https://example.com&quot;</div>
                    <div>{'}'}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Example Response</h3>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div>{'{'}</div>
                    <div className="ml-4">&quot;success&quot;: true,</div>
                    <div className="ml-4">&quot;data&quot;: {'{'}</div>
                    <div className="ml-8">&quot;risk_score&quot;: 85,</div>
                    <div className="ml-8">&quot;risk_level&quot;: &quot;high&quot;,</div>
                    <div className="ml-8">&quot;analysis&quot;: {'{'}</div>
                    <div className="ml-12">&quot;domain_age&quot;: {'{'}<span className="text-muted-foreground">...</span>{'},'},</div>
                    <div className="ml-12">&quot;ssl_certificate&quot;: {'{'}<span className="text-muted-foreground">...</span>{'},'},</div>
                    <div className="ml-12">&quot;reputation&quot;: {'{'}<span className="text-muted-foreground">...</span>{'},'},</div>
                    <div className="ml-12">&quot;ai_analysis&quot;: {'{'}<span className="text-muted-foreground">...</span>{'}'}</div>
                    <div className="ml-8">{'}'}</div>
                    <div className="ml-4">{'}'}</div>
                    <div>{'}'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <div className="max-w-6xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">API Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Shield className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Comprehensive Analysis</CardTitle>
                  <CardDescription>
                    Multi-layer analysis including domain reputation, SSL certificates, and AI-powered content analysis.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Globe className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Real-time Processing</CardTitle>
                  <CardDescription>
                    Fast analysis with results delivered in seconds, powered by optimized infrastructure.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <ExternalLink className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>RESTful Design</CardTitle>
                  <CardDescription>
                    Simple, intuitive API design following REST principles with comprehensive documentation.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Coming Soon */}
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardHeader>
                <CardTitle>Full Documentation Coming Soon</CardTitle>
                <CardDescription>
                  We&apos;re working hard to complete the API documentation. Check back soon for:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                  <li>• Complete endpoint reference</li>
                  <li>• Authentication guide</li>
                  <li>• Rate limiting information</li>
                  <li>• SDKs and code examples</li>
                  <li>• Error handling guide</li>
                  <li>• Webhook documentation</li>
                </ul>
                <Button disabled>
                  Request Early Access
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
  )
}