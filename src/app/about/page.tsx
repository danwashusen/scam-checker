import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Target, Zap, Brain, Lock, Users, Award, TrendingUp } from 'lucide-react'

export default function AboutPage() {
  return (
        <div className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-lg mb-6">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-6">
              About Scam Checker
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              We&apos;re on a mission to make the internet safer by providing advanced, AI-powered URL analysis 
              that helps users identify and avoid scams, phishing attempts, and malicious websites.
            </p>
            <Badge variant="outline">
              Protecting users since 2024
            </Badge>
          </div>

          {/* Mission Statement */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card>
              <CardHeader className="text-center">
                <Target className="h-8 w-8 text-primary mx-auto mb-4" />
                <CardTitle className="text-2xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground leading-relaxed text-center">
                  To democratize cybersecurity by making advanced threat detection accessible to everyone. 
                  We believe that staying safe online shouldn&apos;t require technical expertise—just the right tools.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* How It Works */}
          <div className="max-w-6xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">How Scam Checker Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">AI Analysis</CardTitle>
                  <CardDescription>
                    Advanced AI models analyze website content, structure, and behavior patterns to identify potential threats.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Lock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Technical Validation</CardTitle>
                  <CardDescription>
                    We verify SSL certificates, check domain age, and analyze technical indicators of website legitimacy.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Reputation Analysis</CardTitle>
                  <CardDescription>
                    Cross-reference with multiple threat intelligence databases and reputation services.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Risk Scoring</CardTitle>
                  <CardDescription>
                    Combine all analysis results into a clear, actionable risk score with detailed explanations.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Key Features */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Scam Checker?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Lightning Fast</h3>
                    <p className="text-muted-foreground">Get results in seconds, not minutes. Our optimized infrastructure delivers rapid analysis.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">AI-Powered Intelligence</h3>
                    <p className="text-muted-foreground">Advanced machine learning models trained on millions of websites and threat patterns.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Comprehensive Analysis</h3>
                    <p className="text-muted-foreground">Multi-layered approach combining technical, reputation, and behavioral analysis.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Privacy First</h3>
                    <p className="text-muted-foreground">We don&apos;t store your URLs or personal data. Analysis happens in real-time and results aren&apos;t retained.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Award className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Enterprise Ready</h3>
                    <p className="text-muted-foreground">Scalable API with high availability, comprehensive documentation, and enterprise support.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Always Improving</h3>
                    <p className="text-muted-foreground">Continuous learning from new threats and user feedback to stay ahead of evolving scams.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">Making the Internet Safer</CardTitle>
                <CardDescription>
                  Join thousands of users who trust Scam Checker to keep them safe online
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                  <div>
                    <div className="text-3xl font-bold text-primary mb-2">1M+</div>
                    <div className="text-muted-foreground">URLs Analyzed</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
                    <div className="text-muted-foreground">Accuracy Rate</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                    <div className="text-muted-foreground">Protection</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
  )
}