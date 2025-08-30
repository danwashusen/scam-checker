import { UrlInputForm } from '@/components/analysis/url-input-form'
import { RiskDisplay } from '@/components/analysis/risk-display'
import { TechnicalDetails } from '@/components/analysis/technical-details'
import { ExplanationPanel } from '@/components/analysis/explanation-panel'
import { ErrorBoundary } from '@/components/ui/error-boundary'

export default function HomePage() {
  return (
        <div className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-6">
              Scam Checker
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Analyze URLs for potential scams and security risks using advanced AI and technical analysis.
              Keep yourself safe online with comprehensive threat detection.
            </p>
          </div>

          {/* URL Input Section */}
          <div className="max-w-2xl mx-auto mb-16">
            <ErrorBoundary>
              <UrlInputForm />
            </ErrorBoundary>
          </div>

          {/* Demo Analysis Results */}
          <div className="max-w-6xl mx-auto mb-16">
            <h2 className="text-2xl font-bold text-center mb-8">Analysis Results Preview</h2>
            <p className="text-center text-muted-foreground mb-8">
              Below is a demonstration of how analysis results will be displayed (using sample data)
            </p>
            
            <ErrorBoundary>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Risk Display */}
                <RiskDisplay
                  riskScore={85}
                  riskLevel="high"
                  factors={[
                    {
                      type: "Domain Age",
                      score: 95,
                      description: "Domain registered very recently"
                    },
                    {
                      type: "SSL Certificate", 
                      score: 60,
                      description: "Self-signed certificate detected"
                    },
                    {
                      type: "Content Analysis",
                      score: 90,
                      description: "Suspicious content patterns found"
                    }
                  ]}
                />

                {/* Technical Details */}
                <TechnicalDetails />
              </div>

              {/* AI Explanation */}
              <div className="mt-6">
                <ExplanationPanel />
              </div>
            </ErrorBoundary>
          </div>

          {/* Features Section */}
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Scam Checker?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 bg-primary/60 rounded"></div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  AI Analysis
                </h3>
                <p className="text-muted-foreground">
                  Advanced AI-powered content analysis to detect scam patterns and suspicious behavior.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 bg-primary/60 rounded"></div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Technical Checks
                </h3>
                <p className="text-muted-foreground">
                  Comprehensive technical analysis including SSL, domain age, and reputation scoring.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 bg-primary/60 rounded"></div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Risk Assessment
                </h3>
                <p className="text-muted-foreground">
                  Clear risk scores and detailed explanations to help you make informed decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
  )
}